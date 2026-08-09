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
      music_assistant_config_entry_id: '',
      layout: 'two-column',
      show_search: true,
      show_queue: true,
      click_action: 'play',
    });
  });

  it('browses through the Music Assistant media source', async () => {
    const callWS = vi.fn().mockResolvedValue({
      title: 'Music Assistant',
      children: [
        {
          media_content_id: 'album://1',
          media_content_type: 'album',
          title: 'Album',
          thumbnail: '/local/album.jpg',
          can_play: true,
        },
      ],
    });
    const card = new MusicAssistantCard();
    card.setConfig({ type: 'custom:music-assistant-card', player: 'media_player.living_room', show_queue: false });
    card.hass = { ...createHass(), callWS };
    card.shadowRoot?.querySelector<HTMLElement>('[data-control="discover"]')?.click();
    card.shadowRoot?.querySelector<HTMLElement>('[data-path-root]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(callWS).toHaveBeenCalledWith({ type: 'media_source/browse_media', media_content_id: 'media-source://' });
    expect(card.shadowRoot?.querySelector('.media-title')?.textContent).toBe('Album');
    expect(card.shadowRoot?.querySelector('.thumb img')?.getAttribute('src')).toBe('/local/album.jpg');
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
      if (service === 'get_queue') return Promise.resolve({ response: { items: [] } });
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
});
