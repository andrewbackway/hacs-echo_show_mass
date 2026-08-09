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
      type: 'custom:music-assistant-card', player: '', player_list: 'all', layout: 'two-column',
      show_search: true, show_queue: true, click_action: 'play',
    });
  });

  it('browses through the Music Assistant media source', async () => {
    const callWS = vi.fn().mockResolvedValue({ title: 'Music Assistant', children: [{ media_content_id: 'album://1', media_content_type: 'album', title: 'Album', thumbnail: '/local/album.jpg', can_play: true }] });
    const card = new MusicAssistantCard();
    card.setConfig({ type: 'custom:music-assistant-card', player: 'media_player.living_room', show_queue: false });
    card.hass = { ...createHass(), callWS };
    card.shadowRoot?.querySelector<HTMLElement>('[data-control="discover"]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(callWS).toHaveBeenCalledWith({ type: 'media_source/browse_media', media_content_id: 'media-source://music_assistant' });
    expect(card.shadowRoot?.querySelector('.media-title')?.textContent).toBe('Album');
    expect(card.shadowRoot?.querySelector('.thumb img')?.getAttribute('src')).toBe('/local/album.jpg');
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

  it('always includes the primary player in selected visibility mode', async () => {
    const card = new MusicAssistantCard();
    card.setConfig({ type: 'custom:music-assistant-card', player: 'media_player.living_room', player_list: 'selected', players: [] });
    card.hass = createHass();
    card.shadowRoot?.querySelector<HTMLElement>('[data-control="speaker"]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(card.shadowRoot?.textContent).toContain('Living Room');
    expect(card.shadowRoot?.textContent).not.toContain('Kitchen');
  });
});
