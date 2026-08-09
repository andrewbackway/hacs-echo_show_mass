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
  it('keeps the newest browse response when an older request resolves later', async () => {
    const calls: Array<(value: unknown) => void> = [];
    const callWS = vi.fn(() => new Promise((resolve) => calls.push(resolve))) as unknown as HomeAssistant['callWS'];
    const card = new MusicAssistantCard();
    card.setConfig({ type: 'custom:music-assistant-card', player: 'media_player.living_room', show_queue: false });
    card.hass = hass(callWS);
    card.shadowRoot?.querySelector<HTMLElement>('[data-control="discover"]')?.click();
    card.shadowRoot?.querySelector<HTMLElement>('[data-path-root]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    calls[0]({
      title: 'First',
      children: [{ media_content_id: 'album://first', media_content_type: 'album', title: 'First album' }],
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(card.shadowRoot?.textContent).toContain('First album');
  });
});
