import type {
  HomeAssistant,
  LovelaceCard,
  LovelaceCardConfig,
  MusicAssistantCardConfig,
} from './home-assistant';
import { addCurrentMusicAssistantItemToFavorites, addMusicAssistantPlayerToGroup, addMusicAssistantPlaylistTracks, advanceMusicAssistantQueue, browseMusicAssistant, clearMusicAssistantQueue, createMusicAssistantPlaylist, getActiveMusicAssistantQueue, getMusicAssistantPlayers, getMusicAssistantQueueItems, listMusicAssistantPlaylists, playMusicAssistantMedia, playMusicAssistantQueueItem, removeMusicAssistantFavorite, removeMusicAssistantPlayerFromGroup, removeMusicAssistantPlayersFromGroup, seekMusicAssistantQueue, setMusicAssistantRepeat, setMusicAssistantShuffle, setMusicAssistantVolume, searchMusicAssistantApi, toggleMusicAssistantQueuePlayback, transferMusicAssistantQueue, type MusicAssistantMediaItem, type MusicAssistantPlayer, type MusicAssistantPlaylist } from './music-assistant/api';
import { type MediaBrowseResponse, type MediaItem } from './music-assistant/media-browser';
import { flattenSearchResults, type SearchGroup, type SearchItem, type SearchResponse } from './music-assistant/search';
import { type QueueDetails, type QueueItem } from './music-assistant/queue';
import { resolveMusicAssistantIngress } from './music-assistant/ingress';
import { createMusicAssistantHttpTransport } from './music-assistant/transport';
import { getEligibleMusicAssistantPlayers, resolveMusicAssistantPlayer, sortMusicAssistantPlayers } from './music-assistant/players';
import './editor';

const CARD_TAG = 'music-assistant-card';
const ROOT_MEDIA_ID = 'media-source://';

const cardStyles = `
  :host { --music-bg: var(--card-background-color, #101416); --music-surface: #171d20; --music-raised: #20282b; --music-line: #2d383b; --music-text: var(--primary-text-color, #f2f6f5); --music-muted: var(--secondary-text-color, #9ba9aa); --music-accent: var(--primary-color, #65d6c7); display: block; color: var(--music-text); font-family: var(--paper-font-body1_-_font-family, 'Segoe UI', sans-serif); }
  .card { min-height: 240px; box-sizing: border-box; padding: 14px; border: 1px solid var(--music-line); border-radius: 12px; background: var(--music-bg); box-shadow: 0 12px 28px rgb(0 0 0 / 24%); }
  .card { --music-card-height: 430px; --music-header-height: 56px; --music-touch-target: 48px; --music-list-row-height: 56px; --music-flyout-width: clamp(360px, 50%, 500px); position: relative; height: min(var(--music-card-height), calc(100dvh - var(--music-dashboard-chrome, 0px))); max-height: calc(100dvh - var(--music-dashboard-chrome, 0px)); overflow: hidden; }
  .top-menu { position: absolute; z-index: 10; inset: 14px 14px auto 50%; display: flex; justify-content: flex-end; gap: 6px; min-height: var(--music-header-height); pointer-events: none; }
  .top-menu .menu-action { min-width: var(--music-touch-target); min-height: var(--music-touch-target); pointer-events: auto; }
  .top-menu .menu-label { max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .primary-view { position: absolute; z-index: 1; inset: 14px; min-height: 0; overflow: hidden; }
  .now-playing-screen { padding-top: var(--music-header-height); }
  .now-playing-screen .playback { display: grid; grid-template-rows: minmax(0, 1fr) auto auto; height: 100%; box-sizing: border-box; gap: 14px; margin: 0; padding: 18px 10px 8px; border: 0; background: transparent; }
  .now-playing-layout { display: grid; grid-template-columns: 128px minmax(0, 1fr) auto; align-items: center; gap: 18px; min-height: 0; }
  .now-playing-art { width: 128px; height: 128px; flex: 0 0 128px; display: grid; place-items: center; overflow: hidden; border-radius: 8px; background: var(--music-raised); color: var(--music-muted); }
  .now-playing-art img { width: 100%; height: 100%; object-fit: cover; }
  .now-playing-art ha-icon { --mdc-icon-size: 42px; }
  .now-playing-details { display: grid; gap: 6px; min-width: 0; }
  .playback-state { color: var(--music-muted); font-size: 13px; text-transform: uppercase; letter-spacing: .08em; }
  .now-playing-title { display: -webkit-box; overflow: hidden; color: var(--music-text); font-size: 28px; font-weight: 650; line-height: 1.12; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow-wrap: anywhere; }
  .now-playing-subtitle { display: -webkit-box; overflow: hidden; color: var(--music-muted); font-size: 21px; line-height: 1.2; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow-wrap: anywhere; }
  .favorite-control { align-self: start; min-width: var(--music-touch-target); min-height: var(--music-touch-target); }
  .now-playing-controls { justify-content: flex-start; margin: 0; }
  .repeat-control.active { border-color: var(--music-accent); color: var(--music-accent); }
  .repeat-control.muted { color: var(--music-muted); opacity: .72; }
  .search-screen { display: grid; grid-template-rows: auto auto minmax(0, 1fr); gap: 10px; padding-top: var(--music-header-height); }
  .search-layout { display: grid; grid-template-columns: minmax(160px, .35fr) minmax(0, 1fr); gap: 16px; min-height: 0; }
  .search-navigation, .search-results { min-height: 0; overflow: auto; overscroll-behavior: contain; }
  .search-results { padding-right: 4px; }
  .primary-header, .flyout-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: var(--music-header-height); }
  .flyout-backdrop { position: absolute; z-index: 20; inset: 0; border: 0; background: rgb(0 0 0 / 38%); cursor: pointer; }
  .flyout { position: absolute; z-index: 30; inset: 0 0 0 auto; display: grid; grid-template-rows: var(--music-header-height) minmax(0, 1fr); width: var(--music-flyout-width); box-sizing: border-box; padding: 14px; border-left: 1px solid var(--music-line); background: var(--music-surface); box-shadow: -12px 0 28px rgb(0 0 0 / 28%); }
  .flyout-body { min-height: 0; overflow: auto; overscroll-behavior: contain; }
  .confirm-backdrop { position: absolute; z-index: 40; inset: 0; display: grid; place-items: center; padding: 24px; background: rgb(0 0 0 / 52%); }
  .confirm-dialog { display: grid; gap: 14px; width: min(100%, 360px); box-sizing: border-box; padding: 20px; border: 1px solid var(--music-line); border-radius: 8px; background: var(--music-raised); box-shadow: 0 16px 36px rgb(0 0 0 / 35%); }
  .confirm-actions { display: flex; justify-content: flex-end; gap: 8px; }
  .control.danger { border-color: var(--error-color, #ff8f8f); color: var(--error-color, #ff8f8f); }
  .flyout-body .speaker-sheet, .flyout-body .playlist-sheet { display: block; margin: 0; padding: 0; border: 0; background: transparent; }
  .flyout-body .speaker-sheet .panel-header, .flyout-body .playlist-sheet .panel-header { display: none; }
  .volume-flyout-body { display: grid; place-items: center; align-content: center; gap: 18px; min-height: 100%; text-align: center; }
  .volume-flyout-body output { color: var(--music-text); font-size: 24px; font-weight: 650; }
  .volume-slider-flyout { width: 56px; height: min(250px, 60%); writing-mode: vertical-lr; direction: rtl; accent-color: var(--music-accent); }
  .volume-scale { display: flex; flex-direction: column; justify-content: space-between; height: min(250px, 60%); color: var(--music-muted); font-size: 13px; }
  .now-playing-screen .playback > .queue, .now-playing-screen .playback [data-control="shuffle"], .now-playing-screen .playback [data-control="speaker"], .now-playing-screen .playback [data-control="playlist"], .now-playing-screen .playback .volume-control { display: none; }
  .queue-list, .speaker-list, .playlist-list { min-height: 0; overflow: auto; overscroll-behavior: contain; }
  .queue-row, .speaker-row, .playlist-list > .control { min-height: var(--music-list-row-height); }
  .speaker-actions { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: var(--music-touch-target); margin-bottom: 8px; }
  .speaker-select { flex: 1; justify-content: flex-start; min-height: var(--music-touch-target); border-color: transparent; text-align: left; }
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
  @media (max-width: 680px) { .search-layout, .playback, .now-playing-layout { grid-template-columns: 1fr; } .playback { gap: 12px; } .now-playing-layout { justify-items: center; text-align: center; } .now-playing-details { justify-items: center; } .favorite-control { position: absolute; top: 10px; right: 10px; } .top-menu { left: 25%; } .flyout { width: min(100%, 440px); } }
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
  players?: MusicAssistantPlayer[];
  selectedPlayerIds?: string[];
}

interface PlaylistState {
  loading: boolean;
  error?: string;
  playlists?: MusicAssistantPlaylist[];
  creating?: boolean;
}

type PrimaryView = 'now-playing' | 'search';
type FlyoutKind = 'queue' | 'speakers' | 'volume' | 'playlist';

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
  private sessionIdentity?: { callWS?: HomeAssistant['callWS']; callService: HomeAssistant['callService'] };
  private musicAssistantIngress?: string;
  private ingressLoading = false;
  private musicAssistantPlayerId?: string;
  private musicAssistantCurrentMedia?: MusicAssistantPlayer['current_media'];
  private speakerState: SpeakerState = { loading: false };
  private playlistState: PlaylistState = { loading: false };
  private uiState: CardUiState = { primaryView: 'now-playing', activeFlyout: null, clearQueueConfirmOpen: false };

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
    const providedConfig = Object.fromEntries(Object.entries(config).filter(([key]) => key !== 'type' && !key.startsWith('music_assistant_')));
    this.config = { type: CARD_TAG, layout: 'two-column', show_search: true, show_queue: true, click_action: 'play', ...providedConfig, player: config.player.trim(), config_entry_id: typeof config.config_entry_id === 'string' ? config.config_entry_id.trim() : '' };
    if (previousConfig && previousConfig.player !== this.config.player) {
      this.mediaRequested = false;
      this.queueRequested = false;
      this.browseState = { loading: false, path: [] };
      this.queueState = { loading: false };
      this.searchState = { query: '', loading: false };
      this.invalidateRequests();
      this.musicAssistantIngress = undefined;
      this.ingressLoading = false;
      this.musicAssistantPlayerId = undefined;
      this.musicAssistantCurrentMedia = undefined;
      this.speakerState = { loading: false };
      this.playlistState = { loading: false };
      this.uiState = { primaryView: 'now-playing', activeFlyout: null, clearQueueConfirmOpen: false };
    }
    this.render();
  }

  disconnectedCallback(): void {
    this.needsReconnectLoad = true;
    this.mediaRequested = false;
    this.queueRequested = false;
    this.lifecycleId += 1;
    this.musicAssistantIngress = undefined;
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
    if (sessionChanged) this.musicAssistantIngress = undefined;
    if (!this.musicAssistantIngress) {
      void this.discoverIngress();
      this.render();
      return;
    }
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
    if (!this._hass || !this.config || !this.musicAssistantIngress) return;
    const requestId = ++this.mediaRequestId;
    const lifecycleId = this.lifecycleId;
    this.browseState = { loading: true, path };
    this.render();
    try {
      const items = await browseMusicAssistant(this.getMusicAssistantTransport(), mediaContentId === ROOT_MEDIA_ID ? undefined : mediaContentId);
      const response: MediaBrowseResponse = {
        media_content_id: mediaContentId,
        media_content_type: 'music',
        title: path.at(-1)?.title ?? 'Music Assistant',
        children: items.map(toMediaItem),
      };
      if (requestId !== this.mediaRequestId || lifecycleId !== this.lifecycleId) return;
      this.browseState = { loading: false, response, path };
    } catch (error) {
      if (requestId !== this.mediaRequestId || lifecycleId !== this.lifecycleId) return;
      this.browseState = { loading: false, path, error: error instanceof Error ? error.message : 'Unable to load media.' };
    }
    this.render();
  }

  private async loadQueue(): Promise<void> {
    if (!this._hass || !this.config || !this.musicAssistantIngress) return;
    const requestId = ++this.queueRequestId;
    const lifecycleId = this.lifecycleId;
    this.queueState = { loading: true };
    this.render();
    try {
      const transport = this.getMusicAssistantTransport();
      const players = await getMusicAssistantPlayers(transport);
      const player = resolveMusicAssistantPlayer(
        players,
        this.config.player,
        this._hass.states[this.config.player],
      );
      if (!player) throw new Error('Unable to map the configured Home Assistant player to Music Assistant.');
      this.musicAssistantPlayerId = player.player_id;
      this.musicAssistantCurrentMedia = player.current_media;
      const queue = await getActiveMusicAssistantQueue(transport, player.player_id);
      const items = await getMusicAssistantQueueItems(transport, queue.queue_id);
      const details: QueueDetails = {
        queue_id: queue.queue_id,
        active: queue.active,
        name: queue.display_name,
        current_index: queue.current_index ?? undefined,
        shuffle_enabled: queue.shuffle_enabled,
        repeat_mode: queue.repeat_mode,
        items,
      };
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
    if (!this.musicAssistantIngress) {
      this.root.innerHTML = `<style>${cardStyles}</style><section class="card" aria-label="Music Assistant"><div class="state"><p>${this.ingressLoading ? 'Connecting to Music Assistant through Home Assistant...' : 'Music Assistant ingress is unavailable.'}</p>${this.operationError ? `<p class="state error" role="alert">${escapeHtml(this.operationError)}</p>` : ''}</div></section>`;
      return;
    }
    const currentTitle = this.browseState.response?.title ?? 'Media sources';
    const mediaItems = this.browseState.response?.children ?? [];
    const player = this._hass?.states[this.config.player];
    const searchInput = this.root.querySelector<HTMLInputElement>('[data-search]');
    const preserveSearchFocus = this.root.activeElement === searchInput;
    const searchSelection = searchInput ? [searchInput.selectionStart, searchInput.selectionEnd] : [null, null];

    const primary = this.uiState.primaryView === 'search'
      ? `<section class="search-screen primary-view" data-primary-view="search" aria-labelledby="search-title"><div class="primary-header"><h1 class="panel-title" id="search-title">Search and browse</h1><button class="control" data-control="discover" type="button" aria-label="Close search" title="Close search"><ha-icon icon="mdi:close"></ha-icon></button></div>${this.config.show_search ? this.renderSearch() : ''}<div class="search-layout"><section class="search-navigation" aria-label="Browse navigation"><p class="panel-copy">Browse providers, folders, playlists, albums, and artists.</p>${this.renderPath()}</section><section class="search-results" aria-labelledby="library-title"><div class="panel-header"><h2 class="panel-title" id="library-title">${this.searchState.query ? 'Search results' : escapeHtml(currentTitle)}</h2><span class="path">${this.searchState.query ? `${this.searchResultCount()} results` : `${mediaItems.length} items`}</span></div>${this.searchState.query ? this.renderSearchResults() : this.renderMediaList(mediaItems)}</section></div></section>`
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
    return `<nav class="top-menu" aria-label="Music controls"><button class="control menu-action" data-control="speaker" type="button" aria-label="Choose speaker" title="Choose speaker"><ha-icon icon="mdi:speaker"></ha-icon><span class="menu-label">${escapeHtml(speaker)}</span></button><button class="control menu-action" data-control="queue" type="button" aria-label="Open queue" title="Open queue"><ha-icon icon="mdi:playlist-music"></ha-icon></button><button class="control menu-action" data-control="playlist" type="button" aria-label="Add to playlist" title="Add to playlist"><ha-icon icon="mdi:playlist-plus"></ha-icon></button><button class="control menu-action" data-control="discover" type="button" aria-label="${this.uiState.primaryView === 'search' ? 'Close search' : 'Open search'}" title="${this.uiState.primaryView === 'search' ? 'Close search' : 'Open search'}"><ha-icon icon="mdi:${this.uiState.primaryView === 'search' ? 'close' : 'magnify'}"></ha-icon></button></nav>`;
  }

  private renderActiveFlyout(): string {
    if (!this.uiState.activeFlyout) return '';
    const title = this.uiState.activeFlyout === 'queue' ? 'Queue' : this.uiState.activeFlyout === 'speakers' ? 'Speakers' : this.uiState.activeFlyout === 'playlist' ? 'Add to playlist' : 'Volume';
    const body = this.uiState.activeFlyout === 'queue' ? this.renderQueue() : this.uiState.activeFlyout === 'speakers' ? this.renderSpeakerSheet() : this.uiState.activeFlyout === 'playlist' ? this.renderPlaylistSheet() : this.renderVolumeFlyout();
    const confirmation = this.uiState.clearQueueConfirmOpen ? '<div class="confirm-backdrop"><section class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="clear-queue-title"><h2 class="panel-title" id="clear-queue-title">Clear queue?</h2><p class="panel-copy">This removes all queued items.</p><div class="confirm-actions"><button class="control" data-control="clear-queue-cancel" type="button">Cancel</button><button class="control danger" data-control="clear-queue-confirm" type="button">Clear queue</button></div></section></div>' : '';
    return `<button class="flyout-backdrop" data-control="close-flyout" type="button" aria-label="Close ${title}"></button><aside class="flyout" data-flyout="${this.uiState.activeFlyout}" aria-label="${title}"><div class="flyout-header"><h2 class="panel-title">${title}</h2><button class="control" data-control="close-flyout" type="button" aria-label="Close ${title}" title="Close"><ha-icon icon="mdi:close"></ha-icon></button></div><div class="flyout-body">${body}</div></aside>${confirmation}`;
  }

  private renderVolumeFlyout(): string {
    const attributes = this.config ? this._hass?.states[this.config.player]?.attributes ?? {} : {};
    const volume = Math.max(0, Math.min(100, Math.round(Number(attributes.volume_level ?? 0) * 100)));
    return `<div class="volume-flyout-body"><output data-volume-value>${volume}%</output><input class="volume-slider-flyout" data-volume type="range" min="0" max="100" value="${volume}" aria-label="Volume"><span class="volume-scale"><span>100</span><span>0</span></span></div>`;
  }

  private getSpeakerLabel(): string {
    const configuredName = this.config ? this._hass?.states[this.config.player]?.attributes.friendly_name : undefined;
    if (typeof configuredName === 'string' && configuredName.trim()) return configuredName.trim();
    return this.musicAssistantPlayerId ?? 'Speaker';
  }

  private renderPlayback(player?: { state: string; attributes: Record<string, unknown> }): string {
    return this.renderNowPlaying(player);
  }

  private renderNowPlaying(player?: { state: string; attributes: Record<string, unknown> }): string {
    const attributes = player?.attributes ?? {};
    const title = player ? String(attributes.media_title ?? 'Nothing playing') : 'Player unavailable';
    const artist = player ? String(attributes.media_artist ?? attributes.media_album_name ?? 'Choose a song to start playback') : 'The configured entity is not available';
    const image = typeof attributes.entity_picture === 'string' ? attributes.entity_picture : undefined;
    const isPlaying = player?.state === 'playing';
    const position = Number(attributes.media_position ?? 0);
    const duration = Number(attributes.media_duration ?? 0);
    const repeat = String(attributes.repeat ?? 'off').toLowerCase();
    const favorite = this.musicAssistantCurrentMedia?.is_favorite === true;
    const favoriteAvailable = !favorite || (this.musicAssistantCurrentMedia?.library_item_id !== undefined && !!this.musicAssistantCurrentMedia?.media_type);
    const repeatIcon = repeat === 'one' ? 'repeat-once' : repeat === 'all' ? 'repeat' : 'repeat-off';
    const repeatClass = repeat === 'off' ? 'muted' : 'active';
    return `<section class="playback" aria-label="Now playing"><div class="now-playing-layout"><span class="now-playing-art">${image ? `<img src="${escapeHtml(image)}" alt="">` : '<ha-icon icon="mdi:music-note"></ha-icon>'}</span><div class="now-playing-details"><span class="playback-state">${isPlaying ? 'Now playing' : 'Paused'}</span><span class="now-playing-title">${escapeHtml(title)}</span><span class="now-playing-subtitle">${escapeHtml(artist)}</span></div><button class="control favorite-control" data-control="favorite" type="button" aria-pressed="${favorite}" aria-label="${favorite ? 'Remove from favorites' : 'Add to favorites'}" ${favoriteAvailable ? '' : 'disabled'}><ha-icon icon="mdi:${favorite ? 'heart' : 'heart-outline'}"></ha-icon></button></div><div class="timeline"><span>${formatDuration(position)}</span><input class="progress" data-seek type="range" min="0" max="${duration || 1}" value="${Math.min(position, duration || 1)}" aria-label="Playback position"><span>${formatDuration(duration)}</span></div><div class="controls now-playing-controls"><button class="control primary" data-control="play-pause" type="button" aria-label="${isPlaying ? 'Pause' : 'Play'}"><ha-icon icon="mdi:${isPlaying ? 'pause' : 'play'}"></ha-icon></button><button class="control" data-control="next" type="button" aria-label="Next track"><ha-icon icon="mdi:skip-next"></ha-icon></button><button class="control repeat-control ${repeatClass}" data-control="repeat" type="button" aria-label="Change repeat mode" aria-pressed="${repeat !== 'off'}"><ha-icon icon="mdi:${repeatIcon}"></ha-icon></button><button class="control" data-control="volume" type="button" aria-label="Open volume" title="Open volume"><ha-icon icon="mdi:volume-high"></ha-icon></button></div></section>`;
  }

  private renderSpeakerSheet(): string {
    if (!this.speakerState.players && !this.speakerState.loading && !this.speakerState.error) return '';
    if (this.speakerState.loading) return '<section class="speaker-sheet" aria-label="Speakers"><p class="state">Loading speakers...</p></section>';
    if (this.speakerState.error) return `<section class="speaker-sheet" aria-label="Speakers"><p class="state error">${escapeHtml(this.speakerState.error)}</p></section>`;
    const currentId = this.musicAssistantPlayerId;
    const selectedIds = new Set(this.speakerState.selectedPlayerIds ?? (currentId ? [currentId] : []));
    const players = sortMusicAssistantPlayers(getEligibleMusicAssistantPlayers(this.speakerState.players ?? []), currentId);
    return `<section class="speaker-sheet" aria-label="Speakers"><div class="speaker-actions"><span class="panel-copy">Select speakers for playback</span><span class="row-actions"><button class="control" data-speaker-action="cancel" type="button">Cancel</button><button class="control primary" data-speaker-action="apply" type="button">Apply</button></span></div><div class="speaker-list">${players.map((player) => `<div class="speaker-row${selectedIds.has(player.player_id) ? ' selected' : ''}"><button class="control speaker-select" data-speaker-id="${escapeHtml(player.player_id)}" type="button" aria-pressed="${selectedIds.has(player.player_id)}"><span class="media-copy"><span class="media-title">${escapeHtml(player.name)}</span><span class="media-meta">${player.player_id === currentId ? 'Current speaker' : selectedIds.has(player.player_id) ? 'Selected' : 'Available'}</span></span></button>${player.player_id !== currentId ? '<span class="row-actions"><button class="control row-action" data-speaker-action="transfer" data-speaker-target="' + escapeHtml(player.player_id) + '" type="button" aria-label="Transfer playback" title="Transfer playback"><ha-icon icon="mdi:transfer"></ha-icon></button></span>' : ''}</div>`).join('')}</div></section>`;
  }

  private renderPlaylistSheet(): string {
    if (!this.playlistState.playlists && !this.playlistState.loading && !this.playlistState.error) return '';
    if (this.playlistState.loading) return '<section class="playlist-sheet" aria-label="Playlists"><p class="state">Loading playlists...</p></section>';
    if (this.playlistState.error) return `<section class="playlist-sheet" aria-label="Playlists"><p class="state error">${escapeHtml(this.playlistState.error)}</p></section>`;
    const playlists = (this.playlistState.playlists ?? []).filter((playlist) => playlist.is_editable !== false);
    return `<section class="playlist-sheet" aria-label="Playlists"><div class="panel-header"><h2 class="panel-title">Add to playlist</h2><button class="control" data-control="playlist" type="button" aria-label="Close playlists"><ha-icon icon="mdi:close"></ha-icon></button></div>${playlists.length ? `<div class="playlist-list">${playlists.map((playlist) => `<button class="control" data-playlist-id="${escapeHtml(playlist.item_id)}" type="button"><span class="media-copy"><span class="media-title">${escapeHtml(playlist.name)}</span><span class="media-meta">${escapeHtml(playlist.provider)}</span></span></button>`).join('')}</div>` : '<p class="state">No editable library playlists are available.</p>'}<div class="playlist-create"><input data-playlist-name type="text" placeholder="New playlist name" aria-label="New playlist name"><button class="control" data-playlist-create type="button" ${this.playlistState.creating ? 'disabled' : ''}>${this.playlistState.creating ? 'Creating...' : 'Create'}</button></div></section>`;
  }

  private renderQueue(): string {
    if (this.queueState.loading) return '<div class="queue"><h2 class="panel-title">Queue</h2><p class="state">Loading queue...</p></div>';
    if (this.queueState.error) return `<div class="queue"><h2 class="panel-title">Queue</h2><p class="state error">${escapeHtml(this.queueState.error)}</p></div>`;
    const items = this.queueState.details?.items ?? [];
    const shuffleEnabled = this.queueState.details?.shuffle_enabled === true;
    const header = `<div class="panel-header"><h2 class="panel-title">Queue</h2><span class="queue-header-actions"><button class="queue-action" data-control="clear-queue-request" type="button" aria-label="Clear queue" title="Clear queue"><ha-icon icon="mdi:close"></ha-icon></button><button class="queue-action${shuffleEnabled ? ' active' : ''}" data-control="shuffle" type="button" aria-pressed="${shuffleEnabled}" aria-label="Toggle shuffle" title="Toggle shuffle"><ha-icon icon="mdi:shuffle"></ha-icon></button></span></div>`;
    if (items.length === 0) return `<div class="queue">${header}<p class="state">Queue is empty.</p></div>`;
    const currentIndex = this.queueState.details?.current_index ?? -1;
    return `<div class="queue">${header}<div class="queue-list">${items.map((item, index) => this.renderQueueItem(item, index, index === currentIndex)).join('')}</div></div>`;
  }

  private renderQueueItem(item: QueueItem, index: number, current: boolean): string {
    const metadata = [item.artist, item.album].filter(Boolean).join(' · ');
    return `<div class="queue-row${current ? ' current' : ''}"><span class="media-copy"><span class="media-title">${escapeHtml(String(item.name ?? 'Untitled'))}</span><span class="media-meta">${escapeHtml(metadata || 'Queue item')}</span></span><button class="queue-action" data-queue-index="${index}" type="button">Play</button></div>`;
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
    if (!this._hass || !this.musicAssistantIngress || !query.trim()) {
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
      const response = toSearchResponse(await searchMusicAssistantApi(this.getMusicAssistantTransport(), normalizedQuery, { limit: 12 }));
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
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-speaker-action], [data-speaker-id], [data-playlist-id], [data-playlist-create], [data-item-action], [data-item-index], [data-search-uri], [data-path-index], [data-path-root], [data-path-back], [data-control], [data-queue-index]') : null;
      if (!target) return;
      if (target.dataset.speakerId) {
        const selected = new Set(this.speakerState.selectedPlayerIds ?? (this.musicAssistantPlayerId ? [this.musicAssistantPlayerId] : []));
        if (target.dataset.speakerId === this.musicAssistantPlayerId) return;
        if (selected.has(target.dataset.speakerId)) selected.delete(target.dataset.speakerId);
        else selected.add(target.dataset.speakerId);
        this.speakerState.selectedPlayerIds = [...selected];
        this.render();
      } else if (target.dataset.speakerAction) {
        if (target.dataset.speakerAction === 'cancel') {
          this.resetSpeakerSelection();
          this.uiState.activeFlyout = null;
          this.render();
          return;
        }
        if (target.dataset.speakerAction === 'apply') {
          void this.runAction(() => this.applySpeakerSelection());
          return;
        }
        const targetPlayerId = target.dataset.speakerTarget;
        if (!targetPlayerId) return;
        void this.runAction(() => this.runSpeakerAction(target.dataset.speakerAction ?? '', targetPlayerId));
      } else if (target.dataset.playlistId) {
        void this.runAction(() => this.addCurrentItemToPlaylist(target.dataset.playlistId ?? ''));
      } else if (target.dataset.playlistCreate !== undefined) {
        const name = this.root.querySelector<HTMLInputElement>('[data-playlist-name]')?.value.trim() ?? '';
        if (name) void this.runAction(() => this.createPlaylistAndAddCurrentItem(name));
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
          const { queueId } = await this.getNativeControlContext();
          await playMusicAssistantQueueItem(this.getMusicAssistantTransport(), queueId, index);
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
      if (target.matches('[data-volume]')) {
        const value = this.root.querySelector<HTMLOutputElement>('[data-volume-value]');
        if (value) value.textContent = `${target.value}%`;
        return;
      }
      if (!target.matches('[data-search]')) return;
      this.clearSearchTimer();
      this.searchTimer = setTimeout(() => void this.runSearch(target.value), 350);
    });
    this.root.addEventListener('change', (event) => {
      const target = event.target as HTMLInputElement;
      if (target.matches('[data-seek]')) void this.runAction(async () => {
        const { queueId } = await this.getNativeControlContext();
        await seekMusicAssistantQueue(this.getMusicAssistantTransport(), queueId, Number(target.value));
      });
      if (target.matches('[data-volume]')) void this.runAction(async () => {
        const { playerId } = await this.getNativeControlContext();
        await setMusicAssistantVolume(this.getMusicAssistantTransport(), playerId, Number(target.value));
      });
    });
  }

  private async loadSpeakers(): Promise<void> {
    this.speakerState = { loading: true };
    this.render();
    try {
      const players = await getMusicAssistantPlayers(this.getMusicAssistantTransport());
      const currentPlayer = players.find((player) => player.player_id === this.musicAssistantPlayerId);
      const selectedPlayerIds = currentPlayer ? [...new Set([currentPlayer.player_id, ...(currentPlayer.group_members ?? []), ...(currentPlayer.synced_to ? [currentPlayer.synced_to] : [])])] : [];
      this.speakerState = { loading: false, players, selectedPlayerIds };
    } catch (error) {
      this.speakerState = { loading: false, error: error instanceof Error ? error.message : 'Unable to load speakers.' };
    }
    this.render();
  }

  private async runSpeakerAction(action: string, targetPlayerId: string): Promise<void> {
    const { playerId: sourcePlayerId, queueId: sourceQueueId } = await this.getNativeControlContext();
    const transport = this.getMusicAssistantTransport();
    if (action === 'group') {
      await addMusicAssistantPlayerToGroup(transport, sourcePlayerId, targetPlayerId);
    } else if (action === 'transfer') {
      const targetQueue = await getActiveMusicAssistantQueue(transport, targetPlayerId);
      await transferMusicAssistantQueue(transport, sourceQueueId, targetQueue.queue_id, true);
    }
    await this.loadQueue();
    await this.loadSpeakers();
  }

  private resetSpeakerSelection(): void {
    const currentPlayer = this.speakerState.players?.find((player) => player.player_id === this.musicAssistantPlayerId);
    this.speakerState.selectedPlayerIds = currentPlayer ? [...new Set([currentPlayer.player_id, ...(currentPlayer.group_members ?? []), ...(currentPlayer.synced_to ? [currentPlayer.synced_to] : [])])] : [];
  }

  private async applySpeakerSelection(): Promise<void> {
    const currentId = this.musicAssistantPlayerId;
    if (!currentId) throw new Error('The current Music Assistant speaker is unavailable.');
    const currentPlayer = this.speakerState.players?.find((player) => player.player_id === currentId);
    const existing = new Set([currentId, ...(currentPlayer?.group_members ?? []), ...(currentPlayer?.synced_to ? [currentPlayer.synced_to] : [])]);
    const selected = new Set(this.speakerState.selectedPlayerIds ?? [currentId]);
    const additions = [...selected].filter((playerId) => playerId !== currentId && !existing.has(playerId));
    const removals = [...existing].filter((playerId) => playerId !== currentId && !selected.has(playerId));
    const transport = this.getMusicAssistantTransport();
    for (const playerId of additions) await addMusicAssistantPlayerToGroup(transport, currentId, playerId);
    if (removals.length === 1) await removeMusicAssistantPlayerFromGroup(transport, removals[0]);
    if (removals.length > 1) await removeMusicAssistantPlayersFromGroup(transport, removals);
    await this.loadQueue();
    await this.loadSpeakers();
    this.uiState.activeFlyout = null;
    this.render();
  }

  private async loadPlaylists(): Promise<void> {
    this.playlistState = { loading: true };
    this.render();
    try {
      const playlists = await listMusicAssistantPlaylists(this.getMusicAssistantTransport(), { limit: 50 });
      this.playlistState = { loading: false, playlists };
    } catch (error) {
      this.playlistState = { loading: false, error: error instanceof Error ? error.message : 'Unable to load playlists.' };
    }
    this.render();
  }

  private getCurrentQueueUri(): string {
    const currentIndex = this.queueState.details?.current_index;
    const currentItem = currentIndex === undefined ? undefined : this.queueState.details?.items?.[currentIndex];
    if (!currentItem?.uri) throw new Error('The current item has no Music Assistant URI for playlist actions.');
    return currentItem.uri;
  }

  private async addCurrentItemToPlaylist(playlistId: string): Promise<void> {
    if (!playlistId) throw new Error('A playlist is required.');
    await addMusicAssistantPlaylistTracks(this.getMusicAssistantTransport(), playlistId, [this.getCurrentQueueUri()]);
    this.operationError = undefined;
    this.uiState.activeFlyout = null;
    this.render();
  }

  private async createPlaylistAndAddCurrentItem(name: string): Promise<void> {
    this.playlistState = { ...this.playlistState, creating: true };
    this.render();
    try {
      const playlist = await createMusicAssistantPlaylist(this.getMusicAssistantTransport(), name);
      await addMusicAssistantPlaylistTracks(this.getMusicAssistantTransport(), playlist.item_id, [this.getCurrentQueueUri()]);
      this.operationError = undefined;
      this.playlistState = { loading: false, playlists: [...(this.playlistState.playlists ?? []), playlist] };
    } catch (error) {
      this.playlistState = { ...this.playlistState, creating: false, error: error instanceof Error ? error.message : 'Unable to create playlist.' };
      throw error;
    }
    this.uiState.activeFlyout = null;
    this.render();
  }

  private async handleControl(control: string): Promise<void> {
    if (control === 'discover') {
      this.uiState.primaryView = this.uiState.primaryView === 'search' ? 'now-playing' : 'search';
      this.uiState.activeFlyout = null;
      this.uiState.clearQueueConfirmOpen = false;
      if (this.uiState.primaryView === 'search' && this.musicAssistantIngress && !this.mediaRequested) {
        this.mediaRequested = true;
        void this.loadMedia(ROOT_MEDIA_ID, []);
      }
      this.render();
      return;
    }
    if (control === 'close-flyout') {
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
      const { queueId } = await this.getNativeControlContext();
      await clearMusicAssistantQueue(this.getMusicAssistantTransport(), queueId);
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
        this.speakerState = this.uiState.activeFlyout ? this.speakerState : { loading: false };
        this.render();
      } else {
        this.uiState.activeFlyout = 'speakers';
        void this.loadSpeakers();
      }
      return;
    }
    if (control === 'playlist') {
      if (this.playlistState.playlists || this.playlistState.loading || this.playlistState.error) {
        this.uiState.activeFlyout = this.uiState.activeFlyout === 'playlist' ? null : 'playlist';
        this.playlistState = this.uiState.activeFlyout ? this.playlistState : { loading: false };
        this.render();
      } else {
        this.uiState.activeFlyout = 'playlist';
        void this.loadPlaylists();
      }
      return;
    }
    if (control === 'favorite') {
      const { playerId } = await this.getNativeControlContext();
      const media = this.musicAssistantCurrentMedia;
      if (media?.is_favorite === true) {
        if (media.library_item_id === undefined || !media.media_type) throw new Error('Music Assistant did not provide a removable library identity for this favorite.');
        await removeMusicAssistantFavorite(this.getMusicAssistantTransport(), media.media_type, media.library_item_id);
      } else {
        await addCurrentMusicAssistantItemToFavorites(this.getMusicAssistantTransport(), playerId);
      }
      await this.loadQueue();
      return;
    }
    const context = await this.getNativeControlContext();
    if (control === 'play-pause') await toggleMusicAssistantQueuePlayback(this.getMusicAssistantTransport(), context.queueId);
    if (control === 'next') await advanceMusicAssistantQueue(this.getMusicAssistantTransport(), context.queueId);
    if (control === 'shuffle') {
      const state = this._hass?.states[this.config?.player ?? ''];
      await setMusicAssistantShuffle(this.getMusicAssistantTransport(), context.queueId, !Boolean(state?.attributes.shuffle));
    }
    if (control === 'repeat') {
      const state = String(this._hass?.states[this.config?.player ?? '']?.attributes.repeat ?? 'off');
      const next = state === 'off' ? 'all' : state === 'all' ? 'one' : 'off';
      await setMusicAssistantRepeat(this.getMusicAssistantTransport(), context.queueId, next);
    }
    if (control === 'clear-queue') {
      this.uiState.clearQueueConfirmOpen = true;
      this.render();
    }
  }

  private async discoverIngress(): Promise<void> {
    if (!this._hass || this.musicAssistantIngress || this.ingressLoading) return;
    this.ingressLoading = true;
    this.operationError = undefined;
    this.render();
    try {
      this.musicAssistantIngress = await resolveMusicAssistantIngress(this._hass);
      if (this.uiState.primaryView === 'search' && !this.mediaRequested) {
        this.mediaRequested = true;
        void this.loadMedia(ROOT_MEDIA_ID, []);
      }
      if (this.config?.show_queue && !this.queueRequested) {
        this.queueRequested = true;
        void this.loadQueue();
      }
    } catch (error) {
      this.operationError = error instanceof Error ? error.message : 'Unable to discover Music Assistant ingress.';
    }
    this.ingressLoading = false;
    this.render();
  }

  private getMusicAssistantTransport() {
    if (!this.musicAssistantIngress) throw new Error('Music Assistant ingress is unavailable.');
    return createMusicAssistantHttpTransport(this.musicAssistantIngress);
  }

  private async getNativeControlContext(): Promise<{ playerId: string; queueId: string }> {
    if (!this.queueState.details?.queue_id) await this.loadQueue();
    const queueId = this.queueState.details?.queue_id;
    const playerId = this.musicAssistantPlayerId;
    if (!playerId || !queueId) throw new Error('Music Assistant queue is unavailable for this player.');
    return { playerId, queueId };
  }

  private async playMedia(mediaContentId: string, mediaContentType: string, option = this.config?.click_action === 'queue' ? 'add' : 'replace'): Promise<void> {
    if (!this._hass || !this.config || !this.musicAssistantIngress) return;
    if (!this.queueState.details?.queue_id) await this.loadQueue();
    const queueId = this.queueState.details?.queue_id;
    if (!queueId) throw new Error('Music Assistant queue is unavailable for this player.');
    await playMusicAssistantMedia(this.getMusicAssistantTransport(), queueId, mediaContentId, option as 'play' | 'replace' | 'add');
    if (option !== 'add' && mediaContentType === 'playlist') {
      await setMusicAssistantShuffle(this.getMusicAssistantTransport(), queueId, true);
    }
    if (option === 'add' || this.config.click_action === 'queue') await this.loadQueue();
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

function toMediaItem(item: MusicAssistantMediaItem): MediaItem {
  const mediaContentId = item.path ?? item.uri ?? item.item_id ?? '';
  const canExpand = Array.isArray(item.items) || item.media_type === 'folder';
  return {
    media_content_id: mediaContentId,
    media_content_type: item.media_type ?? 'music',
    title: item.name,
    thumbnail: item.image?.path,
    can_play: item.is_playable ?? !canExpand,
    can_expand: canExpand,
    children: item.items?.map(toMediaItem),
    artist: item.subtitle ?? undefined,
  };
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

function toSearchResponse(results: Record<string, MusicAssistantMediaItem[] | undefined>): SearchResponse {
  const groups: SearchGroup[] = ['artists', 'albums', 'tracks', 'playlists', 'radio', 'audiobooks', 'podcasts'];
  return Object.fromEntries(groups.flatMap((group) => {
    const items = results[group];
    return Array.isArray(items) ? [[group, items.map((item) => ({
      name: item.name,
      uri: item.uri ?? item.path ?? item.item_id ?? '',
      path: item.path,
      media_type: item.media_type,
      is_playable: item.is_playable,
      can_expand: Array.isArray(item.items) || item.media_type === 'folder' || item.media_type === 'album' || item.media_type === 'podcast',
      children: item.items?.map((child) => ({ name: child.name, uri: child.uri ?? child.path ?? child.item_id ?? '', media_type: child.media_type })),
      image: item.image?.path,
      provider: item.provider,
      album: item.subtitle ?? undefined,
    }))]] : [];
  })) as SearchResponse;
}

if (!customElements.get(CARD_TAG)) customElements.define(CARD_TAG, MusicAssistantCard);
window.customCards = window.customCards ?? [];
if (!window.customCards.some((card) => card.type === CARD_TAG)) window.customCards.push({ type: CARD_TAG, name: 'Echo Show Music Assistant Card', description: 'Browse and control Music Assistant from Home Assistant.', preview: true });

declare global {
  interface Window { customCards?: Array<{ type: string; name: string; description: string; preview?: boolean }> }
}
