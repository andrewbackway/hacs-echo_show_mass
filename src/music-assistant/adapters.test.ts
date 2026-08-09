import { describe, expect, it, vi } from 'vitest';
import type { HomeAssistant } from '../home-assistant';
import { browseMedia } from './media-browser';
import { getCoreQueue, getQueue } from './queue';
import { searchMusicAssistant } from './search';
import { getLibrary } from './library';

function createHass(callService = vi.fn(), callWS?: HomeAssistant['callWS']): HomeAssistant {
  return { states: {}, callService, callWS };
}

describe('Home Assistant Music Assistant adapters', () => {
  it('browses Home Assistant media sources by default', async () => {
    const callWS = vi.fn().mockResolvedValue({ title: 'Music Assistant', children: [] });
    await expect(browseMedia(createHass(undefined, callWS))).resolves.toMatchObject({ title: 'Music Assistant' });
    expect(callWS).toHaveBeenCalledWith({ type: 'media_source/browse_media', media_content_id: 'media-source://' });
  });

  it('preserves artwork from media-source responses', async () => {
    const response = {
      title: 'Albums',
      children: [
        { media_content_id: 'album://1', media_content_type: 'album', title: 'Album', thumbnail: '/local/album.jpg' },
      ],
    };
    await expect(browseMedia(createHass(undefined, vi.fn().mockResolvedValue(response)))).resolves.toEqual(response);
  });

  it('sends the HA search action without a config entry', async () => {
    const callService = vi.fn().mockResolvedValue({ response: { tracks: [{ name: 'Song', uri: 'track://1' }] } });
    await expect(searchMusicAssistant(createHass(callService), 'song')).resolves.toEqual({
      tracks: [{ name: 'Song', uri: 'track://1' }],
    });
    expect(callService).toHaveBeenCalledWith(
      'music_assistant',
      'search',
      { name: 'song', limit: 12 },
      undefined,
      true,
      true,
    );
  });

  it('normalizes an entity-keyed queue action response', async () => {
    const callService = vi
      .fn()
      .mockResolvedValue({ response: { 'media_player.living_room': { items: [{ name: 'Song' }] } } });
    await expect(getCoreQueue(createHass(callService), 'media_player.living_room')).resolves.toEqual({
      items: [{ name: 'Song' }],
    });
    expect(callService).toHaveBeenCalledWith(
      'music_assistant',
      'get_queue',
      undefined,
      { entity_id: 'media_player.living_room' },
      false,
      true,
    );
  });

  it('loads and maps the complete queue from mass_queue', async () => {
    const callService = vi.fn().mockResolvedValue({
      response: {
        'media_player.living_room': [
          {
            queue_item_id: 'queue-1',
            media_title: 'Song',
            media_album_name: 'Album',
            media_artist: 'Artist',
            media_content_id: 'track://1',
            media_image: '/local/song.jpg',
          },
        ],
      },
    });
    await expect(getQueue(createHass(callService), 'media_player.living_room')).resolves.toEqual({
      items: [
        {
          queue_item_id: 'queue-1',
          name: 'Song',
          album: 'Album',
          artist: 'Artist',
          uri: 'track://1',
          image_url: '/local/song.jpg',
        },
      ],
    });
    expect(callService).toHaveBeenCalledWith(
      'mass_queue',
      'get_queue_items',
      { entity: 'media_player.living_room', offset: 0, limit: 1000 },
      undefined,
      true,
      true,
    );
  });

  it('normalizes the documented current and next queue items', async () => {
    const callService = vi.fn().mockResolvedValue({
      response: {
        'media_player.living_room': {
          current_item: { name: 'Current song', uri: 'track://current' },
          next_item: { name: 'Queued album', uri: 'album://queued' },
        },
      },
    });
    await expect(getCoreQueue(createHass(callService), 'media_player.living_room')).resolves.toMatchObject({
      items: [
        { name: 'Current song', uri: 'track://current' },
        { name: 'Queued album', uri: 'album://queued' },
      ],
      current_index: 0,
    });
  });

  it('rejects an empty queue action response', async () => {
    const callService = vi.fn().mockResolvedValue({});
    await expect(getCoreQueue(createHass(callService), 'media_player.living_room')).rejects.toThrow('queue response');
  });

  it('requests a sorted paged library category with the Music Assistant config entry', async () => {
    const callService = vi.fn().mockResolvedValue({
      response: { items: [{ name: 'Album', uri: 'album://1' }], limit: 50, offset: 0, order_by: 'name', media_type: 'album' },
    });
    await expect(
      getLibrary(createHass(callService), {
        configEntryId: 'entry-1',
        mediaType: 'album',
        limit: 50,
        offset: 0,
        orderBy: 'name',
      }),
    ).resolves.toMatchObject({ items: [{ name: 'Album', uri: 'album://1', media_type: 'album' }] });
    expect(callService).toHaveBeenCalledWith(
      'music_assistant',
      'get_library',
      { config_entry_id: 'entry-1', media_type: 'album', limit: 50, offset: 0, order_by: 'name' },
      undefined,
      true,
      true,
    );
  });
});
