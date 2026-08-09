// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import type { HomeAssistant } from './home-assistant';
import { MusicAssistantCard } from './card';

function createHass(): HomeAssistant {
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
        attributes: { friendly_name: 'Kitchen' },
      },
    },
    callService: vi.fn(),
    callWS: vi.fn().mockResolvedValue({ title: 'Music Assistant', children: [] }),
  };
}

describe('render granularity', () => {
  it('a progress tick only patches the timeline, leaving the top menu untouched', () => {
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

      const topMenu = card.shadowRoot!.querySelector('.top-menu')!;
      const observer = new MutationObserver(() => {});
      observer.observe(topMenu, { childList: true, subtree: true, attributes: true, characterData: true });

      vi.advanceTimersByTime(1000);

      expect(observer.takeRecords()).toHaveLength(0);
      const slider = card.shadowRoot?.querySelector<HTMLInputElement>('[data-seek]');
      expect(Number(slider?.value)).toBeCloseTo(11, 4);
    } finally {
      vi.useRealTimers();
    }
  });

  it('makes no DOM mutations when hass changes only for an unrelated entity', () => {
    const card = new MusicAssistantCard();
    card.setConfig({ type: 'custom:music-assistant-card', player: 'media_player.living_room', show_queue: false });
    card.hass = createHass();

    const container = card.shadowRoot!.querySelector('.card')!;
    const observer = new MutationObserver(() => {});
    observer.observe(container, { childList: true, subtree: true, attributes: true, characterData: true });

    const nextHass = createHass();
    nextHass.states['media_player.kitchen'] = { ...nextHass.states['media_player.kitchen'], state: 'playing' };
    card.hass = nextHass;

    expect(observer.takeRecords()).toHaveLength(0);
  });

  it('leaves the top menu and now-playing subtree untouched when only an unread attribute (volume) changes', () => {
    const card = new MusicAssistantCard();
    card.setConfig({ type: 'custom:music-assistant-card', player: 'media_player.living_room', show_queue: false });
    const baseHass = createHass();
    baseHass.states['media_player.living_room'] = {
      entity_id: 'media_player.living_room',
      state: 'paused',
      attributes: { friendly_name: 'Living Room', media_title: 'Song', media_position: 5, volume_level: 0.5 },
    };
    card.hass = baseHass;

    const topMenu = card.shadowRoot!.querySelector('.top-menu')!;
    const nowPlaying = card.shadowRoot!.querySelector('.now-playing-screen')!;
    const topMenuObserver = new MutationObserver(() => {});
    topMenuObserver.observe(topMenu, { childList: true, subtree: true, attributes: true, characterData: true });
    const nowPlayingObserver = new MutationObserver(() => {});
    nowPlayingObserver.observe(nowPlaying, { childList: true, subtree: true, attributes: true, characterData: true });

    const nextHass = createHass();
    nextHass.states['media_player.living_room'] = {
      entity_id: 'media_player.living_room',
      state: 'paused',
      attributes: { friendly_name: 'Living Room', media_title: 'Song', media_position: 5, volume_level: 0.8 },
    };
    card.hass = nextHass;

    expect(topMenuObserver.takeRecords()).toHaveLength(0);
    expect(nowPlayingObserver.takeRecords()).toHaveLength(0);
  });
});
