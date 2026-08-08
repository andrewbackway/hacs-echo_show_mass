// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import type { HomeAssistant } from './home-assistant';
import { MusicAssistantCard } from './card';

function createHass(callService = vi.fn()): HomeAssistant {
  return {
    states: {
      'media_player.living_room': {
        entity_id: 'media_player.living_room',
        state: 'paused',
        attributes: {},
      },
    },
    callService,
    callWS: vi.fn().mockResolvedValue({ title: 'Sources', children: [] }),
  };
}

describe('MusicAssistantCard', () => {
  it('renders an actionable setup state when the entry ID is not configured', () => {
    const card = new MusicAssistantCard();
    card.setConfig({ type: 'custom:music-assistant-card', player: 'media_player.living_room' } as never);

    expect(card.shadowRoot?.textContent).toContain('Complete the Music Assistant config entry ID');
  });

  it('reports playback service failures in the card UI', async () => {
    const callService = vi.fn().mockRejectedValue(new Error('Player unavailable'));
    const card = new MusicAssistantCard();
    card.setConfig({ type: 'custom:music-assistant-card', player: 'media_player.living_room', config_entry_id: 'entry-id', show_queue: false });
    card.hass = createHass(callService);
    document.body.append(card);

    const playButton = card.shadowRoot?.querySelector<HTMLButtonElement>('[data-control="play-pause"]');
    playButton?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(card.shadowRoot?.textContent).toContain('Player unavailable');
  });

  it('preserves the browse DOM during steady-state Home Assistant updates', async () => {
    const card = new MusicAssistantCard();
    card.setConfig({ type: 'custom:music-assistant-card', player: 'media_player.living_room', config_entry_id: 'entry-id', show_queue: false });
    card.hass = createHass();
    document.body.append(card);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const input = card.shadowRoot?.querySelector('[data-search]');
    card.hass = createHass();

    expect(card.shadowRoot?.querySelector('[data-search]')).toBe(input);
  });
});
