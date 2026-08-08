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

  it('starts on Now Playing and keeps one primary view with one flyout', async () => {
    const card = new MusicAssistantCard();
    card.setConfig({ type: 'custom:music-assistant-card', player: 'media_player.living_room', show_queue: false });
    card.hass = createHass();
    document.body.append(card);
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(card.shadowRoot?.querySelector('[data-primary-view="now-playing"]')).not.toBeNull();
    expect(card.shadowRoot?.querySelector('[data-primary-view="search"]')).toBeNull();
    expect(card.shadowRoot?.querySelector('[data-flyout]')).toBeNull();

    card.shadowRoot?.querySelector<HTMLElement>('[data-control="queue"]')?.click();
    expect(card.shadowRoot?.querySelector('[data-flyout="queue"]')).not.toBeNull();

    card.shadowRoot?.querySelector<HTMLElement>('[data-control="discover"]')?.click();
    expect(card.shadowRoot?.querySelector('[data-primary-view="search"]')).not.toBeNull();
    expect(card.shadowRoot?.querySelector('[data-primary-view="now-playing"]')).toBeNull();
    expect(card.shadowRoot?.querySelector('[data-flyout]')).toBeNull();
  });

  it('renders the Phase 2 playback hierarchy and volume flyout', async () => {
    const card = new MusicAssistantCard();
    card.setConfig({ type: 'custom:music-assistant-card', player: 'media_player.living_room', show_queue: false });
    const hass = createHass();
    card.hass = {
      ...hass,
      states: {
        ...hass.states,
        'media_player.living_room': {
          ...hass.states['media_player.living_room'],
          state: 'playing',
          attributes: {
            friendly_name: 'Living Room',
            media_title: 'Long song title',
            media_artist: 'Artist',
            entity_picture: '/local/cover.jpg',
            media_position: 12,
            media_duration: 180,
            volume_level: 0.65,
            repeat: 'one',
          },
        },
      },
    };
    document.body.append(card);
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(card.shadowRoot?.querySelector('.now-playing-art')).not.toBeNull();
    expect(card.shadowRoot?.querySelector('.now-playing-title')?.textContent).toBe('Long song title');
    expect(card.shadowRoot?.querySelector('[data-control="speaker"] .menu-label')?.textContent).toBe('Living Room');
    expect(card.shadowRoot?.querySelector('[data-control="repeat"] ha-icon')?.getAttribute('icon')).toBe('mdi:repeat-once');
    expect(card.shadowRoot?.querySelector('[data-control="shuffle"]')).toBeNull();

    card.shadowRoot?.querySelector<HTMLElement>('[data-control="volume"]')?.click();
    const slider = card.shadowRoot?.querySelector<HTMLInputElement>('[data-volume]');
    expect(slider?.value).toBe('65');
    slider!.value = '80';
    slider!.dispatchEvent(new Event('input', { bubbles: true }));
    expect(card.shadowRoot?.querySelector('[data-volume-value]')?.textContent).toBe('80%');
  });

  it('selects queue items by index and confirms queue clearing', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      const values: Record<string, unknown> = {
        'players/all': [{ player_id: 'media_player.living_room', name: 'Living Room', available: true }],
        'player_queues/get_active_queue': { queue_id: 'queue-1', current_index: 0, shuffle_enabled: false },
        'player_queues/items': [{ name: 'Current', uri: 'library://track/1' }, { name: 'Next', uri: 'library://track/2' }],
        'player_queues/play_index': null,
        'player_queues/clear': null,
      };
      return new Response(JSON.stringify({ value: values[body.command] }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    const card = new MusicAssistantCard();
    card.setConfig({ type: 'custom:music-assistant-card', player: 'media_player.living_room' });
    card.hass = createHass();
    document.body.append(card);
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    card.shadowRoot?.querySelector<HTMLElement>('[data-control="queue"]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    card.shadowRoot?.querySelector<HTMLElement>('[data-queue-index="1"]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(fetchMock.mock.calls.map((call) => JSON.parse(String(call[1]?.body)))).toContainEqual({
      message_id: expect.any(String),
      command: 'player_queues/play_index',
      args: { queue_id: 'queue-1', index: 1 },
    });
    expect(card.shadowRoot?.querySelector('[data-flyout="queue"]')).toBeNull();

    card.shadowRoot?.querySelector<HTMLElement>('[data-control="queue"]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    card.shadowRoot?.querySelector<HTMLElement>('[data-control="clear-queue-request"]')?.click();
    expect(card.shadowRoot?.querySelector('[data-control="clear-queue-confirm"]')).not.toBeNull();
    expect(fetchMock.mock.calls.map((call) => JSON.parse(String(call[1]?.body))).filter((body) => body.command === 'player_queues/clear')).toHaveLength(0);
    card.shadowRoot?.querySelector<HTMLElement>('[data-control="clear-queue-confirm"]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(fetchMock.mock.calls.map((call) => JSON.parse(String(call[1]?.body)))).toContainEqual({
      message_id: expect.any(String),
      command: 'player_queues/clear',
      args: { queue_id: 'queue-1' },
    });
    window.history.replaceState({}, '', '/');
    vi.unstubAllGlobals();
  });

  it('filters speakers and applies staged group additions and removals', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      const values: Record<string, unknown> = {
        'players/all': [
          { player_id: 'media_player.living_room', name: 'Living Room', group_members: ['media_player.living_room', 'media_player.office'] },
          { player_id: 'media_player.office', name: 'Office' },
          { player_id: 'media_player.bedroom', name: 'Bedroom' },
          { player_id: 'media_player.hidden', name: 'Hidden', hide_in_ui: true },
          { player_id: 'media_player.offline', name: 'Offline', available: false },
        ],
        'player_queues/get_active_queue': { queue_id: 'queue-1', current_index: 0 },
        'player_queues/items': [],
        'players/cmd/group': null,
        'players/cmd/ungroup': null,
      };
      return new Response(JSON.stringify({ value: values[body.command] }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    const card = new MusicAssistantCard();
    card.setConfig({ type: 'custom:music-assistant-card', player: 'media_player.living_room' });
    card.hass = createHass();
    document.body.append(card);
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    card.shadowRoot?.querySelector<HTMLElement>('[data-control="speaker"]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(card.shadowRoot?.querySelector('[data-speaker-id="media_player.hidden"]')).toBeNull();
    expect(card.shadowRoot?.querySelector('[data-speaker-id="media_player.offline"]')).toBeNull();
    card.shadowRoot?.querySelector<HTMLElement>('[data-speaker-id="media_player.office"]')?.click();
    card.shadowRoot?.querySelector<HTMLElement>('[data-speaker-id="media_player.bedroom"]')?.click();
    card.shadowRoot?.querySelector<HTMLElement>('[data-speaker-action="apply"]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const commands = fetchMock.mock.calls.map((call) => JSON.parse(String(call[1]?.body)));
    expect(commands).toContainEqual({ message_id: expect.any(String), command: 'players/cmd/group', args: { player_id: 'media_player.living_room', target_player: 'media_player.bedroom' } });
    expect(commands).toContainEqual({ message_id: expect.any(String), command: 'players/cmd/ungroup', args: { player_id: 'media_player.office' } });
    expect(card.shadowRoot?.querySelector('[data-flyout="speakers"]')).toBeNull();
    vi.unstubAllGlobals();
  });

  it('opens expandable search results and preserves their breadcrumb path', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      const values: Record<string, unknown> = {
        'music/search': { albums: [{ name: 'Album', uri: 'album://one', media_type: 'album', is_playable: false }] },
        'music/browse': body.args.path === 'album://one'
          ? [{ name: 'Track', uri: 'track://one', media_type: 'track', is_playable: true }]
          : [{ name: 'Album source', uri: 'album://one', media_type: 'album' }],
      };
      return new Response(JSON.stringify({ value: values[body.command] }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    const card = new MusicAssistantCard();
    card.setConfig({ type: 'custom:music-assistant-card', player: 'media_player.living_room', show_queue: false });
    card.hass = createHass();
    document.body.append(card);
    await new Promise((resolve) => setTimeout(resolve, 0));
    card.shadowRoot?.querySelector<HTMLElement>('[data-control="discover"]')?.click();
    const search = card.shadowRoot?.querySelector<HTMLInputElement>('[data-search]');
    search!.value = 'album';
    search!.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 400));

    const result = card.shadowRoot?.querySelector<HTMLElement>('[data-search-uri="album://one"]');
    expect(result?.dataset.searchExpand).toBe('true');
    result?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(fetchMock.mock.calls.map((call) => JSON.parse(String(call[1]?.body)))).toContainEqual({
      message_id: expect.any(String),
      command: 'music/browse',
      args: { path: 'album://one' },
    });
    expect(card.shadowRoot?.querySelector('[data-path-index="0"]')?.textContent).toContain('Album');
    card.shadowRoot?.querySelector<HTMLElement>('[data-path-index="0"]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const browseCalls = fetchMock.mock.calls.map((call) => JSON.parse(String(call[1]?.body))).filter((body) => body.command === 'music/browse');
    expect(browseCalls.at(-1)).toMatchObject({ args: { path: 'album://one' } });
    window.history.replaceState({}, '', '/');
    vi.unstubAllGlobals();
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
        'music/playlists/create_playlist': { item_id: 'playlist-2', provider: 'builtin', name: 'Road trip', is_editable: true },
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
    expect(card.shadowRoot?.querySelector('[data-flyout="playlist"]')).toBeNull();
    card.shadowRoot?.querySelector<HTMLElement>('[data-control="playlist"]')?.click();
    const playlistName = card.shadowRoot?.querySelector<HTMLInputElement>('[data-playlist-name]');
    playlistName!.value = 'Road trip';
    card.shadowRoot?.querySelector<HTMLElement>('[data-playlist-create]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(fetchMock.mock.calls.map((call) => JSON.parse(String(call[1]?.body)))).toContainEqual({
      message_id: expect.any(String),
      command: 'music/playlists/create_playlist',
      args: { name: 'Road trip' },
    });
    expect(card.shadowRoot?.querySelector('[data-flyout="playlist"]')).toBeNull();
    window.history.replaceState({}, '', '/');
    vi.unstubAllGlobals();
  });
});
