// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import type { HomeAssistant } from './home-assistant';
import { MusicAssistantCard } from './card';

function createHass(callService = vi.fn()): HomeAssistant {
  const callWS = vi.fn((message: Record<string, unknown>) => {
    if (message.endpoint === '/addons') return Promise.resolve({ addons: [{ name: 'Music Assistant', slug: 'music-assistant' }] });
    return Promise.resolve({ state: 'started', ingress: true, ingress_url: '/api/hassio_ingress/music-assistant' });
  }) as unknown as HomeAssistant['callWS'];
  return {
    states: {
      'media_player.living_room': {
        entity_id: 'media_player.living_room',
        state: 'paused',
        attributes: {},
      },
    },
    callService,
    callWS,
  };
}

describe('MusicAssistantCard', () => {
  it('renders an ingress setup state before Home Assistant is available', () => {
    const card = new MusicAssistantCard();
    card.setConfig({ type: 'custom:music-assistant-card', player: 'media_player.living_room' } as never);

    expect(card.shadowRoot?.textContent).toContain('Music Assistant ingress is unavailable');
  });

  it('reports playback service failures in the card UI', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Player unavailable')));
    const callService = vi.fn().mockRejectedValue(new Error('Player unavailable'));
    const card = new MusicAssistantCard();
    card.setConfig({ type: 'custom:music-assistant-card', player: 'media_player.living_room', config_entry_id: 'entry-id', show_queue: false });
    card.hass = createHass(callService);
    document.body.append(card);
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const playButton = card.shadowRoot?.querySelector<HTMLButtonElement>('[data-control="play-pause"]');
    playButton?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(card.shadowRoot?.textContent).toContain('Music Assistant queue is unavailable');
    window.history.replaceState({}, '', '/');
    vi.unstubAllGlobals();
  });

  it('preserves the browse DOM during steady-state Home Assistant updates', async () => {
    const card = new MusicAssistantCard();
    card.setConfig({ type: 'custom:music-assistant-card', player: 'media_player.living_room', config_entry_id: 'entry-id', show_queue: false });
    const hass = createHass();
    card.hass = hass;
    document.body.append(card);
    card.shadowRoot?.querySelector<HTMLElement>('[data-control="discover"]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const input = card.shadowRoot?.querySelector('[data-search]');
    card.hass = { ...hass, states: { ...hass.states } };

    expect(card.shadowRoot?.querySelector('[data-search]')).toBe(input);
    window.history.replaceState({}, '', '/');
  });

  it('adds the current queue item to a selected Music Assistant playlist', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      const values: Record<string, unknown> = {
        'players/all': [{ player_id: 'media_player.living_room', name: 'Living Room' }],
        'player_queues/get_active_queue': { queue_id: 'queue-1', current_index: 0 },
        'player_queues/items': [{ name: 'Current song', uri: 'library://track/current', media_type: 'track' }],
        'music/playlists/library_items': [{ item_id: 'playlist-1', provider: 'builtin', name: 'Favorites', is_editable: true }],
        'music/playlists/add_playlist_tracks': null,
      };
      return new Response(JSON.stringify({ value: values[body.command] }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    const card = new MusicAssistantCard();
    card.setConfig({ type: 'custom:music-assistant-card', player: 'media_player.living_room' });
    card.hass = createHass();
    document.body.append(card);
    await new Promise((resolve) => setTimeout(resolve, 0));

    card.shadowRoot?.querySelector<HTMLElement>('[data-control="playlist"]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(card.shadowRoot?.textContent).toContain('Favorites');

    card.shadowRoot?.querySelector<HTMLElement>('[data-playlist-id="playlist-1"]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(fetchMock.mock.calls.map((call) => JSON.parse(String(call[1]?.body)))).toContainEqual({
      message_id: expect.any(String),
      command: 'music/playlists/add_playlist_tracks',
      args: { db_playlist_id: 'playlist-1', uris: ['library://track/current'] },
    });
    window.history.replaceState({}, '', '/');
    vi.unstubAllGlobals();
  });
});
