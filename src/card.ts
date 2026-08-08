import type {
  HomeAssistant,
  LovelaceCard,
  LovelaceCardConfig,
  MusicAssistantCardConfig,
} from './home-assistant';
import { browseMedia, type MediaBrowseResponse, type MediaItem } from './music-assistant/media-browser';
import { flattenSearchResults, searchMusicAssistant, type SearchItem, type SearchResponse } from './music-assistant/search';
import { getQueue, type QueueDetails, type QueueItem } from './music-assistant/queue';
import './editor';

const CARD_TAG = 'music-assistant-card';
const ROOT_MEDIA_ID = 'media-source://';

const cardStyles = `
  :host { --music-bg: var(--card-background-color, #101416); --music-surface: #171d20; --music-raised: #20282b; --music-line: #2d383b; --music-text: var(--primary-text-color, #f2f6f5); --music-muted: var(--secondary-text-color, #9ba9aa); --music-accent: var(--primary-color, #65d6c7); display: block; color: var(--music-text); font-family: var(--paper-font-body1_-_font-family, 'Segoe UI', sans-serif); }
  .card { min-height: 240px; box-sizing: border-box; padding: 14px; border: 1px solid var(--music-line); border-radius: 12px; background: var(--music-bg); box-shadow: 0 12px 28px rgb(0 0 0 / 24%); }
  h1, h2, p { margin: 0; }
  .columns { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: 20px; }
  .panel { min-height: 0; padding: 4px 0; }
  .panel-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
  .panel-title { color: var(--music-text); font-size: 15px; letter-spacing: .01em; }
  .path { color: var(--music-muted); font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .media-list { display: grid; gap: 3px; }
  .media-row, .back-button { width: 100%; min-height: 50px; box-sizing: border-box; display: flex; align-items: center; gap: 11px; padding: 7px; border: 0; border-radius: 7px; background: transparent; color: inherit; text-align: left; font: inherit; cursor: pointer; transition: background-color 140ms ease, transform 140ms ease; }
  .media-row:hover, .media-row:focus-visible, .back-button:hover, .back-button:focus-visible { background: var(--music-raised); outline: none; }
  .media-row:active, .back-button:active { transform: scale(.99); }
  .media-row:focus-visible, .back-button:focus-visible { box-shadow: 0 0 0 2px var(--music-accent) inset; }
  .thumb { width: 42px; height: 42px; flex: 0 0 42px; display: grid; place-items: center; overflow: hidden; border-radius: 6px; background: var(--music-raised); color: var(--music-muted); font-size: 18px; }
  .thumb img { width: 100%; height: 100%; object-fit: cover; }
  .media-copy { min-width: 0; display: grid; gap: 2px; }
  .media-title { overflow: hidden; color: var(--music-text); font-size: 14px; font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }
  .media-meta, .panel-copy { color: var(--music-muted); font-size: 12px; line-height: 1.4; }
  .media-meta { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .state { padding: 22px 8px; color: var(--music-muted); font-size: 13px; line-height: 1.45; text-align: center; }
  .error { color: var(--error-color, #ff8f8f); }
  .back-button { min-height: 34px; padding-block: 3px; color: var(--music-accent); font-size: 12px; }
  .back-button span:first-child { font-size: 20px; line-height: 1; }
  .search { display: flex; align-items: center; gap: 8px; margin: 10px 0 14px; padding: 0 9px; border: 1px solid var(--music-line); border-radius: 7px; background: var(--music-surface); }
  .search:focus-within { border-color: var(--music-accent); box-shadow: 0 0 0 1px var(--music-accent); }
  .search-icon { color: var(--music-muted); font-size: 17px; }
  .search input { width: 100%; min-height: 36px; border: 0; outline: 0; background: transparent; color: inherit; font: inherit; font-size: 13px; }
  .search input::placeholder { color: var(--music-muted); }
  .result-group { display: grid; gap: 4px; margin-bottom: 14px; }
  .result-heading { margin: 0 7px 2px; color: var(--music-muted); font-size: 11px; font-weight: 700; letter-spacing: .09em; text-transform: uppercase; }
  .playback { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(280px, 1fr); gap: 22px; margin-top: 12px; padding: 14px 16px 12px; border-top: 1px solid var(--music-line); background: var(--music-surface); }
  .now-playing { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .now-playing .thumb { width: 64px; height: 64px; flex-basis: 64px; border-radius: 7px; }
  .controls { display: flex; align-items: center; gap: 7px; margin-top: 11px; }
  .control, .queue-action { min-width: 38px; min-height: 36px; display: inline-flex; align-items: center; justify-content: center; gap: 5px; padding: 6px 9px; border: 1px solid var(--music-line); border-radius: 7px; background: transparent; color: var(--music-text); font: inherit; cursor: pointer; transition: background-color 140ms ease, border-color 140ms ease, transform 140ms ease; }
  .control:hover, .control:focus-visible, .queue-action:hover, .queue-action:focus-visible { background: var(--music-raised); border-color: var(--music-accent); outline: none; }
  .control:focus-visible, .queue-action:focus-visible { box-shadow: 0 0 0 1px var(--music-accent) inset; }
  .control.primary { background: var(--music-accent); border-color: var(--music-accent); color: #102022; }
  .timeline { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 8px; margin-top: 8px; color: var(--music-muted); font-size: 11px; }
  .progress { width: 100%; accent-color: var(--music-accent); }
  .volume-control { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 8px; color: var(--music-muted); font-size: 13px; }
  .volume-slider { width: 28px; height: 72px; writing-mode: vertical-lr; direction: rtl; }
  .queue { min-width: 0; }
  .queue-list { max-height: 112px; overflow-y: auto; }
  .queue-row { display: flex; align-items: center; gap: 8px; min-height: 34px; padding: 3px 0 3px 8px; border-bottom: 1px solid var(--music-line); }
  .queue-row.current { border-left: 2px solid var(--music-accent); background: rgb(101 214 199 / 8%); color: var(--music-accent); font-weight: 600; }
  .queue-row .media-copy { flex: 1; }
  .queue-action { min-width: 0; min-height: 30px; padding: 4px 8px; color: var(--music-muted); font-size: 12px; }
  .control:active, .queue-action:active { transform: scale(.96); }
  ha-icon { display: block; --mdc-icon-size: 20px; }
  .thumb ha-icon { --mdc-icon-size: 22px; }
  .back-button ha-icon { --mdc-icon-size: 18px; }
  @media (prefers-reduced-motion: reduce) { .media-row, .back-button, .control, .queue-action { transition: none; } }
  @media (prefers-reduced-motion: reduce) { .media-row, .back-button, .control, .queue-action { transition: none; } }
  @media (max-width: 680px) { .columns, .playback { grid-template-columns: 1fr; } .playback { gap: 12px; } }
`;

interface BrowseState {
  loading: boolean;
  error?: string;
  response?: MediaBrowseResponse;
  path: MediaItem[];
}

interface SearchState {
  query: string;
  loading: boolean;
  error?: string;
  response?: SearchResponse;
}

interface QueueState {
  loading: boolean;
  error?: string;
  details?: QueueDetails;
}

export class MusicAssistantCard extends HTMLElement implements LovelaceCard {
  static getConfigElement(): HTMLElement {
    return document.createElement('music-assistant-card-editor');
  }

  static getStubConfig(): MusicAssistantCardConfig {
    return {
      type: 'custom:music-assistant-card',
      player: 'media_player.living_room',
      config_entry_id: '',
      layout: 'two-column',
      show_search: true,
      show_queue: true,
      click_action: 'play',
    };
  }

  private config?: MusicAssistantCardConfig;
  private _hass?: HomeAssistant;
  private readonly root: ShadowRoot;
  private browseState: BrowseState = { loading: false, path: [] };
  private searchState: SearchState = { query: '', loading: false };
  private queueState: QueueState = { loading: false };
  private mediaRequested = false;
  private queueRequested = false;
  private searchTimer?: ReturnType<typeof setTimeout>;
  private mediaRequestId = 0;
  private queueRequestId = 0;
  private searchRequestId = 0;
  private lifecycleId = 0;
  private needsReconnectLoad = false;
  private operationError?: string;
  private eventsBound = false;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
    this.bindEvents();
  }

  setConfig(config: LovelaceCardConfig): void {
    if (!config || typeof config !== 'object') throw new Error('Music Assistant Card: configuration is required.');
    if (typeof config.player !== 'string' || !config.player.trim()) throw new Error('Music Assistant Card: a player entity is required.');
    if (config.config_entry_id !== undefined && (typeof config.config_entry_id !== 'string' || !config.config_entry_id.trim())) throw new Error('Music Assistant Card: config_entry_id must be a non-empty string when provided.');
    if (config.click_action && !['play', 'queue'].includes(String(config.click_action))) throw new Error('Music Assistant Card: click_action must be "play" or "queue".');

    const previousConfig = this.config;
    const { type: _type, ...providedConfig } = config;
    this.config = { type: CARD_TAG, layout: 'two-column', show_search: true, show_queue: true, click_action: 'play', ...providedConfig, player: config.player.trim(), config_entry_id: typeof config.config_entry_id === 'string' ? config.config_entry_id.trim() : '' };
    if (previousConfig && (previousConfig.player !== this.config.player || previousConfig.config_entry_id !== this.config.config_entry_id)) {
      this.mediaRequested = false;
      this.queueRequested = false;
      this.browseState = { loading: false, path: [] };
      this.queueState = { loading: false };
      this.searchState = { query: '', loading: false };
      this.invalidateRequests();
    }
    this.render();
  }

  disconnectedCallback(): void {
    this.needsReconnectLoad = true;
    this.mediaRequested = false;
    this.queueRequested = false;
    this.lifecycleId += 1;
    this.clearSearchTimer();
    this.invalidateRequests();
  }

  connectedCallback(): void {
    if (!this.needsReconnectLoad || !this._hass) return;
    this.needsReconnectLoad = false;
    this.hass = this._hass;
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    if (this.config?.config_entry_id && this.root.querySelector('.card')) this.updatePlayback();
    else this.render();
    if (this.config && !this.mediaRequested) {
      this.mediaRequested = true;
      void this.loadMedia(ROOT_MEDIA_ID, []);
    }
    if (this.config?.show_queue && !this.queueRequested) {
      this.queueRequested = true;
      void this.loadQueue();
    }
  }

  getCardSize(): number { return 6; }

  private updatePlayback(): void {
    if (!this.config) return;
    const playback = this.root.querySelector<HTMLElement>('.playback');
    const player = this._hass?.states[this.config.player];
    if (playback) playback.outerHTML = this.renderPlayback(player);
    else this.render();
  }

  private async loadMedia(mediaContentId: string, path: MediaItem[]): Promise<void> {
    if (!this._hass) return;
    const requestId = ++this.mediaRequestId;
    const lifecycleId = this.lifecycleId;
    this.browseState = { loading: true, path };
    this.render();
    try {
      const response = await browseMedia(this._hass, mediaContentId);
      if (requestId !== this.mediaRequestId || lifecycleId !== this.lifecycleId) return;
      this.browseState = { loading: false, response, path };
    } catch (error) {
      if (requestId !== this.mediaRequestId || lifecycleId !== this.lifecycleId) return;
      this.browseState = { loading: false, path, error: error instanceof Error ? error.message : 'Unable to load media.' };
    }
    this.render();
  }

  private async loadQueue(): Promise<void> {
    if (!this._hass || !this.config) return;
    const requestId = ++this.queueRequestId;
    const lifecycleId = this.lifecycleId;
    this.queueState = { loading: true };
    this.render();
    try {
      const details = await getQueue(this._hass, this.config.player);
      if (requestId !== this.queueRequestId || lifecycleId !== this.lifecycleId) return;
      this.queueState = { loading: false, details };
    } catch (error) {
      if (requestId !== this.queueRequestId || lifecycleId !== this.lifecycleId) return;
      this.queueState = { loading: false, error: error instanceof Error ? error.message : 'Unable to load queue.' };
    }
    this.render();
  }

  private render(): void {
    if (!this.config) return;
    if (!this.config.config_entry_id) {
      this.root.innerHTML = '<style>' + cardStyles + '</style><section class="card" aria-label="Music Assistant"><p class="state">Complete the Music Assistant config entry ID in the card editor.</p></section>';
      return;
    }
    const currentTitle = this.browseState.response?.title ?? 'Media sources';
    const mediaItems = this.browseState.response?.children ?? [];
    const player = this._hass?.states[this.config.player];
    const searchInput = this.root.querySelector<HTMLInputElement>('[data-search]');
    const preserveSearchFocus = this.root.activeElement === searchInput;
    const searchSelection = searchInput ? [searchInput.selectionStart, searchInput.selectionEnd] : [null, null];

    this.root.innerHTML = `
      <style>${cardStyles}</style>
      <section class="card" aria-label="Music Assistant">
        <div class="columns">
          <section class="panel" aria-labelledby="sources-title">
            <div class="panel-header"><h2 class="panel-title" id="sources-title">Sources</h2></div>
            ${this.config.show_search ? this.renderSearch() : ''}
            <p class="panel-copy">Browse providers, folders, playlists, albums, and artists.</p>
            ${this.renderPath()}
          </section>
          <section class="panel" aria-labelledby="library-title">
            <div class="panel-header"><h2 class="panel-title" id="library-title">${this.searchState.query ? 'Search results' : escapeHtml(currentTitle)}</h2><span class="path">${this.searchState.query ? `${this.searchResultCount()} results` : `${mediaItems.length} items`}</span></div>
            ${this.searchState.query ? this.renderSearchResults() : this.renderMediaList(mediaItems)}
          </section>
        </div>
        ${this.operationError ? `<p class="state error" role="alert">${escapeHtml(this.operationError)}</p>` : ''}
        ${this.renderPlayback(player)}
      </section>
    `;
    if (preserveSearchFocus) {
      const nextSearchInput = this.root.querySelector<HTMLInputElement>('[data-search]');
      nextSearchInput?.focus();
      nextSearchInput?.setSelectionRange(searchSelection[0], searchSelection[1]);
    }
  }

  private renderPlayback(player?: { state: string; attributes: Record<string, unknown> }): string {
    const attributes = player?.attributes ?? {};
    const title = player ? String(attributes.media_title ?? 'Nothing playing') : 'Player unavailable';
    const artist = player ? String(attributes.media_artist ?? attributes.media_album_name ?? 'Choose a song to start playback') : 'The configured entity is not available';
    const image = typeof attributes.entity_picture === 'string' ? attributes.entity_picture : undefined;
    const isPlaying = player?.state === 'playing';
    const position = Number(attributes.media_position ?? 0);
    const duration = Number(attributes.media_duration ?? 0);
    const volume = Math.round(Number(attributes.volume_level ?? 0) * 100);
    const shuffle = Boolean(attributes.shuffle);
    const repeat = String(attributes.repeat ?? 'off');
    return `<section class="playback" aria-label="Playback controls"><div><div class="now-playing"><span class="thumb">${image ? `<img src="${escapeHtml(image)}" alt="">` : '<ha-icon icon="mdi:music-note"></ha-icon>'}</span><span class="media-copy"><span class="media-title">${escapeHtml(title)}</span><span class="media-meta">${escapeHtml(artist)}</span></span></div><div class="controls"><button class="control primary" data-control="play-pause" type="button" aria-label="${isPlaying ? 'Pause' : 'Play'}"><ha-icon icon="mdi:${isPlaying ? 'pause' : 'play'}"></ha-icon></button><button class="control" data-control="next" type="button" aria-label="Next track"><ha-icon icon="mdi:skip-next"></ha-icon></button><button class="control" data-control="shuffle" type="button" aria-pressed="${shuffle}" aria-label="Toggle shuffle"><ha-icon icon="mdi:shuffle"></ha-icon></button><button class="control" data-control="repeat" type="button" aria-label="Change repeat mode"><ha-icon icon="mdi:repeat"></ha-icon><span>${escapeHtml(repeat)}</span></button></div><div class="timeline"><span>${formatDuration(position)}</span><input class="progress" data-seek type="range" min="0" max="${duration || 1}" value="${Math.min(position, duration || 1)}" aria-label="Playback position"><span>${formatDuration(duration)}</span></div><label class="volume-control"><input class="progress volume-slider" data-volume type="range" min="0" max="100" value="${volume}" aria-label="Volume"></label></div>${this.config?.show_queue ? this.renderQueue() : ''}</section>`;
  }

  private renderQueue(): string {
    if (this.queueState.loading) return '<div class="queue"><h2 class="panel-title">Queue</h2><p class="state">Loading queue...</p></div>';
    if (this.queueState.error) return `<div class="queue"><h2 class="panel-title">Queue</h2><p class="state error">${escapeHtml(this.queueState.error)}</p></div>`;
    const items = this.queueState.details?.items ?? [];
    if (items.length === 0) return '<div class="queue"><div class="panel-header"><h2 class="panel-title">Queue</h2><button class="queue-action" data-control="clear-queue" type="button" aria-label="Clear queue" title="Clear queue"><ha-icon icon="mdi:close"></ha-icon></button></div><p class="state">Queue is empty.</p></div>';
    const currentIndex = this.queueState.details?.current_index ?? -1;
    return `<div class="queue"><div class="panel-header"><h2 class="panel-title">Queue</h2><button class="queue-action" data-control="clear-queue" type="button" aria-label="Clear queue" title="Clear queue"><ha-icon icon="mdi:close"></ha-icon></button></div><div class="queue-list">${items.map((item, index) => this.renderQueueItem(item, index, index === currentIndex)).join('')}</div></div>`;
  }

  private renderQueueItem(item: QueueItem, index: number, current: boolean): string {
    const metadata = [item.artist, item.album].filter(Boolean).join(' · ');
    return `<div class="queue-row${current ? ' current' : ''}"><span class="media-copy"><span class="media-title">${escapeHtml(String(item.name ?? 'Untitled'))}</span><span class="media-meta">${escapeHtml(metadata || 'Queue item')}</span></span><button class="queue-action" data-queue-index="${index}" type="button">Play</button></div>`;
  }

  private renderPath(): string {
    if (this.browseState.path.length === 0) return '<p class="panel-copy">Choose a source to begin browsing.</p>';
    return `<div class="media-list">${this.browseState.path.map((item, index) => `<button class="back-button" data-path-index="${index}" type="button"><ha-icon icon="mdi:chevron-left" aria-hidden="true"></ha-icon><span>${escapeHtml(item.title)}</span></button>`).join('')}</div>`;
  }

  private renderSearch(): string {
    return '<label class="search"><ha-icon class="search-icon" icon="mdi:magnify" aria-hidden="true"></ha-icon><input data-search type="search" value="' + escapeHtml(this.searchState.query) + '" placeholder="Search all music" aria-label="Search all music"></label>';
  }

  private renderSearchResults(): string {
    if (this.searchState.loading) return '<p class="state" aria-live="polite">Searching Music Assistant...</p>';
    if (this.searchState.error) return `<p class="state error" role="alert">${escapeHtml(this.searchState.error)}</p>`;
    const results = flattenSearchResults(this.searchState.response ?? {});
    if (results.length === 0) return `<p class="state">No results for “${escapeHtml(this.searchState.query)}”.</p>`;
    const groups = [...new Set(results.map((item) => item.group))];
    return groups.map((group) => `<section class="result-group"><h3 class="result-heading">${escapeHtml(group)}</h3>${results.filter((item) => item.group === group).map((item) => this.renderSearchItem(item)).join('')}</section>`).join('');
  }

  private renderSearchItem(item: SearchItem & { group: string }): string {
    const metadata = [item.artist, item.album, item.provider].filter(Boolean).join(' · ') || item.group;
    const thumbnail = item.image ? `<img src="${escapeHtml(item.image)}" alt="" loading="lazy">` : '<ha-icon icon="mdi:music-note"></ha-icon>';
    return `<button class="media-row" data-search-uri="${escapeHtml(item.uri)}" data-search-type="${escapeHtml(item.media_type ?? item.group)}" type="button"><span class="thumb" aria-hidden="true">${thumbnail}</span><span class="media-copy"><span class="media-title">${escapeHtml(item.name)}</span><span class="media-meta">${escapeHtml(metadata)}</span></span></button>`;
  }

  private searchResultCount(): number {
    return flattenSearchResults(this.searchState.response ?? {}).length;
  }

  private async runSearch(query: string): Promise<void> {
    if (!this._hass || !query.trim()) {
      this.searchState = { query: query.trim(), loading: false };
      this.render();
      return;
    }
    const normalizedQuery = query.trim();
    const requestId = ++this.searchRequestId;
    const lifecycleId = this.lifecycleId;
    this.searchState = { query: normalizedQuery, loading: true };
    this.render();
    try {
      const response = await searchMusicAssistant(this._hass, normalizedQuery, this.config?.config_entry_id ?? '');
      if (requestId !== this.searchRequestId || lifecycleId !== this.lifecycleId || this.searchState.query !== normalizedQuery) return;
      this.searchState = { query: normalizedQuery, loading: false, response };
    } catch (error) {
      if (requestId !== this.searchRequestId || lifecycleId !== this.lifecycleId || this.searchState.query !== normalizedQuery) return;
      this.searchState = { query: normalizedQuery, loading: false, error: error instanceof Error ? error.message : 'Search failed.' };
    }
    this.render();
  }

  private renderMediaList(items: MediaItem[]): string {
    if (this.browseState.loading) return '<p class="state" aria-live="polite">Loading media sources...</p>';
    if (this.browseState.error) return `<p class="state error" role="alert">${escapeHtml(this.browseState.error)}</p>`;
    if (items.length === 0) return '<p class="state">This location has no media items.</p>';
    return `<div class="media-list">${items.map((item, index) => this.renderMediaItem(item, index)).join('')}</div>`;
  }

  private renderMediaItem(item: MediaItem, index: number): string {
    const icon = item.can_expand ? '<ha-icon icon="mdi:folder-music"></ha-icon>' : '<ha-icon icon="mdi:music-note"></ha-icon>';
    const thumbnail = item.thumbnail ? `<img src="${escapeHtml(item.thumbnail)}" alt="" loading="lazy">` : icon;
    const metadata = [item.artist, item.album, item.media_class ?? item.media_content_type].filter(Boolean).join(' · ');
    return `<button class="media-row" data-item-index="${index}" type="button"><span class="thumb" aria-hidden="true">${thumbnail}</span><span class="media-copy"><span class="media-title">${escapeHtml(item.title)}</span><span class="media-meta">${escapeHtml(metadata || (item.can_expand ? 'Open folder' : 'Media'))}</span></span></button>`;
  }

  private bindEvents(): void {
    if (this.eventsBound) return;
    this.eventsBound = true;
    this.root.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-item-index], [data-search-uri], [data-path-index], [data-control], [data-queue-index]') : null;
      if (!target) return;
      if (target.dataset.itemIndex !== undefined) {
        const item = this.browseState.response?.children[Number(target.dataset.itemIndex)];
        if (!item) return;
        if (item.can_expand) void this.loadMedia(item.media_content_id, [...this.browseState.path, item]);
        else void this.runAction(() => this.playMedia(item.media_content_id, item.media_content_type));
      } else if (target.dataset.searchUri) {
        void this.runAction(() => this.playMedia(target.dataset.searchUri as string, target.dataset.searchType ?? 'music'));
      } else if (target.dataset.pathIndex !== undefined) {
        const index = Number(target.dataset.pathIndex);
        const pathTarget = this.browseState.path[index];
        void this.loadMedia(pathTarget?.media_content_id ?? ROOT_MEDIA_ID, this.browseState.path.slice(0, index));
      } else if (target.dataset.queueIndex !== undefined) {
        const item = this.queueState.details?.items?.[Number(target.dataset.queueIndex)];
        if (item?.uri) void this.runAction(() => this.playMedia(item.uri as string, item.media_type ?? 'track'));
      } else {
        void this.runAction(() => this.handleControl(target.dataset.control ?? ''));
      }
    });
    this.root.addEventListener('input', (event) => {
      const target = event.target as HTMLInputElement;
      if (!target.matches('[data-search]')) return;
      this.clearSearchTimer();
      this.searchTimer = setTimeout(() => void this.runSearch(target.value), 350);
    });
    this.root.addEventListener('change', (event) => {
      const target = event.target as HTMLInputElement;
      if (target.matches('[data-seek]')) void this.runAction(() => this.callPlayerService('media_seek', { seek_position: Number(target.value) }));
      if (target.matches('[data-volume]')) void this.runAction(() => this.callPlayerService('volume_set', { volume_level: Number(target.value) / 100 }));
    });
  }

  private async handleControl(control: string): Promise<void> {
    if (control === 'play-pause') await this.callPlayerService('media_play_pause');
    if (control === 'next') await this.callPlayerService('media_next_track');
    if (control === 'shuffle') {
      const state = this._hass?.states[this.config?.player ?? ''];
      await this.callPlayerService('shuffle_set', { shuffle: !Boolean(state?.attributes.shuffle) });
    }
    if (control === 'repeat') {
      const state = String(this._hass?.states[this.config?.player ?? '']?.attributes.repeat ?? 'off');
      const next = state === 'off' ? 'all' : state === 'all' ? 'one' : 'off';
      await this.callPlayerService('repeat_set', { repeat: next });
    }
    if (control === 'clear-queue') {
      await this.callPlayerService('clear_playlist');
      await this.loadQueue();
    }
  }

  private async callPlayerService(service: string, data?: Record<string, unknown>): Promise<void> {
    if (!this._hass || !this.config) return;
    await this._hass.callService('media_player', service, data, { entity_id: this.config.player });
  }

  private async playMedia(mediaContentId: string, mediaContentType: string): Promise<void> {
    if (!this._hass || !this.config) return;
    await this._hass.callService('media_player', 'play_media', {
      media_content_id: mediaContentId,
      media_content_type: mediaContentType,
      enqueue: this.config.click_action === 'queue' ? 'add' : 'replace',
    }, { entity_id: this.config.player });
    if (this.config.click_action === 'queue') await this.loadQueue();
  }

  private async runAction(action: () => Promise<void>): Promise<void> {
    this.operationError = undefined;
    try {
      await action();
    } catch (error) {
      this.operationError = error instanceof Error ? error.message : 'The playback action failed.';
      this.render();
    }
  }

  private clearSearchTimer(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = undefined;
  }

  private invalidateRequests(): void {
    this.mediaRequestId += 1;
    this.queueRequestId += 1;
    this.searchRequestId += 1;
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character);
}

function formatDuration(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0:00';
  const seconds = Math.floor(value);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

if (!customElements.get(CARD_TAG)) customElements.define(CARD_TAG, MusicAssistantCard);
window.customCards = window.customCards ?? [];
if (!window.customCards.some((card) => card.type === CARD_TAG)) window.customCards.push({ type: CARD_TAG, name: 'Echo Show Music Assistant Card', description: 'Browse and control Music Assistant from Home Assistant.', preview: true });

declare global {
  interface Window { customCards?: Array<{ type: string; name: string; description: string; preview?: boolean }> }
}
