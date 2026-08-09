import type {
  HomeAssistant,
  HassEntity,
  LovelaceCard,
  LovelaceCardConfig,
  MusicAssistantCardConfig,
} from './home-assistant';
import { browseMedia } from './music-assistant/media-browser';
import { searchMusicAssistant } from './music-assistant/search';
import { getLibrary, type LibraryMediaType } from './music-assistant/library';
import { getQueue } from './music-assistant/queue';
import { type MediaItem } from './music-assistant/media-browser';
import type { QueueDetails } from './music-assistant/queue';
import { html, nothing, render as renderTemplate } from 'lit-html';
import { cardStyles } from './card/card.styles';
import { getGroupMembers } from './card/dom';
import { CardStore, createInitialState } from './card/card-store';
import { RequestGuard } from './card/request-guard';
import { callService, runAction, type ActionContext } from './card/actions';
import { createClickHandler } from './card/events';
import { renderTopMenu } from './card/views/topmenu.view';
import { renderNowPlaying } from './card/views/now-playing.view';
import { renderLibraryNavigation, renderLibraryResults, renderSearchInput, renderSearchResults } from './card/views/search.view';
import { renderMediaList, renderPath } from './card/views/media-list.view';
import { renderActiveFlyout } from './card/views/flyout.view';
import './editor';

const CARD_TAG = 'music-assistant-card';

export class MusicAssistantCard extends HTMLElement implements LovelaceCard {
  static getConfigElement(): HTMLElement {
    return document.createElement('music-assistant-card-editor');
  }

  static getStubConfig(): MusicAssistantCardConfig {
    return {
      type: 'custom:music-assistant-card',
      player: '',
      layout: 'two-column',
      music_assistant_config_entry_id: '',
      show_search: true,
      show_queue: true,
      click_action: 'play',
    };
  }

  private config?: MusicAssistantCardConfig;
  private _hass?: HomeAssistant;
  private readonly root: ShadowRoot;
  private readonly container: HTMLElement;
  private readonly store = new CardStore(() => this.render());
  private queueRequested = false;
  private queueCache?: { mediaContentId?: string; details: QueueDetails };
  private searchTimer?: ReturnType<typeof setTimeout>;
  private readonly mediaRequests = new RequestGuard();
  private readonly queueRequests = new RequestGuard();
  private readonly searchRequests = new RequestGuard();
  private readonly libraryRequests = new RequestGuard();
  private progressTimer?: ReturnType<typeof setInterval>;
  private progressStartedAt = 0;
  private progressStartPosition = 0;
  private needsReconnectLoad = false;
  private eventsBound = false;
  private lastHass?: HomeAssistant;
  private sessionIdentity?: { callWS?: HomeAssistant['callWS']; callService: HomeAssistant['callService'] };
  private readonly actionContext: ActionContext = {
    getHass: () => this._hass,
    getConfig: () => this.config,
    getState: () => this.store.getState(),
    setState: (patch) => this.store.setState(patch),
    isQueueRequested: () => this.queueRequested,
    setQueueRequested: (value) => {
      this.queueRequested = value;
    },
    loadQueue: () => this.loadQueue(),
    loadMedia: (mediaContentId, path) => this.loadMedia(mediaContentId, path),
    loadSpeakers: () => this.loadSpeakers(),
    loadLibrary: (append) => this.loadLibrary(undefined, undefined, append),
    getCurrentSpeakerSelection: () => this.getCurrentSpeakerSelection(),
  };

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = cardStyles;
    this.root.appendChild(style);
    this.container = document.createElement('div');
    this.root.appendChild(this.container);
    this.bindEvents();
  }

  setConfig(config: LovelaceCardConfig): void {
    if (!config || typeof config !== 'object') throw new Error('Music Assistant Card: configuration is required.');
    if (typeof config.player !== 'string' || !config.player.trim())
      throw new Error('Music Assistant Card: a player entity is required.');
    if (
      config.players !== undefined &&
      (!Array.isArray(config.players) || config.players.some((player) => typeof player !== 'string'))
    )
      throw new Error('Music Assistant Card: players must be a list of entity IDs.');
    if (config.click_action && !['play', 'queue'].includes(String(config.click_action)))
      throw new Error('Music Assistant Card: click_action must be "play" or "queue".');

    const previousConfig = this.config;
    const providedConfig = Object.fromEntries(
      Object.entries(config).filter(([key]) => key !== 'type' && !key.startsWith('music_assistant_')),
    );
    this.config = {
      type: CARD_TAG,
      layout: 'two-column',
      music_assistant_config_entry_id:
        typeof config.music_assistant_config_entry_id === 'string' ? config.music_assistant_config_entry_id.trim() : '',
      show_search: true,
      show_queue: true,
      click_action: 'play',
      ...providedConfig,
      player: config.player.trim(),
      players: Array.isArray(config.players)
        ? config.players.filter((player): player is string => typeof player === 'string' && player.trim().length > 0)
        : [],
    };
    if (!this.config.music_assistant_config_entry_id)
      this.store.setState({ libraryState: { ...this.store.getState().libraryState, selectedCategory: null } });
    if (
      previousConfig &&
      (previousConfig.player !== this.config.player ||
        JSON.stringify(previousConfig.players) !== JSON.stringify(this.config.players) ||
        previousConfig.music_assistant_config_entry_id !== this.config.music_assistant_config_entry_id)
    ) {
      this.queueRequested = false;
      this.queueCache = undefined;
      this.mediaRequests.invalidate();
      this.queueRequests.invalidate();
      this.searchRequests.invalidate();
      this.libraryRequests.invalidate();
      this.store.setState(createInitialState());
    } else {
      this.render();
    }
  }

  disconnectedCallback(): void {
    this.needsReconnectLoad = true;
    this.queueRequested = false;
    this.queueCache = undefined;
    this.clearSearchTimer();
    this.clearProgressTimer();
    this.invalidateRequests();
  }

  connectedCallback(): void {
    if (!this.needsReconnectLoad || !this._hass) return;
    this.needsReconnectLoad = false;
    this.hass = this._hass;
  }

  set hass(hass: HomeAssistant) {
    const sessionChanged =
      this.sessionIdentity !== undefined &&
      (this.sessionIdentity.callWS !== hass.callWS || this.sessionIdentity.callService !== hass.callService);
    this.sessionIdentity = { callWS: hass.callWS, callService: hass.callService };
    const previousHass = this.lastHass;
    const previousMediaContentId = this.getMediaContentId(previousHass?.states[this.config?.player ?? '']);
    const nextMediaContentId = this.getMediaContentId(hass.states[this.config?.player ?? '']);
    const mediaContentChanged = previousHass !== undefined && previousMediaContentId !== nextMediaContentId;
    this.lastHass = hass;
    this._hass = hass;
    if (sessionChanged) this.invalidateRequests();
    if (this.hasRelevantHassChange(previousHass, hass)) this.render();
    this.syncProgressTimer();
    if (this.config?.show_queue && (!this.queueRequested || mediaContentChanged)) {
      this.queueRequested = true;
      void this.loadQueue();
    }
    const libraryState = this.store.getState().libraryState;
    if (
      this.config?.music_assistant_config_entry_id &&
      this.store.getState().uiState.primaryView === 'search' &&
      !libraryState.loading &&
      !libraryState.loadingMore &&
      libraryState.items.length === 0
    ) {
      void this.loadLibrary();
    }
  }

  private getMediaContentId(player?: { attributes: Record<string, unknown> }): string | undefined {
    const mediaContentId = player?.attributes.media_content_id;
    return typeof mediaContentId === 'string' ? mediaContentId : undefined;
  }

  /**
   * Home Assistant assigns `hass` on every global state change. Only re-render when an entity the
   * card actually reads changed reference (HA swaps the state object on change, reuses it otherwise).
   */
  private hasRelevantHassChange(previous: HomeAssistant | undefined, next: HomeAssistant): boolean {
    if (!previous || !this.config) return true;
    const relevantIds = new Set<string>([this.config.player, ...(this.config.players ?? [])]);
    const nextPlayer = next.states[this.config.player];
    if (nextPlayer) for (const member of getGroupMembers(nextPlayer)) relevantIds.add(member);
    const previousPlayer = previous.states[this.config.player];
    if (previousPlayer) for (const member of getGroupMembers(previousPlayer)) relevantIds.add(member);
    for (const id of relevantIds) {
      if (previous.states[id] !== next.states[id]) return true;
    }
    return false;
  }

  getCardSize(): number {
    return 6;
  }

  private computeLivePosition(player?: { state: string; attributes: Record<string, unknown> }): number | undefined {
    if (!player || player.state !== 'playing') return undefined;
    const attributes = player.attributes;
    const duration = Number(attributes.media_duration ?? 0);
    const basePosition = Number(attributes.media_position ?? this.progressStartPosition);
    const updatedAt = Date.parse(String(attributes.media_position_updated_at ?? ''));
    const elapsed = Number.isFinite(updatedAt)
      ? (Date.now() - updatedAt) / 1000
      : (Date.now() - this.progressStartedAt) / 1000;
    return Math.max(0, Math.min(basePosition + Math.max(0, elapsed), duration || Number.POSITIVE_INFINITY));
  }

  private syncProgressTimer(): void {
    const player = this.config ? this._hass?.states[this.config.player] : undefined;
    if (this.store.getState().uiState.primaryView !== 'now-playing' || player?.state !== 'playing') {
      this.clearProgressTimer();
      return;
    }
    if (this.progressTimer) return;
    this.progressStartedAt = Date.now();
    this.progressStartPosition = Number(player.attributes.media_position ?? 0);
    this.progressTimer = setInterval(() => this.updateProgress(), 1000);
  }

  private clearProgressTimer(): void {
    if (this.progressTimer) clearInterval(this.progressTimer);
    this.progressTimer = undefined;
  }

  private updateProgress(): void {
    if (!this.config || this.store.getState().uiState.primaryView !== 'now-playing') return;
    const player = this._hass?.states[this.config.player];
    if (!player || player.state !== 'playing') {
      this.syncProgressTimer();
      return;
    }
    // Lit's diffing only patches the timeline's bound values (position/labels), so re-rendering
    // every second is cheap and does not reload the artwork <img> or rebuild unrelated markup.
    this.render();
  }

  private async loadMedia(mediaContentId: string, path: MediaItem[]): Promise<void> {
    if (!this._hass || !this.config) return;
    const request = this.mediaRequests.begin();
    this.store.setState({ browseState: { loading: true, path } });
    try {
      const response = await browseMedia(this._hass, mediaContentId);
      if (!request.isCurrent()) return;
      this.store.setState({ browseState: { loading: false, response, path } });
    } catch (error) {
      if (!request.isCurrent()) return;
      this.store.setState({
        browseState: {
          loading: false,
          path,
          error: error instanceof Error ? error.message : 'Unable to load media.',
        },
      });
    }
  }

  private async loadQueue(): Promise<void> {
    if (!this._hass || !this.config) return;
    const request = this.queueRequests.begin();
    const mediaContentId = this.getMediaContentId(this._hass.states[this.config.player]);
    const currentQueue = this.store.getState().queueState;
    this.store.setState({ queueState: { ...currentQueue, loading: true, error: undefined } });
    try {
      const details = await getQueue(this._hass, this.config.player);
      if (!request.isCurrent() || this.getMediaContentId(this._hass.states[this.config.player]) !== mediaContentId) return;
      const currentIndex = details.items?.findIndex((item) => item.uri === mediaContentId);
      const normalizedDetails =
        currentIndex !== undefined && currentIndex >= 0 ? { ...details, current_index: currentIndex } : details;
      this.queueCache = { mediaContentId, details: normalizedDetails };
      this.store.setState({ queueState: { loading: false, details: normalizedDetails } });
    } catch (error) {
      if (!request.isCurrent() || this.getMediaContentId(this._hass.states[this.config.player]) !== mediaContentId) return;
      this.store.setState({
        queueState: {
          ...this.store.getState().queueState,
          loading: false,
          error: error instanceof Error ? error.message : 'Unable to load queue.',
        },
      });
    }
  }

  private render(): void {
    if (!this.config) return;
    this.syncProgressTimer();
    const { browseState, searchState, libraryState, queueState, speakerState, uiState, operationError } =
      this.store.getState();
    const mediaItems = browseState.response?.children ?? [];
    const player = this._hass?.states[this.config.player];
    const renderedQueueState = this.queueCache ? { ...queueState, details: this.queueCache.details } : queueState;

    const primary =
      uiState.primaryView === 'search'
        ? html`<section class="search-screen primary-view" data-primary-view="search">
            ${this.config.show_search ? renderSearchInput(libraryState.query || searchState.query) : nothing}
            <div class="search-layout">
              ${renderLibraryNavigation(libraryState.selectedCategory)}
              <section class="search-results" aria-label="Media results">
                ${libraryState.selectedCategory
                  ? renderLibraryResults(libraryState)
                  : searchState.query
                    ? renderSearchResults(searchState)
                    : html`${renderPath(browseState.path)}${renderMediaList(browseState, mediaItems)}`}
              </section>
            </div>
          </section>`
        : html`<section class="now-playing-screen primary-view" data-primary-view="now-playing">
            ${renderNowPlaying(player, this.computeLivePosition(player))}
          </section>`;

    renderTemplate(
      html`<section class="card" aria-label="Music Assistant">
        ${renderTopMenu(this.getSpeakerLabel(), uiState.primaryView)} ${primary}
        ${renderActiveFlyout({
          activeFlyout: uiState.activeFlyout,
          clearQueueConfirmOpen: uiState.clearQueueConfirmOpen,
          queueState: renderedQueueState,
          speakerState,
          currentPlayerId: this.config.player,
          volumePercent: Number(this._hass?.states[this.config.player]?.attributes.volume_level ?? 0) * 100,
        })}
        ${operationError ? html`<p class="state error" role="alert">${operationError}</p>` : nothing}
      </section>`,
      this.container,
    );
  }

  private getSpeakerLabel(): string {
    const currentPlayer = this._hass?.states[this.config?.player ?? ''];
    const groupedPlayerIds = currentPlayer ? [currentPlayer.entity_id, ...getGroupMembers(currentPlayer)] : [];
    const groupedNames = groupedPlayerIds
      .map((playerId) => this._hass?.states[playerId]?.attributes.friendly_name)
      .filter((name): name is string => typeof name === 'string' && name.trim().length > 0);
    if (groupedNames.length > 0) return groupedNames.join(' + ');
    const configuredName = this.config ? this._hass?.states[this.config.player]?.attributes.friendly_name : undefined;
    if (typeof configuredName === 'string' && configuredName.trim()) return configuredName.trim();
    return this.config?.player ?? 'Speaker';
  }

  private async runSearch(query: string): Promise<void> {
    if (!this._hass || !query.trim()) {
      this.store.setState({ searchState: { query: query.trim(), loading: false } });
      return;
    }
    const normalizedQuery = query.trim();
    const request = this.searchRequests.begin();
    this.store.setState({ searchState: { query: normalizedQuery, loading: true } });
    try {
      const response = await searchMusicAssistant(this._hass, normalizedQuery);
      if (!request.isCurrent() || this.store.getState().searchState.query !== normalizedQuery) return;
      this.store.setState({ searchState: { query: normalizedQuery, loading: false, response } });
    } catch (error) {
      if (!request.isCurrent() || this.store.getState().searchState.query !== normalizedQuery) return;
      this.store.setState({
        searchState: {
          query: normalizedQuery,
          loading: false,
          error: error instanceof Error ? error.message : 'Search failed.',
        },
      });
    }
  }

  private async loadLibrary(
    selectedCategory = this.store.getState().libraryState.selectedCategory,
    query = this.store.getState().libraryState.query,
    append = false,
  ): Promise<void> {
    if (!selectedCategory) return;
    if (!this._hass || !this.config?.music_assistant_config_entry_id) {
      this.store.setState({
        libraryState: {
          ...this.store.getState().libraryState,
          loading: false,
          loadingMore: false,
          error: 'Add the Music Assistant config entry ID to load library categories.',
        },
      });
      return;
    }
    if (selectedCategory === 'favorites') {
      await this.loadFavorites(query, append);
      return;
    }
    await this.loadLibraryPage(selectedCategory, query, append, false);
  }

  private async loadFavorites(query: string, append: boolean): Promise<void> {
    const current = this.store.getState().libraryState;
    const selectedCategory = current.selectedCategory;
    if (selectedCategory !== 'favorites' || !this._hass || !this.config?.music_assistant_config_entry_id) return;
    const request = this.libraryRequests.begin();
    const offset = append ? current.offset + current.items.length : 0;
    this.store.setState({
      libraryState: {
        ...current,
        loading: !append,
        loadingMore: append,
        error: undefined,
        items: append ? current.items : [],
        offset,
      },
    });
    try {
      const mediaTypes: LibraryMediaType[] = ['artist', 'album', 'track', 'playlist', 'podcast', 'radio'];
      const responses = await Promise.all(
        mediaTypes.map((mediaType) =>
          getLibrary(this._hass!, {
            configEntryId: this.config!.music_assistant_config_entry_id!,
            mediaType,
            favorite: true,
            search: query.trim() || undefined,
            limit: current.limit,
            offset,
            orderBy: 'name',
          }),
        ),
      );
      if (!request.isCurrent() || this.store.getState().libraryState.selectedCategory !== 'favorites') return;
      const loadedItems = responses
        .flatMap((response) => response.items)
        .filter((item, index, all) => all.findIndex((candidate) => candidate.uri === item.uri) === index);
      const items = append
        ? [...current.items, ...loadedItems.filter((item) => !current.items.some((existing) => existing.uri === item.uri))]
        : loadedItems;
      this.store.setState({
        libraryState: {
          ...this.store.getState().libraryState,
          loading: false,
          loadingMore: false,
          items,
          offset,
          hasMore: responses.some((response) => response.items.length === current.limit),
        },
      });
    } catch (error) {
      if (!request.isCurrent()) return;
      this.store.setState({
        libraryState: {
          ...this.store.getState().libraryState,
          loading: false,
          loadingMore: false,
          error: error instanceof Error ? error.message : 'Unable to load favorites.',
        },
      });
    }
  }

  private async loadLibraryPage(
    mediaType: LibraryMediaType,
    query: string,
    append: boolean,
    favorite: boolean,
  ): Promise<void> {
    const current = this.store.getState().libraryState;
    const selectedCategory = current.selectedCategory;
    if (!selectedCategory || !this._hass || !this.config?.music_assistant_config_entry_id) return;
    const offset = append ? current.offset + current.items.length : 0;
    const request = this.libraryRequests.begin();
    this.store.setState({
      libraryState: {
        ...current,
        loading: !append,
        loadingMore: append,
        error: undefined,
        items: append ? current.items : [],
        offset,
      },
    });
    try {
      const response = await getLibrary(this._hass, {
        configEntryId: this.config.music_assistant_config_entry_id,
        mediaType,
        favorite,
        search: query.trim() || undefined,
        limit: current.limit,
        offset,
        orderBy: 'name',
      });
      const latest = this.store.getState().libraryState;
      if (!request.isCurrent() || latest.selectedCategory !== selectedCategory || latest.query !== query) return;
      const items = append
        ? [...latest.items, ...response.items.filter((item) => !latest.items.some((existing) => existing.uri === item.uri))]
        : response.items;
      this.store.setState({
        libraryState: {
          ...latest,
          loading: false,
          loadingMore: false,
          items,
          offset,
          hasMore: response.items.length === latest.limit,
        },
      });
    } catch (error) {
      if (!request.isCurrent()) return;
      this.store.setState({
        libraryState: {
          ...this.store.getState().libraryState,
          loading: false,
          loadingMore: false,
          error: error instanceof Error ? error.message : 'Unable to load library.',
        },
      });
    }
  }

  private bindEvents(): void {
    if (this.eventsBound) return;
    this.eventsBound = true;
    this.root.addEventListener('click', createClickHandler(this.actionContext));
    this.root.addEventListener('input', (event) => {
      const target = event.target as HTMLInputElement;
      if (!target.matches('[data-search]')) return;
      this.clearSearchTimer();
      this.searchTimer = setTimeout(() => {
        const libraryState = this.store.getState().libraryState;
        if (libraryState.selectedCategory) {
          this.store.setState({ libraryState: { ...libraryState, query: target.value.trim() } });
          void this.loadLibrary(libraryState.selectedCategory, target.value.trim());
        } else void this.runSearch(target.value);
      }, 350);
    });
    this.root.addEventListener('change', (event) => {
      const target = event.target as HTMLInputElement;
      if (target.matches('[data-seek]'))
        void runAction(this.actionContext, async () => {
          await callService(this.actionContext, 'media_player', 'media_seek', { seek_position: Number(target.value) });
        });
    });
    this.root.addEventListener('value-changed', (event) => {
      const target = event.target as HTMLElement & { value?: number };
      if (!target.matches('[data-volume]')) return;
      const value =
        typeof target.value === 'number'
          ? target.value
          : Number((event as CustomEvent<{ value?: number }>).detail?.value);
      if (!Number.isFinite(value)) return;
      void runAction(this.actionContext, async () => {
        await callService(this.actionContext, 'media_player', 'volume_set', { volume_level: value / 100 });
      });
    });
  }

  private async loadSpeakers(): Promise<void> {
    this.store.setState({ speakerState: { loading: true } });
    try {
      const players = Object.values(this._hass?.states ?? {}).filter(
        (entity) => entity.entity_id.startsWith('media_player.') && this.isVisiblePlayer(entity),
      );
      const selectedPlayerIds = this.getCurrentSpeakerSelection();
      this.store.setState({ speakerState: { loading: false, players, selectedPlayerIds } });
    } catch (error) {
      this.store.setState({
        speakerState: { loading: false, error: error instanceof Error ? error.message : 'Unable to load speakers.' },
      });
    }
  }

  private getCurrentSpeakerSelection(): string[] {
    const current = this._hass?.states[this.config?.player ?? ''];
    return current ? [current.entity_id, ...getGroupMembers(current)] : [];
  }

  private isVisiblePlayer(player: HassEntity): boolean {
    if (!this.config?.players?.length) return true;
    return player.entity_id === this.config.player || (this.config.players ?? []).includes(player.entity_id);
  }

  private clearSearchTimer(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = undefined;
  }

  private invalidateRequests(): void {
    this.mediaRequests.invalidate();
    this.queueRequests.invalidate();
    this.searchRequests.invalidate();
    this.libraryRequests.invalidate();
  }
}

if (!customElements.get(CARD_TAG)) customElements.define(CARD_TAG, MusicAssistantCard);
window.customCards = window.customCards ?? [];
if (!window.customCards.some((card) => card.type === CARD_TAG))
  window.customCards.push({
    type: CARD_TAG,
    name: 'Echo Show Music Assistant Card',
    description: 'Browse and control Music Assistant from Home Assistant.',
    preview: true,
  });

declare global {
  interface Window {
    customCards?: Array<{ type: string; name: string; description: string; preview?: boolean }>;
  }
}
