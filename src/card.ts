import type {
  HomeAssistant,
  HassEntity,
  LovelaceCard,
  LovelaceCardConfig,
  MusicAssistantCardConfig,
} from './home-assistant';
import { browseMedia } from './music-assistant/media-browser';
import { searchMusicAssistant, flattenSearchResults, type SearchItem, type SearchResponse } from './music-assistant/search';
import { getQueue, type QueueDetails, type QueueItem } from './music-assistant/queue';
import { type MediaBrowseResponse, type MediaItem } from './music-assistant/media-browser';
import './editor';

const CARD_TAG = 'music-assistant-card';
const ROOT_MEDIA_ID = 'media-source://music_assistant';

const cardStyles = `
  :host { --music-bg: var(--card-background-color, #101416); --music-surface: #171d20; --music-raised: #20282b; --music-line: #2d383b; --music-text: var(--primary-text-color, #f2f6f5); --music-muted: var(--secondary-text-color, #9ba9aa); --music-accent: var(--primary-color, #65d6c7); display: block; color: var(--music-text); font-family: var(--paper-font-body1_-_font-family, 'Segoe UI', sans-serif); }
  .card { min-height: 240px; box-sizing: border-box; padding: 14px; border: 1px solid var(--music-line); border-radius: 12px; background: var(--music-bg); box-shadow: 0 12px 28px rgb(0 0 0 / 24%); }
  .card { --music-card-height: 430px; --music-header-height: 56px; --music-touch-target: 48px; --music-list-row-height: 56px; --music-flyout-width: clamp(360px, 50%, 500px); position: relative; height: min(var(--music-card-height), calc(100dvh - var(--music-dashboard-chrome, 0px))); max-height: calc(100dvh - var(--music-dashboard-chrome, 0px)); overflow: hidden; }
  .top-menu { position: absolute; z-index: 10; inset: 14px 14px auto; display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 14px; min-height: var(--music-header-height); pointer-events: none; }
  .top-menu .player-action { min-width: 0; justify-content: flex-start; text-align: left; pointer-events: auto; }
  .top-menu .menu-actions { display: flex; justify-content: flex-end; gap: 6px; pointer-events: none; }
  .top-menu .menu-action { min-width: var(--music-touch-target); min-height: var(--music-touch-target); pointer-events: auto; }
  .top-menu .menu-label { flex: 1 1 auto; min-width: 0; max-width: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .primary-view { position: absolute; z-index: 1; inset: 14px; min-height: 0; overflow: hidden; }
  .now-playing-screen { padding-top: var(--music-header-height); }
  .now-playing-screen .playback { display: grid; grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) auto auto; height: 100%; box-sizing: border-box; gap: 12px; margin: 0; padding: 18px 10px 8px; border: 0; background: transparent; }
  .now-playing-layout { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: 28px; min-height: 0; }
  .now-playing-art { width: min(180px, 30vh, 40vw); aspect-ratio: 1; display: grid; place-items: center; overflow: hidden; border-radius: 8px; background: var(--music-raised); color: var(--music-muted); }
  .now-playing-art img { width: 100%; height: 100%; object-fit: cover; }
  .now-playing-art ha-icon { --mdc-icon-size: 42px; }
  .now-playing-details { display: grid; gap: 6px; min-width: 0; width: 100%; max-width: 80%; justify-self: start; text-align: left; }
  .playback-state { color: var(--music-muted); font-size: 13px; text-transform: uppercase; letter-spacing: .08em; }
  .now-playing-title { display: -webkit-box; overflow: hidden; color: var(--music-text); font-size: 28px; font-weight: 650; line-height: 1.12; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow-wrap: anywhere; }
  .now-playing-subtitle { display: -webkit-box; overflow: hidden; color: var(--music-muted); font-size: 21px; line-height: 1.2; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow-wrap: anywhere; }
  .now-playing-controls { justify-content: space-between; margin: 0; }
  .playback-controls { display: flex; align-items: center; gap: 14px; }
  .utility-controls { display: flex; align-items: center; gap: 7px; }
  .utility-controls { gap: 7px; }
  .utility-controls .repeat-control { margin-left: 14px; }
  .repeat-control.active { border-color: var(--music-accent); color: var(--music-accent); }
  .repeat-control.muted { color: var(--music-muted); opacity: .72; }
  .search-screen { display: grid; grid-template-rows: auto minmax(0, 1fr); gap: 10px; padding-top: var(--music-header-height); }
  .search-layout { display: grid; grid-template-columns: minmax(160px, .35fr) minmax(0, 1fr); gap: 16px; min-height: 0; }
  .search-navigation, .search-results { min-height: 0; overflow: auto; overscroll-behavior: contain; }
  .search-results { padding-right: 4px; }
  .primary-header, .flyout-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: var(--music-header-height); }
  .flyout-backdrop { position: absolute; z-index: 20; inset: 0; border: 0; background: rgb(0 0 0 / 38%); cursor: pointer; }
  .flyout { position: absolute; z-index: 30; inset: 0 0 0 auto; display: grid; grid-template-rows: var(--music-header-height) minmax(0, 1fr); width: var(--music-flyout-width); box-sizing: border-box; padding: 14px; border-left: 1px solid var(--music-line); background: var(--music-surface); box-shadow: -12px 0 28px rgb(0 0 0 / 28%); }
  .flyout[data-flyout="volume"] { width: 33.333%; }
  .flyout-body { min-height: 0; overflow: auto; overscroll-behavior: contain; }
  .flyout[data-flyout="queue"] .flyout-body { overflow: hidden; }
  .flyout[data-flyout="queue"] .queue { height: 100%; }
  .flyout[data-flyout="queue"] .queue-list { height: 100%; max-height: none; }
  .confirm-backdrop { position: absolute; z-index: 40; inset: 0; display: grid; place-items: center; padding: 24px; background: rgb(0 0 0 / 52%); }
  .confirm-dialog { display: grid; gap: 14px; width: min(100%, 360px); box-sizing: border-box; padding: 20px; border: 1px solid var(--music-line); border-radius: 8px; background: var(--music-raised); box-shadow: 0 16px 36px rgb(0 0 0 / 35%); }
  .confirm-actions { display: flex; justify-content: flex-end; gap: 8px; }
  .control.danger { border-color: var(--error-color, #ff8f8f); color: var(--error-color, #ff8f8f); }
  .flyout-body .speaker-sheet, .flyout-body .playlist-sheet { display: block; margin: 0; padding: 0; border: 0; background: transparent; }
  .flyout-body .speaker-sheet .panel-header, .flyout-body .playlist-sheet .panel-header { display: none; }
  .volume-flyout-body { display: grid; place-items: center; min-height: 100%; }
  .volume-slider-flyout { width: 40px; height: 80%; justify-self: center; --control-slider-color: var(--music-accent); --control-slider-thickness: 40px; }
  .now-playing-screen .playback > .queue, .now-playing-screen .playback [data-control="shuffle"], .now-playing-screen .playback [data-control="speaker"], .now-playing-screen .playback [data-control="playlist"], .now-playing-screen .playback .volume-control { display: none; }
  .queue-list, .speaker-list, .playlist-list { min-height: 0; overflow: auto; overscroll-behavior: contain; }
  .queue-row, .speaker-row, .playlist-list > .control { min-height: var(--music-list-row-height); }
  .speaker-actions { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: var(--music-touch-target); margin-bottom: 8px; }
  .speaker-select { flex: 1; justify-content: flex-start; min-height: var(--music-touch-target); border: 0; background: transparent; text-align: left; }
  .speaker-row .row-action { border: 0; background: transparent; }
  .speaker-actions { position: sticky; bottom: 0; z-index: 1; padding-top: 8px; background: var(--music-surface); }
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
  .queue-header-actions { display: flex; gap: 6px; }
  .queue-header-actions .queue-action { min-width: var(--music-touch-target); min-height: var(--music-touch-target); }
  .queue-header-actions .queue-action.active { border-color: var(--music-accent); color: var(--music-accent); }
  .row-actions { display: flex; gap: 4px; margin-left: auto; }
  .row-action { min-width: 30px; min-height: 30px; padding: 4px; }
  .speaker-sheet { margin-top: 12px; padding: 12px; border-top: 1px solid var(--music-line); background: var(--music-raised); }
  .speaker-list { display: grid; gap: 4px; margin-top: 8px; }
  .speaker-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 7px; border: 1px solid var(--music-line); border-radius: 6px; background: var(--music-surface); color: inherit; text-align: left; }
  .speaker-row.selected { border-color: var(--music-accent); }
  .playlist-sheet { margin-top: 12px; padding: 12px; border-top: 1px solid var(--music-line); background: var(--music-raised); }
  .playlist-list { display: grid; gap: 4px; max-height: 180px; overflow-y: auto; margin-top: 8px; }
  .playlist-create { display: flex; gap: 6px; margin-top: 8px; }
  .playlist-create input { min-width: 0; flex: 1; border: 1px solid var(--music-line); border-radius: 6px; background: var(--music-surface); color: inherit; padding: 7px; font: inherit; }
  .control:active, .queue-action:active { transform: scale(.96); }
  ha-icon { display: block; --mdc-icon-size: 20px; }
  .thumb ha-icon { --mdc-icon-size: 22px; }
  .back-button ha-icon { --mdc-icon-size: 18px; }
  @media (prefers-reduced-motion: reduce) { .media-row, .back-button, .control, .queue-action { transition: none; } }
  @media (prefers-reduced-motion: reduce) { .media-row, .back-button, .control, .queue-action { transition: none; } }
  @media (max-width: 680px) { .search-layout, .playback { grid-template-columns: 1fr; } .playback { gap: 12px; } .top-menu { grid-template-columns: minmax(0, 1fr) auto; gap: 6px; } .flyout { width: min(100%, 440px); } }
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

interface SpeakerState {
  loading: boolean;
  error?: string;
  players?: HassEntity[];
  selectedPlayerIds?: string[];
}

type PrimaryView = 'now-playing' | 'search';
type FlyoutKind = 'queue' | 'speakers' | 'volume';

interface CardUiState {
  primaryView: PrimaryView;
  activeFlyout: FlyoutKind | null;
  clearQueueConfirmOpen: boolean;
}

export class MusicAssistantCard extends HTMLElement implements LovelaceCard {
  static getConfigElement(): HTMLElement {
    return document.createElement('music-assistant-card-editor');
  }

  static getStubConfig(): MusicAssistantCardConfig {
    return {
      type: 'custom:music-assistant-card',
      player: '',
      player_list: 'all',
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
  private sessionIdentity?: { callWS?: HomeAssistant['callWS']; callService: HomeAssistant['callService'] };
  private speakerState: SpeakerState = { loading: false };
  private uiState: CardUiState = { primaryView: 'now-playing', activeFlyout: null, clearQueueConfirmOpen: false };

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
    this.bindEvents();
  }

  setConfig(config: LovelaceCardConfig): void {
    if (!config || typeof config !== 'object') throw new Error('Music Assistant Card: configuration is required.');
    if (typeof config.player !== 'string' || !config.player.trim()) throw new Error('Music Assistant Card: a player entity is required.');
    if (config.player_list !== undefined && !['all', 'selected'].includes(String(config.player_list))) throw new Error('Music Assistant Card: player_list must be "all" or "selected".');
    if (config.players !== undefined && (!Array.isArray(config.players) || config.players.some((player) => typeof player !== 'string'))) throw new Error('Music Assistant Card: players must be a list of entity IDs.');
    if (config.click_action && !['play', 'queue'].includes(String(config.click_action))) throw new Error('Music Assistant Card: click_action must be "play" or "queue".');

    const previousConfig = this.config;
    const providedConfig = Object.fromEntries(Object.entries(config).filter(([key]) => key !== 'type' && !key.startsWith('music_assistant_')));
    this.config = { type: CARD_TAG, layout: 'two-column', show_search: true, show_queue: true, click_action: 'play', player_list: 'all', ...providedConfig, player: config.player.trim(), players: Array.isArray(config.players) ? config.players.filter((player): player is string => typeof player === 'string' && player.trim().length > 0) : [] };
    if (previousConfig && (previousConfig.player !== this.config.player || previousConfig.player_list !== this.config.player_list || JSON.stringify(previousConfig.players) !== JSON.stringify(this.config.players))) {
      this.mediaRequested = false;
      this.queueRequested = false;
      this.browseState = { loading: false, path: [] };
      this.queueState = { loading: false };
      this.searchState = { query: '', loading: false };
      this.invalidateRequests();
      this.speakerState = { loading: false };
      this.uiState = { primaryView: 'now-playing', activeFlyout: null, clearQueueConfirmOpen: false };
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
    const sessionChanged = this.sessionIdentity !== undefined
      && (this.sessionIdentity.callWS !== hass.callWS || this.sessionIdentity.callService !== hass.callService);
    this.sessionIdentity = { callWS: hass.callWS, callService: hass.callService };
    this._hass = hass;
    if (sessionChanged) this.invalidateRequests();
    if (this.root.querySelector('.card')) this.updatePlayback();
    else this.render();
    if (this.config && this.uiState.primaryView === 'search' && !this.mediaRequested) {
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
    if (!this._hass || !this.config) return;
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
    const currentTitle = this.browseState.response?.title ?? 'Media sources';
    const mediaItems = this.browseState.response?.children ?? [];
    const player = this._hass?.states[this.config.player];
    const searchInput = this.root.querySelector<HTMLInputElement>('[data-search]');
    const preserveSearchFocus = this.root.activeElement === searchInput;
    const searchSelection = searchInput ? [searchInput.selectionStart, searchInput.selectionEnd] : [null, null];

    const primary = this.uiState.primaryView === 'search'
      ? `<section class="search-screen primary-view" data-primary-view="search" aria-labelledby="search-title"><div class="primary-header"><h1 class="panel-title" id="search-title">Search and browse</h1></div>${this.config.show_search ? this.renderSearch() : ''}<div class="search-layout"><section class="search-navigation" aria-label="Browse navigation"><p class="panel-copy">Browse providers, folders, playlists, albums, and artists.</p>${this.renderPath()}</section><section class="search-results" aria-labelledby="library-title"><div class="panel-header"><h2 class="panel-title" id="library-title">${this.searchState.query ? 'Search results' : escapeHtml(currentTitle)}</h2><span class="path">${this.searchState.query ? `${this.searchResultCount()} results` : `${mediaItems.length} items`}</span></div>${this.searchState.query ? this.renderSearchResults() : this.renderMediaList(mediaItems)}</section></div></section>`
      : `<section class="now-playing-screen primary-view" data-primary-view="now-playing">${this.renderPlayback(player)}</section>`;
    this.root.innerHTML = `
      <style>${cardStyles}</style>
      <section class="card" aria-label="Music Assistant">
        ${this.renderTopMenu()}
        ${primary}
        ${this.renderActiveFlyout()}
        ${this.operationError ? `<p class="state error" role="alert">${escapeHtml(this.operationError)}</p>` : ''}
      </section>
    `;
    if (preserveSearchFocus) {
      const nextSearchInput = this.root.querySelector<HTMLInputElement>('[data-search]');
      nextSearchInput?.focus();
      nextSearchInput?.setSelectionRange(searchSelection[0], searchSelection[1]);
    }
  }

  private renderTopMenu(): string {
    const speaker = this.getSpeakerLabel();
    const discover = this.uiState.primaryView === 'search'
      ? '<button class="control menu-action" data-control="discover" type="button" aria-label="Close search" title="Close search"><ha-icon icon="mdi:close"></ha-icon></button>'
      : '<button class="control menu-action" data-control="discover" type="button" aria-label="Open search" title="Open search"><ha-icon icon="mdi:magnify"></ha-icon></button>';
    return `<nav class="top-menu" aria-label="Music controls"><button class="control menu-action player-action" data-control="speaker" type="button" aria-label="Choose player" title="Choose player"><ha-icon icon="mdi:speaker"></ha-icon><span class="menu-label">${escapeHtml(speaker)}</span></button><span class="menu-actions"><button class="control menu-action" data-control="queue" type="button" aria-label="Open queue" title="Open queue"><ha-icon icon="mdi:playlist-music"></ha-icon></button>${discover}</span></nav>`;
  }

  private renderActiveFlyout(): string {
    if (!this.uiState.activeFlyout) return '';
    const title = this.uiState.activeFlyout === 'queue' ? 'Queue' : this.uiState.activeFlyout === 'speakers' ? 'Players' : 'Volume';
    const body = this.uiState.activeFlyout === 'queue' ? this.renderQueue() : this.uiState.activeFlyout === 'speakers' ? this.renderSpeakerSheet() : this.renderVolumeFlyout();
    const confirmation = this.uiState.clearQueueConfirmOpen ? '<div class="confirm-backdrop"><section class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="clear-queue-title"><h2 class="panel-title" id="clear-queue-title">Clear queue?</h2><p class="panel-copy">This removes all queued items.</p><div class="confirm-actions"><button class="control" data-control="clear-queue-cancel" type="button">Cancel</button><button class="control danger" data-control="clear-queue-confirm" type="button">Clear queue</button></div></section></div>' : '';
    const header = this.uiState.activeFlyout === 'queue'
      ? this.renderQueueHeader()
      : `<div class="flyout-header"><h2 class="panel-title">${title}</h2><button class="control" data-control="close-flyout" type="button" aria-label="Close ${title}" title="Close"><ha-icon icon="mdi:close"></ha-icon></button></div>`;
    return `<button class="flyout-backdrop" data-control="close-flyout" type="button" aria-label="Close ${title}"></button><aside class="flyout" data-flyout="${this.uiState.activeFlyout}" aria-label="${title}">${header}<div class="flyout-body">${body}</div></aside>${confirmation}`;
  }

  private renderQueueHeader(): string {
    const shuffleEnabled = this.queueState.details?.shuffle_enabled === true;
    return `<div class="flyout-header"><h2 class="panel-title">Queue</h2><span class="queue-header-actions"><button class="queue-action" data-control="clear-queue-request" type="button" aria-label="Clear queue" title="Clear queue"><ha-icon icon="mdi:close"></ha-icon></button><button class="queue-action${shuffleEnabled ? ' active' : ''}" data-control="shuffle" type="button" aria-pressed="${shuffleEnabled}" aria-label="Toggle shuffle" title="Toggle shuffle"><ha-icon icon="mdi:shuffle"></ha-icon></button><button class="queue-action" data-control="close-flyout" type="button" aria-label="Close Queue" title="Close"><ha-icon icon="mdi:close"></ha-icon></button></span></div>`;
  }

  private renderVolumeFlyout(): string {
    const attributes = this.config ? this._hass?.states[this.config.player]?.attributes ?? {} : {};
    const volume = Math.max(0, Math.min(100, Math.round(Number(attributes.volume_level ?? 0) * 100)));
    return `<div class="volume-flyout-body"><ha-control-slider class="volume-slider-flyout" data-volume min="0" max="100" step="1" value="${volume}" vertical show-handle tooltip-mode="never" aria-label="Volume"></ha-control-slider></div>`;
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

  private renderPlayback(player?: { state: string; attributes: Record<string, unknown> }): string {
    return this.renderNowPlaying(player);
  }

  private renderNowPlaying(player?: { state: string; attributes: Record<string, unknown> }): string {
    const attributes = player?.attributes ?? {};
    const titleValue = typeof attributes.media_title === 'string' ? attributes.media_title.trim() : '';
    const hasCurrentItem = titleValue.length > 0
      || player?.state === 'playing'
      || player?.state === 'paused';
    const title = player ? titleValue || (hasCurrentItem ? 'Now playing' : 'Nothing playing') : 'Player unavailable';
    const artistValue = typeof attributes.media_artist === 'string' ? attributes.media_artist.trim() : '';
    const artist = artistValue;
    const image = typeof attributes.entity_picture === 'string' ? attributes.entity_picture : undefined;
    const isPlaying = player?.state === 'playing';
    const position = Number(attributes.media_position ?? 0);
    const duration = Number(attributes.media_duration ?? 0);
    const repeat = String(attributes.repeat ?? 'off').toLowerCase();
    const repeatIcon = repeat === 'one' ? 'repeat-once' : repeat === 'all' ? 'repeat' : 'repeat-off';
    const repeatClass = repeat === 'off' ? 'muted' : 'active';
    return `<section class="playback" aria-label="Now playing"><div class="now-playing-layout"><span class="now-playing-art">${image ? `<img src="${escapeHtml(image)}" alt="">` : '<ha-icon icon="mdi:music-note"></ha-icon>'}</span><div class="now-playing-details"><span class="playback-state">${isPlaying ? 'Now playing' : 'Paused'}</span><span class="now-playing-title">${escapeHtml(title)}</span>${artist ? `<span class="now-playing-subtitle">${escapeHtml(artist)}</span>` : ''}</div></div><div class="timeline"><span>${formatDuration(position)}</span><input class="progress" data-seek type="range" min="0" max="${duration || 1}" value="${Math.min(position, duration || 1)}" aria-label="Playback position"><span>${formatDuration(duration)}</span></div><div class="controls now-playing-controls"><span class="playback-controls"><button class="control primary" data-control="play-pause" type="button" aria-label="${isPlaying ? 'Pause' : 'Play'}"><ha-icon icon="mdi:${isPlaying ? 'pause' : 'play'}"></ha-icon></button><button class="control" data-control="next" type="button" aria-label="Next track"><ha-icon icon="mdi:skip-next"></ha-icon></button></span><span class="utility-controls"><button class="control repeat-control ${repeatClass}" data-control="repeat" type="button" aria-label="Change repeat mode" aria-pressed="${repeat !== 'off'}"><ha-icon icon="mdi:${repeatIcon}"></ha-icon></button><button class="control" data-control="volume" type="button" aria-label="Open volume" title="Open volume"><ha-icon icon="mdi:volume-high"></ha-icon></button></span></div></section>`;
  }

  private renderSpeakerSheet(): string {
    if (!this.speakerState.players && !this.speakerState.loading && !this.speakerState.error) return '';
    if (this.speakerState.loading) return '<section class="speaker-sheet" aria-label="Speakers"><p class="state">Loading speakers...</p></section>';
    if (this.speakerState.error) return `<section class="speaker-sheet" aria-label="Speakers"><p class="state error">${escapeHtml(this.speakerState.error)}</p></section>`;
    const currentId = this.config?.player;
    const selectedIds = new Set(this.speakerState.selectedPlayerIds ?? (currentId ? [currentId] : []));
    const players = (this.speakerState.players ?? []).sort((left, right) => this.playerName(left).localeCompare(this.playerName(right), undefined, { sensitivity: 'base' }));
    return `<section class="speaker-sheet" aria-label="Players"><div class="speaker-list">${players.map((player) => `<div class="speaker-row${selectedIds.has(player.entity_id) ? ' selected' : ''}"><button class="control speaker-select" data-speaker-id="${escapeHtml(player.entity_id)}" type="button" aria-pressed="${selectedIds.has(player.entity_id)}"><span class="media-copy"><span class="media-title">${escapeHtml(this.playerName(player))}</span><span class="media-meta">${player.entity_id === currentId ? 'Current player' : selectedIds.has(player.entity_id) ? 'Selected' : 'Available'}</span></span></button>${player.entity_id !== currentId && this.supportsGrouping(player) ? '<span class="row-actions"><button class="control row-action" data-speaker-action="transfer" data-speaker-target="' + escapeHtml(player.entity_id) + '" type="button" aria-label="Transfer playback" title="Transfer playback"><ha-icon icon="mdi:transfer"></ha-icon></button></span>' : ''}</div>`).join('')}</div><div class="speaker-actions"><span class="panel-copy">Select players for playback</span><button class="control primary" data-speaker-action="apply" type="button">Apply</button></div></section>`;
  }

  private renderQueue(): string {
    if (this.queueState.loading) return '<div class="queue"><p class="state">Loading queue...</p></div>';
    if (this.queueState.error) return `<div class="queue"><p class="state error">${escapeHtml(this.queueState.error)}</p></div>`;
    const items = this.queueState.details?.items ?? [];
    if (items.length === 0) return '<div class="queue"><p class="state">Queue is empty.</p></div>';
    const currentIndex = this.queueState.details?.current_index ?? -1;
    return `<div class="queue"><div class="queue-list">${items.map((item, index) => this.renderQueueItem(item, index, index === currentIndex)).join('')}</div></div>`;
  }

  private renderQueueItem(item: QueueItem, _index: number, current: boolean): string {
    const metadata = [item.artist, item.album].filter(Boolean).join(' · ');
    return `<div class="queue-row${current ? ' current' : ''}"><span class="media-copy"><span class="media-title">${escapeHtml(String(item.name ?? 'Untitled'))}</span><span class="media-meta">${escapeHtml(metadata || 'Queue item')}</span></span></div>`;
  }

  private renderPath(): string {
    const root = '<button class="back-button" data-path-root type="button"><ha-icon icon="mdi:home-outline" aria-hidden="true"></ha-icon><span>Music Assistant</span></button>';
    if (this.browseState.path.length === 0) return `${root}<p class="panel-copy">Choose a source to begin browsing.</p>`;
    const back = '<button class="back-button" data-path-back type="button"><ha-icon icon="mdi:arrow-left" aria-hidden="true"></ha-icon><span>Back</span></button>';
    return `<div class="media-list">${root}${back}${this.browseState.path.map((item, index) => `<button class="back-button" data-path-index="${index}" type="button"><ha-icon icon="mdi:chevron-right" aria-hidden="true"></ha-icon><span>${escapeHtml(item.title)}</span></button>`).join('')}</div>`;
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
    const canExpand = item.can_expand === true;
    const canPlay = item.is_playable !== false;
    return `<div class="media-row" data-search-uri="${escapeHtml(item.uri)}" data-search-type="${escapeHtml(item.media_type ?? item.group)}" data-search-expand="${canExpand}"><span class="thumb" aria-hidden="true">${thumbnail}</span><span class="media-copy"><span class="media-title">${escapeHtml(item.name)}</span><span class="media-meta">${escapeHtml(canExpand ? `${metadata} · Open` : metadata)}</span></span>${canPlay ? this.renderRowActions() : ''}</div>`;
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
      const response = await searchMusicAssistant(this._hass, normalizedQuery);
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
    return `<div class="media-row" data-item-index="${index}" role="${item.can_expand ? 'button' : 'group'}" tabindex="${item.can_expand ? '0' : '-1'}"><span class="thumb" aria-hidden="true">${thumbnail}</span><span class="media-copy"><span class="media-title">${escapeHtml(item.title)}</span><span class="media-meta">${escapeHtml(metadata || (item.can_expand ? 'Open folder' : 'Media'))}</span></span>${item.can_play && !item.can_expand ? this.renderRowActions() : ''}</div>`;
  }

  private renderRowActions(): string {
    return '<span class="row-actions"><button class="control row-action" data-item-action="play" type="button" aria-label="Play now" title="Play now"><ha-icon icon="mdi:play"></ha-icon></button><button class="control row-action" data-item-action="queue" type="button" aria-label="Add to queue" title="Add to queue"><ha-icon icon="mdi:playlist-plus"></ha-icon></button></span>';
  }

  private bindEvents(): void {
    if (this.eventsBound) return;
    this.eventsBound = true;
    this.root.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-speaker-action], [data-speaker-id], [data-item-action], [data-item-index], [data-search-uri], [data-path-index], [data-path-root], [data-path-back], [data-control], [data-queue-index]') : null;
      if (!target) return;
      if (target.dataset.speakerId) {
        const selected = new Set(this.speakerState.selectedPlayerIds ?? (this.config?.player ? [this.config.player] : []));
        if (target.dataset.speakerId === this.config?.player) return;
        if (selected.has(target.dataset.speakerId)) selected.delete(target.dataset.speakerId);
        else selected.add(target.dataset.speakerId);
        this.speakerState.selectedPlayerIds = [...selected];
        this.render();
      } else if (target.dataset.speakerAction) {
        if (target.dataset.speakerAction === 'apply') {
          void this.runAction(() => this.applySpeakerSelection());
          return;
        }
        const targetPlayerId = target.dataset.speakerTarget;
        if (!targetPlayerId) return;
        void this.runAction(() => this.runSpeakerAction(target.dataset.speakerAction ?? '', targetPlayerId));
      } else if (target.dataset.itemAction) {
        const row = target.closest<HTMLElement>('[data-item-index], [data-search-uri]');
        const option = target.dataset.itemAction === 'queue' ? 'add' : 'replace';
        if (row?.dataset.itemIndex !== undefined) {
          const item = this.browseState.response?.children[Number(row.dataset.itemIndex)];
          if (item && !item.can_expand) void this.runAction(() => this.playMedia(item.media_content_id, item.media_content_type, option));
        } else if (row?.dataset.searchUri) {
          const searchUri = row.dataset.searchUri;
          void this.runAction(() => this.playMedia(searchUri, row.dataset.searchType ?? 'music', option));
        }
      } else if (target.dataset.itemIndex !== undefined) {
        const item = this.browseState.response?.children[Number(target.dataset.itemIndex)];
        if (!item) return;
        if (item.can_expand) void this.loadMedia(item.media_content_id, [...this.browseState.path, item]);
        else void this.runAction(() => this.playMedia(item.media_content_id, item.media_content_type));
      } else if (target.dataset.searchUri) {
        if (target.dataset.searchExpand === 'true') {
          const searchItem = flattenSearchResults(this.searchState.response ?? {}).find((item) => item.uri === target.dataset.searchUri);
          if (searchItem) void this.loadMedia(target.dataset.searchUri, [...this.browseState.path, toMediaItemFromSearch(searchItem)]);
        } else {
          void this.runAction(() => this.playMedia(target.dataset.searchUri as string, target.dataset.searchType ?? 'music'));
        }
      } else if (target.dataset.pathRoot !== undefined) {
        void this.loadMedia(ROOT_MEDIA_ID, []);
      } else if (target.dataset.pathBack !== undefined) {
        const parentPath = this.browseState.path.slice(0, -1);
        void this.loadMedia(parentPath.at(-1)?.media_content_id ?? ROOT_MEDIA_ID, parentPath);
      } else if (target.dataset.pathIndex !== undefined) {
        const index = Number(target.dataset.pathIndex);
        const pathTarget = this.browseState.path[index];
        void this.loadMedia(pathTarget?.media_content_id ?? ROOT_MEDIA_ID, this.browseState.path.slice(0, index + 1));
      } else if (target.dataset.queueIndex !== undefined) {
        const index = Number(target.dataset.queueIndex);
        void this.runAction(async () => {
          await this.callService('media_player', 'play_media', { media_content_id: this.queueState.details?.items?.[index]?.uri, media_content_type: this.queueState.details?.items?.[index]?.media_type });
          await this.loadQueue();
          this.uiState.activeFlyout = null;
          this.render();
        });
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
      if (target.matches('[data-seek]')) void this.runAction(async () => {
        await this.callService('media_player', 'media_seek', { seek_position: Number(target.value) });
      });
    });
    this.root.addEventListener('value-changed', (event) => {
      const target = event.target as HTMLElement & { value?: number };
      if (!target.matches('[data-volume]')) return;
      const value = typeof target.value === 'number' ? target.value : Number((event as CustomEvent<{ value?: number }>).detail?.value);
      if (!Number.isFinite(value)) return;
      void this.runAction(async () => {
        await this.callService('media_player', 'volume_set', { volume_level: value / 100 });
      });
    });
  }

  private async loadSpeakers(): Promise<void> {
    this.speakerState = { loading: true };
    this.render();
    try {
      const players = Object.values(this._hass?.states ?? {}).filter((entity) => entity.entity_id.startsWith('media_player.') && this.isVisiblePlayer(entity));
      const selectedPlayerIds = this.getCurrentSpeakerSelection();
      this.speakerState = { loading: false, players, selectedPlayerIds };
    } catch (error) {
      this.speakerState = { loading: false, error: error instanceof Error ? error.message : 'Unable to load speakers.' };
    }
    this.render();
  }

  private async runSpeakerAction(action: string, targetPlayerId: string): Promise<void> {
    if (action === 'transfer') await this.callService('media_player', 'transfer_playback', {}, { entity_id: targetPlayerId });
    await this.loadQueue();
    await this.loadSpeakers();
  }

  private async applySpeakerSelection(): Promise<void> {
    const currentId = this.config?.player;
    if (!currentId) throw new Error('The current Music Assistant speaker is unavailable.');
    const existing = new Set(this.getCurrentSpeakerSelection());
    const selected = new Set(this.speakerState.selectedPlayerIds ?? [currentId]);
    const additions = [...selected].filter((playerId) => playerId !== currentId && !existing.has(playerId));
    const removals = [...existing].filter((playerId) => playerId !== currentId && !selected.has(playerId));
    if (additions.length > 0) await this.callService('media_player', 'join', {}, { entity_id: [currentId, ...additions] });
    if (removals.length > 0) await this.callService('media_player', 'unjoin', {}, { entity_id: removals });
    await this.loadQueue();
    await this.loadSpeakers();
    this.uiState.activeFlyout = null;
    this.render();
  }

  private getCurrentSpeakerSelection(): string[] {
    const current = this._hass?.states[this.config?.player ?? ''];
    return current ? [current.entity_id, ...getGroupMembers(current)] : [];
  }

  private async handleControl(control: string): Promise<void> {
    if (control === 'discover') {
      this.uiState.primaryView = this.uiState.primaryView === 'search' ? 'now-playing' : 'search';
      this.uiState.activeFlyout = null;
      this.uiState.clearQueueConfirmOpen = false;
      if (this.uiState.primaryView === 'search' && !this.mediaRequested) {
        this.mediaRequested = true;
        void this.loadMedia(ROOT_MEDIA_ID, []);
      }
      this.render();
      return;
    }
    if (control === 'close-flyout') {
      if (this.uiState.activeFlyout === 'speakers') this.speakerState.selectedPlayerIds = this.getCurrentSpeakerSelection();
      this.uiState.activeFlyout = null;
      this.uiState.clearQueueConfirmOpen = false;
      this.render();
      return;
    }
    if (control === 'clear-queue-request') {
      this.uiState.clearQueueConfirmOpen = true;
      this.render();
      return;
    }
    if (control === 'clear-queue-cancel') {
      this.uiState.clearQueueConfirmOpen = false;
      this.render();
      return;
    }
    if (control === 'clear-queue-confirm') {
      await this.callService('media_player', 'clear_playlist');
      this.uiState.clearQueueConfirmOpen = false;
      await this.loadQueue();
      return;
    }
    if (control === 'queue' || control === 'volume') {
      this.uiState.activeFlyout = control;
      if (control === 'queue' && !this.queueRequested) {
        this.queueRequested = true;
        void this.loadQueue();
      }
      this.render();
      return;
    }
    if (control === 'speaker') {
      if (this.speakerState.players || this.speakerState.loading || this.speakerState.error) {
        this.uiState.activeFlyout = this.uiState.activeFlyout === 'speakers' ? null : 'speakers';
        if (!this.uiState.activeFlyout) this.speakerState.selectedPlayerIds = this.getCurrentSpeakerSelection();
        this.speakerState = this.uiState.activeFlyout ? this.speakerState : { loading: false };
        this.render();
      } else {
        this.uiState.activeFlyout = 'speakers';
        void this.loadSpeakers();
      }
      return;
    }
    if (control === 'play-pause') await this.callService('media_player', this._hass?.states[this.config?.player ?? '']?.state === 'playing' ? 'media_pause' : 'media_play');
    if (control === 'next') await this.callService('media_player', 'media_next');
    if (control === 'shuffle') {
      const state = this._hass?.states[this.config?.player ?? ''];
      await this.callService('media_player', 'shuffle_set', { shuffle: !Boolean(state?.attributes.shuffle) });
    }
    if (control === 'repeat') {
      const state = String(this._hass?.states[this.config?.player ?? '']?.attributes.repeat ?? 'off');
      const next = state === 'off' ? 'all' : state === 'all' ? 'one' : 'off';
      await this.callService('media_player', 'repeat_set', { repeat: next });
    }
    if (control === 'clear-queue') {
      this.uiState.clearQueueConfirmOpen = true;
      this.render();
    }
  }

  private async playMedia(mediaContentId: string, mediaContentType: string, option = this.config?.click_action === 'queue' ? 'add' : 'replace'): Promise<void> {
    if (!this._hass || !this.config) return;
    await this.callService('music_assistant', 'play_media', { media_id: mediaContentId, media_type: mediaContentType, enqueue: option }, { entity_id: this.config.player });
    if (option === 'add' || this.config.click_action === 'queue') await this.loadQueue();
  }

  private async callService(domain: string, service: string, data?: Record<string, unknown>, target?: Record<string, unknown>): Promise<void> {
    if (!this._hass || !this.config) throw new Error('Home Assistant is unavailable.');
    await this._hass.callService(domain, service, data, target ?? { entity_id: this.config.player }, true, false);
  }

  private playerName(player: HassEntity): string {
    const name = player.attributes.friendly_name;
    return typeof name === 'string' && name.trim() ? name.trim() : player.entity_id;
  }

  private isVisiblePlayer(player: HassEntity): boolean {
    if (this.config?.player_list !== 'selected') return true;
    return player.entity_id === this.config.player || (this.config.players ?? []).includes(player.entity_id);
  }

  private supportsGrouping(player: HassEntity): boolean {
    const features = player.attributes.supported_features;
    return typeof features === 'number' ? (features & 512) !== 0 : Array.isArray(features) && features.includes('grouping');
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

function toMediaItemFromSearch(item: SearchItem): MediaItem {
  return {
    media_content_id: item.uri,
    media_content_type: item.media_type ?? 'music',
    title: item.name,
    thumbnail: item.image,
    can_play: item.is_playable !== false,
    can_expand: item.can_expand === true,
    artist: item.artist,
    album: item.album,
  };
}

function getGroupMembers(entity: HassEntity): string[] {
  const members = entity.attributes.group_members;
  return Array.isArray(members) ? members.filter((member): member is string => typeof member === 'string') : [];
}

if (!customElements.get(CARD_TAG)) customElements.define(CARD_TAG, MusicAssistantCard);
window.customCards = window.customCards ?? [];
if (!window.customCards.some((card) => card.type === CARD_TAG)) window.customCards.push({ type: CARD_TAG, name: 'Echo Show Music Assistant Card', description: 'Browse and control Music Assistant from Home Assistant.', preview: true });

declare global {
  interface Window { customCards?: Array<{ type: string; name: string; description: string; preview?: boolean }> }
}
