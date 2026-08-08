export type MusicAssistantMediaType =
  | 'artist'
  | 'album'
  | 'track'
  | 'playlist'
  | 'radio'
  | 'audiobook'
  | 'podcast'
  | 'podcast_episode'
  | 'folder'
  | 'genre'
  | 'audio_source'
  | 'announcement'
  | 'flow_stream'
  | 'plugin_source'
  | 'sound_effect'
  | 'unknown';

export type MusicAssistantQueueOption = 'play' | 'replace' | 'next' | 'replace_next' | 'add';

export interface MusicAssistantCommand<T = unknown> {
  command: string;
  args: Record<string, unknown>;
  result?: T;
}

export interface MusicAssistantTransport {
  command<T>(command: string, args?: Record<string, unknown>): Promise<T>;
}

export interface MusicAssistantMediaItem {
  item_id?: string;
  provider?: string;
  name: string;
  uri?: string;
  media_type?: MusicAssistantMediaType | string;
  is_playable?: boolean;
  image?: { path?: string; provider?: string; remotely_accessible?: boolean } | null;
  subtitle?: string | null;
  path?: string;
  items?: MusicAssistantMediaItem[];
}

export interface MusicAssistantSearchResults {
  [group: string]: MusicAssistantMediaItem[] | undefined;
}

export interface MusicAssistantPlayer {
  player_id: string;
  name: string;
  available?: boolean;
  enabled?: boolean;
  hide_in_ui?: boolean;
  supported_features?: string[];
  synced_to?: string | null;
  group_members?: string[];
  current_media?: {
    uri?: string;
    media_type?: string;
    library_item_id?: string | number;
    is_favorite?: boolean;
    title?: string | null;
    artist?: string | null;
    album?: string | null;
  } | null;
}

export interface MusicAssistantQueue {
  queue_id: string;
  active?: boolean;
  display_name?: string;
  current_index?: number | null;
  shuffle_enabled?: boolean;
  repeat_mode?: string;
}

export interface MusicAssistantQueueItem {
  name?: string;
  uri?: string;
  media_type?: string;
  artist?: string;
  album?: string;
  image?: string;
}

export interface MusicAssistantPlaylist extends MusicAssistantMediaItem {
  item_id: string;
  provider: string;
  is_editable?: boolean;
}

export function browseMusicAssistant(transport: MusicAssistantTransport, path?: string): Promise<MusicAssistantMediaItem[]> {
  return transport.command<MusicAssistantMediaItem[]>('music/browse', path ? { path } : {});
}

export function searchMusicAssistantApi(
  transport: MusicAssistantTransport,
  searchQuery: string,
  options: { mediaTypes?: MusicAssistantMediaType[]; limit?: number; libraryOnly?: boolean } = {},
): Promise<MusicAssistantSearchResults> {
  return transport.command<MusicAssistantSearchResults>('music/search', {
    search_query: searchQuery,
    ...(options.mediaTypes ? { media_types: options.mediaTypes } : {}),
    ...(options.limit === undefined ? {} : { limit: options.limit }),
    ...(options.libraryOnly === undefined ? {} : { library_only: options.libraryOnly }),
  });
}

export function getMusicAssistantPlayers(transport: MusicAssistantTransport): Promise<MusicAssistantPlayer[]> {
  return transport.command<MusicAssistantPlayer[]>('players/all', {});
}

export function getActiveMusicAssistantQueue(transport: MusicAssistantTransport, playerId: string): Promise<MusicAssistantQueue> {
  return transport.command<MusicAssistantQueue>('player_queues/get_active_queue', { player_id: playerId });
}

export function getMusicAssistantQueueItems(transport: MusicAssistantTransport, queueId: string): Promise<MusicAssistantQueueItem[]> {
  return transport.command<MusicAssistantQueueItem[]>('player_queues/items', { queue_id: queueId });
}

export function playMusicAssistantMedia(
  transport: MusicAssistantTransport,
  queueId: string,
  media: string | MusicAssistantMediaItem | Array<string | MusicAssistantMediaItem>,
  option: MusicAssistantQueueOption,
): Promise<null> {
  return transport.command<null>('player_queues/play_media', { queue_id: queueId, media, option });
}

export function setMusicAssistantShuffle(transport: MusicAssistantTransport, queueId: string, enabled: boolean): Promise<null> {
  return transport.command<null>('player_queues/shuffle', { queue_id: queueId, shuffle_enabled: enabled });
}

export function toggleMusicAssistantQueuePlayback(transport: MusicAssistantTransport, queueId: string): Promise<null> {
  return transport.command<null>('player_queues/play_pause', { queue_id: queueId });
}

export function advanceMusicAssistantQueue(transport: MusicAssistantTransport, queueId: string): Promise<null> {
  return transport.command<null>('player_queues/next', { queue_id: queueId });
}

export function setMusicAssistantRepeat(transport: MusicAssistantTransport, queueId: string, repeatMode: string): Promise<null> {
  return transport.command<null>('player_queues/repeat', { queue_id: queueId, repeat_mode: repeatMode });
}

export function seekMusicAssistantQueue(transport: MusicAssistantTransport, queueId: string, position: number): Promise<null> {
  return transport.command<null>('player_queues/seek', { queue_id: queueId, position });
}

export function clearMusicAssistantQueue(transport: MusicAssistantTransport, queueId: string): Promise<null> {
  return transport.command<null>('player_queues/clear', { queue_id: queueId });
}

export function setMusicAssistantVolume(transport: MusicAssistantTransport, playerId: string, volumeLevel: number): Promise<null> {
  return transport.command<null>('players/cmd/volume_set', { player_id: playerId, volume_level: volumeLevel });
}

export function transferMusicAssistantQueue(
  transport: MusicAssistantTransport,
  sourceQueueId: string,
  targetQueueId: string,
  autoPlay: boolean,
): Promise<null> {
  return transport.command<null>('player_queues/transfer', {
    source_queue_id: sourceQueueId,
    target_queue_id: targetQueueId,
    auto_play: autoPlay,
  });
}

export function addCurrentMusicAssistantItemToFavorites(transport: MusicAssistantTransport, playerId: string): Promise<null> {
  return transport.command<null>('players/add_currently_playing_to_favorites', { player_id: playerId });
}

export function removeMusicAssistantFavorite(transport: MusicAssistantTransport, mediaType: string, libraryItemId: string | number): Promise<null> {
  return transport.command<null>('music/favorites/remove_item', { media_type: mediaType, library_item_id: libraryItemId });
}

export function listMusicAssistantPlaylists(
  transport: MusicAssistantTransport,
  options: { search?: string; limit?: number; offset?: number } = {},
): Promise<MusicAssistantPlaylist[]> {
  return transport.command<MusicAssistantPlaylist[]>('music/playlists/library_items', {
    ...(options.search === undefined ? {} : { search: options.search }),
    ...(options.limit === undefined ? {} : { limit: options.limit }),
    ...(options.offset === undefined ? {} : { offset: options.offset }),
  });
}

export function createMusicAssistantPlaylist(
  transport: MusicAssistantTransport,
  name: string,
  provider?: string,
): Promise<MusicAssistantPlaylist> {
  return transport.command<MusicAssistantPlaylist>('music/playlists/create_playlist', {
    name,
    ...(provider ? { provider_instance_or_domain: provider } : {}),
  });
}

export function addMusicAssistantPlaylistTracks(transport: MusicAssistantTransport, playlistId: string, uris: string[]): Promise<unknown> {
  return transport.command('music/playlists/add_playlist_tracks', { db_playlist_id: playlistId, uris });
}

export function addMusicAssistantPlayerToGroup(transport: MusicAssistantTransport, playerId: string, targetPlayer: string): Promise<null> {
  return transport.command<null>('players/cmd/group', { player_id: playerId, target_player: targetPlayer });
}