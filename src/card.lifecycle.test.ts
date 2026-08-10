// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import type { HomeAssistant } from './home-assistant';
import { MusicAssistantCard } from './card';

function hass(callWS: HomeAssistant['callWS']): HomeAssistant {
  return {
    states: { 'media_player.living_room': { entity_id: 'media_player.living_room', state: 'paused', attributes: {} } },
    callService: vi.fn(),
    callWS,
  };
}

describe('MusicAssistantCard lifecycle', () => {
  it('does not open the removed breadcrumb browser', async () => {
    const callWS = vi.fn() as unknown as HomeAssistant['callWS'];
    const card = new MusicAssistantCard();
    card.setConfig({ type: 'custom:music-assistant-card', player: 'media_player.living_room', show_queue: false });
    card.hass = hass(callWS);
    card.shadowRoot?.querySelector<HTMLElement>('[data-control="discover"]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(callWS).not.toHaveBeenCalled();
    expect(card.shadowRoot?.querySelector('[data-path-root]')).toBeNull();
  });
});
