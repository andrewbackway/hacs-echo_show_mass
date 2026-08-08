import { describe, expect, it, vi } from 'vitest';
import type { HomeAssistant } from '../home-assistant';
import {
  addCurrentMusicAssistantItemToFavorites,
  addMusicAssistantPlayerToGroup,
  addMusicAssistantPlaylistTracks,
  browseMusicAssistant,
  createMusicAssistantPlaylist,
  getActiveMusicAssistantQueue,
  getMusicAssistantPlayers,
  listMusicAssistantPlaylists,
  playMusicAssistantMedia,
  playMusicAssistantQueueItem,
  removeMusicAssistantPlayerFromGroup,
  removeMusicAssistantPlayersFromGroup,
  removeMusicAssistantFavorite,
  searchMusicAssistantApi,
  setMusicAssistantShuffle,
  transferMusicAssistantQueue,
  type MusicAssistantTransport,
} from './api';
import { browseMedia } from './media-browser';
import { getQueue } from './queue';
import { flattenSearchResults, searchMusicAssistant } from './search';
import { createMusicAssistantHttpTransport } from './transport';
import { getEligibleMusicAssistantPlayers, resolveMusicAssistantPlayer, sortMusicAssistantPlayers } from './players';

function createHass(callService = vi.fn(), callWS?: HomeAssistant['callWS']): HomeAssistant {
  return {
    states: {},
    callService,
    callWS,
  };
}

describe('Music Assistant adapters', () => {
  it('sends native MA HTTP commands through same-origin ingress without a bearer token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ value: [{ provider_id: 'homeassistant' }] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const transport = createMusicAssistantHttpTransport('/api/hassio_ingress/music-assistant/');

    await expect(transport.command('auth/providers')).resolves.toEqual([{ provider_id: 'homeassistant' }]);
    expect(fetchMock).toHaveBeenCalledWith('/api/hassio_ingress/music-assistant/api', expect.objectContaining({
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
    }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ command: 'auth/providers', args: {} });
    vi.unstubAllGlobals();
  });

  it('preserves plain-text and null ingress failures as useful errors', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('Internal server error', { status: 500 }))
      .mockResolvedValueOnce(new Response('null', { status: 500, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    const transport = createMusicAssistantHttpTransport('/api/hassio_ingress/music-assistant');

    await expect(transport.command('players/add_currently_playing_to_favorites')).rejects.toThrow('Internal server error');
    await expect(transport.command('player_queues/clear')).rejects.toThrow('Music Assistant request failed (500).');

    vi.unstubAllGlobals();
  });

  it('resolves MA players from explicit HA attributes or an unambiguous friendly name', () => {
    const players = [
      { player_id: 'ma-1', name: 'Living Room' },
      { player_id: 'ma-2', name: 'Kitchen' },
    ];
    expect(resolveMusicAssistantPlayer(players, 'media_player.living_room', {
      entity_id: 'media_player.living_room', state: 'paused', attributes: { music_assistant_player_id: 'ma-2' },
    })?.player_id).toBe('ma-2');
    expect(resolveMusicAssistantPlayer(players, 'media_player.living_room', {
      entity_id: 'media_player.living_room', state: 'paused', attributes: { friendly_name: 'Living Room' },
    })?.player_id).toBe('ma-1');
    expect(resolveMusicAssistantPlayer([{ player_id: 'ma-1', name: 'Living Room' }, { player_id: 'ma-2', name: 'Living Room' }], 'media_player.living_room', {
      entity_id: 'media_player.living_room', state: 'paused', attributes: { friendly_name: 'Living Room' },
    })).toBeUndefined();
  });

  it('filters unavailable speakers and puts the active group first', () => {
    const players = [
      { player_id: 'hidden', name: 'Hidden', hide_in_ui: true },
      { player_id: 'offline', name: 'Offline', available: false },
      { player_id: 'kitchen', name: 'Kitchen', synced_to: 'living' },
      { player_id: 'office', name: 'Office' },
      { player_id: 'living', name: 'Living', group_members: ['living', 'kitchen'] },
    ];
    const eligible = getEligibleMusicAssistantPlayers(players);
    expect(sortMusicAssistantPlayers(eligible, 'living').map((player) => player.player_id)).toEqual(['kitchen', 'living', 'office']);
  });

  it('builds the verified native browse and search commands', async () => {
    const command = vi.fn().mockResolvedValue([]);
    const transport: MusicAssistantTransport = { command };

    await browseMusicAssistant(transport);
    await browseMusicAssistant(transport, 'provider://demo');
    await searchMusicAssistantApi(transport, 'song', { mediaTypes: ['track', 'album'], limit: 12, libraryOnly: false });

    expect(command).toHaveBeenNthCalledWith(1, 'music/browse', {});
    expect(command).toHaveBeenNthCalledWith(2, 'music/browse', { path: 'provider://demo' });
    expect(command).toHaveBeenNthCalledWith(3, 'music/search', {
      search_query: 'song',
      media_types: ['track', 'album'],
      limit: 12,
      library_only: false,
    });
  });

  it('builds verified queue, speaker, favorite, and playlist commands', async () => {
    const command = vi.fn().mockResolvedValue({});
    const transport: MusicAssistantTransport = { command };

    await getMusicAssistantPlayers(transport);
    await getActiveMusicAssistantQueue(transport, 'player-1');
    await playMusicAssistantMedia(transport, 'queue-1', 'library://track/1', 'add');
    await playMusicAssistantQueueItem(transport, 'queue-1', 3);
    await setMusicAssistantShuffle(transport, 'queue-1', true);
    await transferMusicAssistantQueue(transport, 'queue-1', 'queue-2', true);
    await addMusicAssistantPlayerToGroup(transport, 'player-1', 'player-2');
    await removeMusicAssistantPlayerFromGroup(transport, 'player-2');
    await removeMusicAssistantPlayersFromGroup(transport, ['player-2', 'player-3']);
    await addCurrentMusicAssistantItemToFavorites(transport, 'player-1');
    await removeMusicAssistantFavorite(transport, 'track', 'library-track-1');
    await listMusicAssistantPlaylists(transport, { search: 'mix', limit: 10, offset: 20 });
    await createMusicAssistantPlaylist(transport, 'New mix', 'builtin');
    await addMusicAssistantPlaylistTracks(transport, 'playlist-1', ['library://track/1']);

    expect(command.mock.calls).toEqual([
      ['players/all', {}],
      ['player_queues/get_active_queue', { player_id: 'player-1' }],
      ['player_queues/play_media', { queue_id: 'queue-1', media: 'library://track/1', option: 'add' }],
      ['player_queues/play_index', { queue_id: 'queue-1', index: 3 }],
      ['player_queues/shuffle', { queue_id: 'queue-1', shuffle_enabled: true }],
      ['player_queues/transfer', { source_queue_id: 'queue-1', target_queue_id: 'queue-2', auto_play: true }],
      ['players/cmd/group', { player_id: 'player-1', target_player: 'player-2' }],
      ['players/cmd/ungroup', { player_id: 'player-2' }],
      ['players/cmd/ungroup_many', { player_ids: ['player-2', 'player-3'] }],
      ['players/add_currently_playing_to_favorites', { player_id: 'player-1' }],
      ['music/favorites/remove_item', { media_type: 'track', library_item_id: 'library-track-1' }],
      ['music/playlists/library_items', { search: 'mix', limit: 10, offset: 20 }],
      ['music/playlists/create_playlist', { name: 'New mix', provider_instance_or_domain: 'builtin' }],
      ['music/playlists/add_playlist_tracks', { db_playlist_id: 'playlist-1', uris: ['library://track/1'] }],
    ]);
  });

  it('sends authenticated media browser commands', async () => {
    const response = { title: 'Sources', children: [] };
    const callWS = vi.fn().mockResolvedValue(response);

    await expect(browseMedia(createHass(undefined, callWS), 'media-source://')).resolves.toEqual(response);
    expect(callWS).toHaveBeenCalledWith({
      type: 'media_source/browse_media',
      media_content_id: 'media-source://',
    });
  });

  it('rejects browsing when the Home Assistant websocket is unavailable', async () => {
    await expect(browseMedia(createHass())).rejects.toThrow('media browsing is unavailable');
  });

  it('rejects malformed media browse responses', async () => {
    const callWS = vi.fn().mockResolvedValue({ title: 'Sources', children: [{ title: 'Missing IDs' }] });

    await expect(browseMedia(createHass(undefined, callWS))).rejects.toThrow('invalid media browser response');
  });

  it('generates the Music Assistant search action with the configured entry', async () => {
    const callService = vi.fn().mockResolvedValue({ response: { tracks: [{ name: 'Song', uri: 'demo://song' }] } });

    const response = await searchMusicAssistant(createHass(callService), 'song', 'entry-id');

    expect(response.tracks).toHaveLength(1);
    expect(callService).toHaveBeenCalledWith(
      'music_assistant',
      'search',
      { config_entry_id: 'entry-id', name: 'song', limit: 12 },
      undefined,
      true,
      true,
    );
  });

  it('flattens grouped results without losing their group', () => {
    expect(flattenSearchResults({ tracks: [{ name: 'Song', uri: 'demo://song' }], albums: [{ name: 'Album', uri: 'demo://album' }] })).toEqual([
      { name: 'Song', uri: 'demo://song', group: 'tracks' },
      { name: 'Album', uri: 'demo://album', group: 'albums' },
    ]);
  });

  it('drops malformed search groups and items', async () => {
    const callService = vi.fn().mockResolvedValue({ response: { tracks: [{ name: 'Song', uri: 'demo://song' }, { name: 'Missing URI' }], albums: 'invalid' } });

    await expect(searchMusicAssistant(createHass(callService), 'song', 'entry-id')).resolves.toEqual({ tracks: [{ name: 'Song', uri: 'demo://song' }] });
  });

  it('normalizes direct and entity-keyed queue responses', async () => {
    const direct = vi.fn().mockResolvedValue({ response: { items: [{ name: 'Song' }] } });
    const keyed = vi.fn().mockResolvedValue({ response: { 'media_player.living_room': { items: [{ name: 'Keyed song' }] } } });

    await expect(getQueue(createHass(direct), 'media_player.living_room')).resolves.toEqual({ items: [{ name: 'Song' }] });
    await expect(getQueue(createHass(keyed), 'media_player.living_room')).resolves.toEqual({ items: [{ name: 'Keyed song' }] });
    expect(keyed).toHaveBeenCalledWith('music_assistant', 'get_queue', undefined, { entity_id: 'media_player.living_room' }, false, true);
  });
});
