// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import type { HomeAssistant } from './home-assistant';
import { MusicAssistantCard } from './card';

function response(title: string) {
  return { title, children: [], media_content_id: `demo://${title}`, media_content_type: 'container' };
}

function createHass(callWS: HomeAssistant['callWS'], callService = vi.fn()): HomeAssistant {
  return {
    states: {
      'media_player.living_room': { entity_id: 'media_player.living_room', state: 'paused', attributes: {} },
    },
    callWS,
    callService,
  };
}

describe('MusicAssistantCard lifecycle', () => {
  it('keeps the newest browse response when an older request resolves later', async () => {
    const requests: Array<{ resolve: (value: unknown) => void }> = [];
    const callWS = vi.fn(() => new Promise<unknown>((resolve) => requests.push({ resolve }))) as unknown as HomeAssistant['callWS'];
    const card = new MusicAssistantCard();
    card.setConfig({ type: 'custom:music-assistant-card', player: 'media_player.living_room', config_entry_id: 'entry-id', show_queue: false });
    card.hass = createHass(callWS);

    const loadMedia = (card as unknown as { loadMedia: (id: string, path: never[]) => Promise<void> }).loadMedia;
    const secondRequest = loadMedia.call(card, 'demo:second', []);
    requests[1].resolve(response('Second')); 
    await secondRequest;
    expect(card.shadowRoot?.textContent).toContain('Second');

    requests[0].resolve(response('First'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(card.shadowRoot?.textContent).toContain('Second');
    expect(card.shadowRoot?.textContent).not.toContain('First');
  });

  it('clears a pending search debounce when disconnected', async () => {
    const callService = vi.fn();
    const card = new MusicAssistantCard();
    card.setConfig({ type: 'custom:music-assistant-card', player: 'media_player.living_room', config_entry_id: 'entry-id', show_queue: false });
    card.hass = createHass(vi.fn().mockResolvedValue(response('Sources')), callService);
    document.body.append(card);

    const input = card.shadowRoot?.querySelector<HTMLInputElement>('[data-search]');
    expect(input).toBeTruthy();
    input!.value = 'album';
    input!.dispatchEvent(new Event('input', { bubbles: true }));
    card.remove();
    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(callService).not.toHaveBeenCalled();
  });

  it('reloads data after reconnecting', async () => {
    const requests: Array<{ resolve: (value: unknown) => void }> = [];
    const callWS = vi.fn(() => new Promise<unknown>((resolve) => requests.push({ resolve }))) as unknown as HomeAssistant['callWS'];
    const card = new MusicAssistantCard();
    card.setConfig({ type: 'custom:music-assistant-card', player: 'media_player.living_room', config_entry_id: 'entry-id', show_queue: false });
    document.body.append(card);
    card.hass = createHass(callWS);
    expect(requests).toHaveLength(1);

    card.remove();
    document.body.append(card);
    expect(requests).toHaveLength(2);
    requests[1].resolve(response('Reconnected sources'));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(card.shadowRoot?.textContent).toContain('Reconnected sources');
  });
});
