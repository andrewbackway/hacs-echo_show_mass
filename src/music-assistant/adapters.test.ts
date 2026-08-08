import { describe, expect, it, vi } from 'vitest';
import type { HomeAssistant } from '../home-assistant';
import { browseMedia } from './media-browser';
import { getQueue } from './queue';
import { flattenSearchResults, searchMusicAssistant } from './search';

function createHass(callService = vi.fn(), callWS?: HomeAssistant['callWS']): HomeAssistant {
  return {
    states: {},
    callService,
    callWS,
  };
}

describe('Music Assistant adapters', () => {
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

  it('normalizes direct and entity-keyed queue responses', async () => {
    const direct = vi.fn().mockResolvedValue({ response: { items: [{ name: 'Song' }] } });
    const keyed = vi.fn().mockResolvedValue({ response: { 'media_player.living_room': { items: [{ name: 'Keyed song' }] } } });

    await expect(getQueue(createHass(direct), 'media_player.living_room')).resolves.toEqual({ items: [{ name: 'Song' }] });
    await expect(getQueue(createHass(keyed), 'media_player.living_room')).resolves.toEqual({ items: [{ name: 'Keyed song' }] });
    expect(keyed).toHaveBeenCalledWith('music_assistant', 'get_queue', undefined, { entity_id: 'media_player.living_room' }, false, true);
  });
});
