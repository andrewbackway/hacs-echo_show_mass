import type { HomeAssistant, MusicAssistantCardConfig } from '../home-assistant';
import type { MediaItem } from '../music-assistant/media-browser';
import type { CardState } from './card-store';

/** Everything the action/business-logic functions need from the card, without depending on the class itself. */
export interface ActionContext {
  getHass(): HomeAssistant | undefined;
  getConfig(): MusicAssistantCardConfig | undefined;
  getState(): CardState;
  setState(patch: Partial<CardState>): void;
  isQueueRequested(): boolean;
  setQueueRequested(value: boolean): void;
  loadQueue(): Promise<void>;
  loadMedia(mediaContentId: string, path: MediaItem[]): Promise<void>;
  loadSpeakers(): Promise<void>;
  loadLibrary(append?: boolean): Promise<void>;
  getCurrentSpeakerSelection(): string[];
}

export async function callService(
  context: ActionContext,
  domain: string,
  service: string,
  data?: Record<string, unknown>,
  target?: Record<string, unknown>,
): Promise<void> {
  const hass = context.getHass();
  const config = context.getConfig();
  if (!hass || !config) throw new Error('Home Assistant is unavailable.');
  await hass.callService(domain, service, data, target ?? { entity_id: config.player }, true, false);
}

export async function playMedia(
  context: ActionContext,
  mediaContentId: string,
  mediaContentType: string,
  option?: string,
): Promise<void> {
  const config = context.getConfig();
  if (!context.getHass() || !config) return;
  const enqueue = option ?? (config.click_action === 'queue' ? 'add' : 'replace');
  await callService(
    context,
    'music_assistant',
    'play_media',
    { media_id: mediaContentId, media_type: mediaContentType, enqueue },
    { entity_id: config.player },
  );
  if (enqueue === 'add' || config.click_action === 'queue') await context.loadQueue();
}

export async function playQueueItem(context: ActionContext, queueItemId: string): Promise<void> {
  const player = context.getConfig()?.player;
  if (!player) throw new Error('The current Music Assistant player is unavailable.');
  await callService(context, 'mass_queue', 'play_queue_item', { entity: player, queue_item_id: queueItemId }, {});
  await context.loadQueue();
}

export async function runSpeakerAction(context: ActionContext, action: string, targetPlayerId: string): Promise<void> {
  if (action === 'transfer') {
    const sourcePlayer = context.getConfig()?.player;
    if (!sourcePlayer) throw new Error('The current Music Assistant speaker is unavailable.');
    await callService(
      context,
      'music_assistant',
      'transfer_queue',
      { source_player: sourcePlayer, auto_play: true },
      { entity_id: targetPlayerId },
    );
  }
  await context.loadQueue();
  await context.loadSpeakers();
}

export async function applySpeakerSelection(context: ActionContext): Promise<void> {
  const currentId = context.getConfig()?.player;
  if (!currentId) throw new Error('The current Music Assistant speaker is unavailable.');
  const existing = new Set(context.getCurrentSpeakerSelection());
  const selected = new Set(context.getState().speakerState.selectedPlayerIds ?? [currentId]);
  const additions = [...selected].filter((playerId) => playerId !== currentId && !existing.has(playerId));
  const removals = [...existing].filter((playerId) => playerId !== currentId && !selected.has(playerId));
  if (additions.length > 0)
    await callService(context, 'media_player', 'join', { group_members: additions }, { entity_id: currentId });
  if (removals.length > 0) await callService(context, 'media_player', 'unjoin', {}, { entity_id: removals });
  await context.loadQueue();
  await context.loadSpeakers();
  const uiState = context.getState().uiState;
  context.setState({ uiState: { ...uiState, activeFlyout: null } });
}

export async function handleControl(context: ActionContext, control: string): Promise<void> {
  const hass = context.getHass();
  const config = context.getConfig();
  if (control === 'discover') {
    const uiState = context.getState().uiState;
    context.setState({
      uiState: {
        primaryView: uiState.primaryView === 'search' ? 'now-playing' : 'search',
        activeFlyout: null,
        clearQueueConfirmOpen: false,
      },
    });
    if (context.getState().uiState.primaryView === 'search') void context.loadLibrary();
    return;
  }
  if (control.startsWith('library-category:')) {
    const category = control.slice('library-category:'.length);
    const state = context.getState();
    const libraryState = state.libraryState;
    const selectedCategory = libraryState.selectedCategory === category ? null : (category as typeof libraryState.selectedCategory);
    context.setState({
      libraryState: { ...libraryState, selectedCategory, query: '', items: [], offset: 0, hasMore: false, error: undefined },
    });
    if (selectedCategory) void context.loadLibrary();
    return;
  }
  if (control === 'library-load-more') {
    void context.loadLibrary(true);
    return;
  }
  if (control === 'close-flyout') {
    const state = context.getState();
    context.setState({
      uiState: { ...state.uiState, activeFlyout: null, clearQueueConfirmOpen: false },
      ...(state.uiState.activeFlyout === 'speakers'
        ? { speakerState: { ...state.speakerState, selectedPlayerIds: context.getCurrentSpeakerSelection() } }
        : {}),
    });
    return;
  }
  if (control === 'clear-queue-request') {
    context.setState({ uiState: { ...context.getState().uiState, clearQueueConfirmOpen: true } });
    return;
  }
  if (control === 'clear-queue-cancel') {
    context.setState({ uiState: { ...context.getState().uiState, clearQueueConfirmOpen: false } });
    return;
  }
  if (control === 'clear-queue-confirm') {
    await callService(context, 'media_player', 'clear_playlist');
    context.setState({ uiState: { ...context.getState().uiState, clearQueueConfirmOpen: false } });
    await context.loadQueue();
    return;
  }
  if (control === 'queue' || control === 'volume') {
    context.setState({ uiState: { ...context.getState().uiState, activeFlyout: control } });
    if (control === 'queue' && !context.isQueueRequested()) {
      context.setQueueRequested(true);
      void context.loadQueue();
    }
    return;
  }
  if (control === 'speaker') {
    const state = context.getState();
    if (state.speakerState.players || state.speakerState.loading || state.speakerState.error) {
      const opening = state.uiState.activeFlyout !== 'speakers';
      context.setState({
        uiState: { ...state.uiState, activeFlyout: opening ? 'speakers' : null },
        speakerState: opening ? state.speakerState : { loading: false },
      });
    } else {
      context.setState({ uiState: { ...state.uiState, activeFlyout: 'speakers' } });
      void context.loadSpeakers();
    }
    return;
  }
  if (control === 'play-pause')
    await callService(
      context,
      'media_player',
      hass?.states[config?.player ?? '']?.state === 'playing' ? 'media_pause' : 'media_play',
    );
  if (control === 'next') await callService(context, 'media_player', 'media_next_track');
  if (control === 'shuffle') {
    const playerState = hass?.states[config?.player ?? ''];
    await callService(context, 'media_player', 'shuffle_set', { shuffle: !playerState?.attributes.shuffle });
  }
  if (control === 'repeat') {
    const repeat = String(hass?.states[config?.player ?? '']?.attributes.repeat ?? 'off');
    const next = repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off';
    await callService(context, 'media_player', 'repeat_set', { repeat: next });
  }
  if (control === 'favorite') {
    const player = hass?.states[config?.player ?? ''];
    const mediaId = player?.attributes.media_content_id;
    if (typeof mediaId === 'string' && mediaId) {
      await callService(context, 'music_assistant', 'toggle_favorite', {
        media_id: mediaId,
        favorite: player.attributes.media_favorite !== true,
      });
    }
  }
  if (control === 'clear-queue') {
    context.setState({ uiState: { ...context.getState().uiState, clearQueueConfirmOpen: true } });
  }
}

export async function runAction(context: ActionContext, action: () => Promise<void>): Promise<void> {
  if (context.getState().operationError !== undefined) context.setState({ operationError: undefined });
  try {
    await action();
  } catch (error) {
    context.setState({ operationError: error instanceof Error ? error.message : 'The playback action failed.' });
  }
}
