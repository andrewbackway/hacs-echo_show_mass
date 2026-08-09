// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import type { HomeAssistant } from './home-assistant';
import { MusicAssistantCard } from './card';

function createHass(callService = vi.fn()): HomeAssistant {
  return {
    states: {
      'media_player.living_room': { entity_id: 'media_player.living_room', state: 'paused', attributes: { friendly_name: 'Living Room' } },
      'media_player.kitchen': { entity_id: 'media_player.kitchen', state: 'idle', attributes: { friendly_name: 'Kitchen', supported_features: 512 } },
    },
    callService,
    callWS: vi.fn().mockResolvedValue({ title: 'Music Assistant', children: [] }),
  };
}

describe('MusicAssistantCard', () => {
  it('uses HA-only defaults and no ingress settings', () => {
    expect(MusicAssistantCard.getStubConfig()).toEqual({
      type: 'custom:music-assistant-card', player: '', layout: 'two-column',
      show_search: true, show_queue: true, click_action: 'play',
    });
  });

  it('browses through the Music Assistant media source', async () => {
    const callWS = vi.fn().mockResolvedValue({ title: 'Music Assistant', children: [{ media_content_id: 'album://1', media_content_type: 'album', title: 'Album', thumbnail: '/local/album.jpg', can_play: true }] });
    const card = new MusicAssistantCard();
    card.setConfig({ type: 'custom:music-assistant-card', player: 'media_player.living_room', show_queue: false });
    card.hass = { ...createHass(), callWS };
    card.shadowRoot?.querySelector<HTMLElement>('[data-control="discover"]')?.click();
    card.shadowRoot?.querySelector<HTMLElement>('[data-path-root]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(callWS).toHaveBeenCalledWith({ type: 'media_source/browse_media', media_content_id: 'media-source://music_assistant' });
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

  it('uses music_assistant.play_media for playback', async () => {
    const callService = vi.fn().mockResolvedValue({});
    const card = new MusicAssistantCard();
    card.setConfig({ type: 'custom:music-assistant-card', player: 'media_player.living_room', show_queue: false });
    card.hass = createHass(callService);
    card['playMedia']('track://1', 'track');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(callService).toHaveBeenCalledWith('music_assistant', 'play_media', { media_id: 'track://1', media_type: 'track', enqueue: 'replace' }, { entity_id: 'media_player.living_room' }, true, false);
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
    card.setConfig({ type: 'custom:music-assistant-card', player: 'media_player.living_room', players: ['media_player.kitchen'] });
    card.hass = createHass();
    card.shadowRoot?.querySelector<HTMLElement>('[data-control="speaker"]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(card.shadowRoot?.textContent).toContain('Living Room');
    expect(card.shadowRoot?.textContent).toContain('Kitchen');
  });
});
