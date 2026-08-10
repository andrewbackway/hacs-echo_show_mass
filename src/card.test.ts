// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import type { HomeAssistant } from './home-assistant';
import { MusicAssistantCard } from './card';
import { playMedia } from './card/actions';

function createHass(callService = vi.fn()): HomeAssistant {
  return {
    states: {
      'media_player.living_room': {
        entity_id: 'media_player.living_room',
        state: 'paused',
        attributes: { friendly_name: 'Living Room' },
      },
      'media_player.kitchen': {
        entity_id: 'media_player.kitchen',
        state: 'idle',
        attributes: { friendly_name: 'Kitchen', supported_features: 512 },
      },
    },
    callService,
    callWS: vi.fn().mockResolvedValue({ title: 'Music Assistant', children: [] }),
  };
}

describe('MusicAssistantCard', () => {
  it('uses HA-only defaults and no ingress settings', () => {
    expect(MusicAssistantCard.getStubConfig()).toEqual({
      type: 'custom:music-assistant-card',
      player: '',
    });
  });

  it('defines the YAML-first built-in form without retired layout controls', () => {
    const form = MusicAssistantCard.getConfigForm();
    const fieldNames = form.schema.flatMap((field) =>
      'schema' in field && field.schema ? field.schema.map((child) => child.name) : [field.name],
    );

    expect(fieldNames).toEqual(['player', 'click_action', 'players', 'music_assistant_config_entry_id']);
    expect(fieldNames).not.toEqual(expect.arrayContaining(['layout', 'show_search', 'show_queue', 'search_categories']));
    expect(form.schema[0]).toMatchObject({ name: 'player', required: true });
    expect(form.schema[3]).toMatchObject({ name: 'advanced', flatten: true });
  });

  it('keeps configured library order while promoting favorites to the top', () => {
    const card = new MusicAssistantCard();
    card.setConfig({
      type: 'custom:music-assistant-card',
      player: 'media_player.living_room',
      search_categories: ['track', 'favorites', 'album'],
    });
    card.hass = createHass();
    card.shadowRoot?.querySelector<HTMLElement>('[data-control="discover"]')?.click();

    expect([...card.shadowRoot!.querySelectorAll<HTMLElement>('.library-category span')].map((item) => item.textContent)).toEqual([
      'Favorites',
      'Tracks',
      'Albums',
    ]);
  });

  it('opens the category library without browsing media sources', async () => {
    const callWS = vi.fn();
    const card = new MusicAssistantCard();
    card.setConfig({
      type: 'custom:music-assistant-card',
      player: 'media_player.living_room',
      music_assistant_config_entry_id: 'entry-1',
      show_queue: false,
    });
    card.hass = { ...createHass(), callWS, callService: vi.fn().mockResolvedValue({ response: { items: [] } }) };
    card.shadowRoot?.querySelector<HTMLElement>('[data-control="discover"]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(callWS).not.toHaveBeenCalled();
    expect(card.shadowRoot?.querySelector('[data-control="library-category:favorites"]')).toBeTruthy();
  });

  it('loads recently played tracks with recent ordering', async () => {
    const callService = vi.fn().mockResolvedValue({ response: { items: [] } });
    const card = new MusicAssistantCard();
    card.setConfig({
      type: 'custom:music-assistant-card',
      player: 'media_player.living_room',
      music_assistant_config_entry_id: 'entry-1',
      show_queue: false,
    });
    card.hass = createHass(callService);
    card.shadowRoot?.querySelector<HTMLElement>('[data-control="discover"]')?.click();
    card.shadowRoot?.querySelector<HTMLElement>('[data-control="library-category:recently_played"]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(callService).toHaveBeenCalledWith(
      'music_assistant', 'get_library',
      { config_entry_id: 'entry-1', media_type: 'track', limit: 50, offset: 0, order_by: 'last_played' },
      undefined, true, true,
    );
  });

  it('hides the favorite control while favorite playback actions remain disabled in the UI', () => {
    const card = new MusicAssistantCard();
    const hass = createHass();
    hass.states['media_player.living_room'].attributes = {
      friendly_name: 'Living Room',
      media_content_id: 'track://first',
      media_favorite: true,
    };
    card.setConfig({ type: 'custom:music-assistant-card', player: 'media_player.living_room', show_queue: false });
    card.hass = hass;
    expect(card.shadowRoot?.querySelector('[data-control="favorite"]')).toBeNull();
  });

  it('opens search without requiring the media browser', () => {
    const callWS = vi.fn();
    const card = new MusicAssistantCard();
    card.setConfig({ type: 'custom:music-assistant-card', player: 'media_player.living_room', show_queue: false });
    card.hass = { ...createHass(), callWS };
    card.shadowRoot?.querySelector<HTMLElement>('[data-control="discover"]')?.click();

    expect(callWS).not.toHaveBeenCalled();
    expect(card.shadowRoot?.querySelector('[data-search]')).toBeTruthy();
  });

  it('loads Favorites across every documented library media type', async () => {
    const calls: Array<Record<string, unknown>> = [];
    const callService = vi.fn().mockImplementation((_domain, service, data) => {
      if (service === 'get_queue_items') return Promise.resolve({ response: { 'media_player.living_room': [] } });
      calls.push(data);
      return Promise.resolve({ response: { items: [{ name: String(data.media_type), uri: `${data.media_type}://1` }] } });
    });
    const card = new MusicAssistantCard();
    card.setConfig({
      type: 'custom:music-assistant-card',
      player: 'media_player.living_room',
      music_assistant_config_entry_id: 'entry-1',
      show_queue: false,
    });
    card.hass = createHass(callService);
    card.shadowRoot?.querySelector<HTMLElement>('[data-control="discover"]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(calls).toHaveLength(6);
    expect(calls.every((data) => data.config_entry_id === 'entry-1' && data.favorite === true)).toBe(true);
    expect(card.shadowRoot?.querySelectorAll('.library-category.selected')).toHaveLength(1);
    expect(card.shadowRoot?.querySelectorAll('.media-title')).toHaveLength(6);
  });

  it('loads the selected category when its rail button is clicked', async () => {
    const callService = vi.fn().mockImplementation((_domain, service, _data) => {
      if (service === 'get_queue_items') return Promise.resolve({ response: { 'media_player.living_room': [] } });
      return Promise.resolve({ response: { items: [{ name: 'Artist', uri: 'artist://1' }] } });
    });
    const card = new MusicAssistantCard();
    card.setConfig({
      type: 'custom:music-assistant-card',
      player: 'media_player.living_room',
      music_assistant_config_entry_id: 'entry-1',
      show_queue: false,
    });
    card.hass = createHass(callService);
    card.shadowRoot?.querySelector<HTMLElement>('[data-control="discover"]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    callService.mockClear();

    card.shadowRoot?.querySelector<HTMLElement>('[data-control="library-category:artist"]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(callService).toHaveBeenCalledWith(
      'music_assistant',
      'get_library',
      { config_entry_id: 'entry-1', media_type: 'artist', limit: 50, offset: 0, order_by: 'name' },
      undefined,
      true,
      true,
    );
  });

  it('uses music_assistant.play_media for playback', async () => {
    const callService = vi.fn().mockResolvedValue({});
    const card = new MusicAssistantCard();
    card.setConfig({ type: 'custom:music-assistant-card', player: 'media_player.living_room', show_queue: false });
    card.hass = createHass(callService);
    void playMedia(card['actionContext'], 'track://1', 'track');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(callService).toHaveBeenCalledWith(
      'music_assistant',
      'play_media',
      { media_id: 'track://1', media_type: 'track', enqueue: 'replace' },
      { entity_id: 'media_player.living_room' },
      true,
      false,
    );
  });

  it('uses media_player.media_next_track for the next button', async () => {
    const callService = vi.fn().mockResolvedValue({});
    const card = new MusicAssistantCard();
    card.setConfig({ type: 'custom:music-assistant-card', player: 'media_player.living_room', show_queue: false });
    card.hass = createHass(callService);

    card.shadowRoot?.querySelector<HTMLElement>('[data-control="next"]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(callService).toHaveBeenCalledWith(
      'media_player',
      'media_next_track',
      undefined,
      { entity_id: 'media_player.living_room' },
      true,
      false,
    );
  });

  it('updates the now-playing progress slider while playing', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-09T12:00:00Z'));
    try {
      const card = new MusicAssistantCard();
      const hass = createHass();
      hass.states['media_player.living_room'] = {
        entity_id: 'media_player.living_room',
        state: 'playing',
        attributes: { friendly_name: 'Living Room', media_position: 10, media_duration: 120 },
      };
      card.setConfig({ type: 'custom:music-assistant-card', player: 'media_player.living_room', show_queue: false });
      card.hass = hass;

      const slider = card.shadowRoot?.querySelector<HTMLInputElement>('[data-seek]');
      expect(slider?.value).toBe('10');
      vi.advanceTimersByTime(2000);
      expect(Number(slider?.value)).toBeCloseTo(12, 4);
      expect(slider?.previousElementSibling?.textContent).toBe('0:12');
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows all players when permitted players is blank', async () => {
    const card = new MusicAssistantCard();
    card.setConfig({ type: 'custom:music-assistant-card', player: 'media_player.living_room', players: [] });
    card.hass = createHass();
    card.shadowRoot?.querySelector<HTMLElement>('[data-control="speaker"]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(card.shadowRoot?.textContent).toContain('Living Room');
    expect(card.shadowRoot?.textContent).toContain('Kitchen');
  });

  it('restricts visible players to the permitted list and primary player', async () => {
    const card = new MusicAssistantCard();
    card.setConfig({
      type: 'custom:music-assistant-card',
      player: 'media_player.living_room',
      players: ['media_player.kitchen'],
    });
    card.hass = createHass();
    card.shadowRoot?.querySelector<HTMLElement>('[data-control="speaker"]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(card.shadowRoot?.textContent).toContain('Living Room');
    expect(card.shadowRoot?.textContent).toContain('Kitchen');
  });

  it('does not recreate the playback element or artwork on unrelated hass updates', () => {
    const card = new MusicAssistantCard();
    card.setConfig({ type: 'custom:music-assistant-card', player: 'media_player.living_room', show_queue: false });
    const baseHass = createHass();
    baseHass.states['media_player.living_room'] = {
      entity_id: 'media_player.living_room',
      state: 'playing',
      attributes: {
        friendly_name: 'Living Room',
        media_title: 'Song',
        media_artist: 'Artist',
        entity_picture: '/local/art.jpg',
        media_position: 5,
        media_duration: 200,
      },
    };
    card.hass = baseHass;
    const img = card.shadowRoot?.querySelector('.now-playing-art img');
    expect(img).toBeTruthy();

    // Simulate Home Assistant pushing a fresh hass object on an unrelated entity change,
    // with the configured player's own attributes unchanged apart from a routine position tick.
    const nextHass = createHass();
    nextHass.states['media_player.kitchen'] = { ...nextHass.states['media_player.kitchen'], state: 'playing' };
    nextHass.states['media_player.living_room'] = {
      entity_id: 'media_player.living_room',
      state: 'playing',
      attributes: {
        friendly_name: 'Living Room',
        media_title: 'Song',
        media_artist: 'Artist',
        entity_picture: '/local/art.jpg',
        media_position: 6,
        media_duration: 200,
      },
    };
    card.hass = nextHass;

    expect(card.shadowRoot?.querySelector('.now-playing-art img')).toBe(img);
  });

  it('refreshes the cached queue when the primary player media ID changes', async () => {
    const queueResponses = [
      { response: { 'media_player.living_room': [{ media_title: 'First song', media_content_id: 'track://first' }] } },
      { response: { 'media_player.living_room': [{ media_title: 'Second song', media_content_id: 'track://second' }] } },
    ];
    const callService = vi.fn().mockImplementation((_domain, service) =>
      service === 'get_queue_items' ? Promise.resolve(queueResponses.shift()) : Promise.resolve({}),
    );
    const card = new MusicAssistantCard();
    const firstHass = createHass(callService);
    firstHass.states['media_player.living_room'].attributes.media_content_id = 'track://first';
    card.setConfig({ type: 'custom:music-assistant-card', player: 'media_player.living_room' });
    card.hass = firstHass;
    await new Promise((resolve) => setTimeout(resolve, 0));

    const secondHass = createHass(callService);
    secondHass.states['media_player.living_room'].attributes.media_content_id = 'track://second';
    card.hass = secondHass;
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(callService).toHaveBeenCalledTimes(2);
    expect(card.shadowRoot?.textContent).not.toContain('Second song');
    card.shadowRoot?.querySelector<HTMLElement>('[data-control="queue"]')?.click();
    expect(card.shadowRoot?.textContent).toContain('Second song');
  });

  it('refreshes the cached queue when the primary player state changes', async () => {
    const queueResponses = [
      { response: { 'media_player.living_room': [{ media_title: 'Paused song', media_content_id: 'track://same' }] } },
      { response: { 'media_player.living_room': [{ media_title: 'Playing song', media_content_id: 'track://same' }] } },
    ];
    const callService = vi.fn().mockImplementation((_domain, service) =>
      service === 'get_queue_items' ? Promise.resolve(queueResponses.shift()) : Promise.resolve({}),
    );
    const card = new MusicAssistantCard();
    const firstHass = createHass(callService);
    firstHass.states['media_player.living_room'].state = 'paused';
    firstHass.states['media_player.living_room'].attributes.media_content_id = 'track://same';
    card.setConfig({ type: 'custom:music-assistant-card', player: 'media_player.living_room' });
    card.hass = firstHass;
    await new Promise((resolve) => setTimeout(resolve, 0));

    const secondHass = createHass(callService);
    secondHass.states['media_player.living_room'].state = 'playing';
    secondHass.states['media_player.living_room'].attributes.media_content_id = 'track://same';
    card.hass = secondHass;
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(callService).toHaveBeenCalledTimes(2);
    card.shadowRoot?.querySelector<HTMLElement>('[data-control="queue"]')?.click();
    expect(card.shadowRoot?.textContent).toContain('Playing song');
  });

  it('shows a queue refresh error in the queue flyout', async () => {
    const callService = vi.fn().mockImplementation((_domain, service) =>
      service === 'get_queue_items' ? Promise.reject(new Error('Queue unavailable')) : Promise.resolve({}),
    );
    const card = new MusicAssistantCard();
    card.setConfig({ type: 'custom:music-assistant-card', player: 'media_player.living_room' });
    card.hass = createHass(callService);
    await new Promise((resolve) => setTimeout(resolve, 0));
    card.shadowRoot?.querySelector<HTMLElement>('[data-control="queue"]')?.click();

    expect(card.shadowRoot?.textContent).toContain('Queue unavailable');
  });
});
