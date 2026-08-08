// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import type { HomeAssistant } from './home-assistant';
import { MusicAssistantCard } from './card';

function response(title: string) {
  return { value: [{ name: title, path: `demo://${title}`, media_type: 'folder', is_playable: false }] };
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
    window.history.pushState({}, '', '/?code=session-token');
    const requests: Array<{ resolve: (value: Response) => void }> = [];
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => requests.push({ resolve }))) as unknown as typeof fetch;
    vi.stubGlobal('fetch', fetchMock);
    const card = new MusicAssistantCard();
    card.setConfig({ type: 'custom:music-assistant-card', player: 'media_player.living_room', config_entry_id: 'entry-id', show_queue: false });
    card.hass = createHass(vi.fn());
    card.shadowRoot?.querySelector<HTMLElement>('[data-control="discover"]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const loadMedia = (card as unknown as { loadMedia: (id: string, path: never[]) => Promise<void> }).loadMedia;
    const secondRequest = loadMedia.call(card, 'demo:second', []);
    requests[1].resolve(new Response(JSON.stringify(response('Second')), { status: 200 }));
    await secondRequest;
    expect(card.shadowRoot?.textContent).toContain('Second');

    requests[0].resolve(new Response(JSON.stringify(response('First')), { status: 200 }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(card.shadowRoot?.textContent).toContain('Second');
    expect(card.shadowRoot?.textContent).not.toContain('First');
    vi.unstubAllGlobals();
  });

  it('clears a pending search debounce when disconnected', async () => {
    window.history.pushState({}, '', '/?code=session-token');
    const callService = vi.fn();
    const card = new MusicAssistantCard();
    card.setConfig({ type: 'custom:music-assistant-card', player: 'media_player.living_room', config_entry_id: 'entry-id', show_queue: false });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(response('Sources')), { status: 200 })));
    card.hass = createHass(vi.fn(), callService);
    document.body.append(card);
    card.shadowRoot?.querySelector<HTMLElement>('[data-control="discover"]')?.click();

    const input = card.shadowRoot?.querySelector<HTMLInputElement>('[data-search]');
    expect(input).toBeTruthy();
    input!.value = 'album';
    input!.dispatchEvent(new Event('input', { bubbles: true }));
    card.remove();
    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(callService).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('reloads data after reconnecting', async () => {
    window.history.pushState({}, '', '/?code=session-token');
    const requests: Array<{ resolve: (value: Response) => void }> = [];
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => requests.push({ resolve }))) as unknown as typeof fetch;
    vi.stubGlobal('fetch', fetchMock);
    const card = new MusicAssistantCard();
    card.setConfig({ type: 'custom:music-assistant-card', player: 'media_player.living_room', config_entry_id: 'entry-id', show_queue: false });
    document.body.append(card);
    card.hass = createHass(vi.fn());
    card.shadowRoot?.querySelector<HTMLElement>('[data-control="discover"]')?.click();
    expect(requests).toHaveLength(1);

    card.remove();
    document.body.append(card);
    expect(requests).toHaveLength(2);
    requests[1].resolve(new Response(JSON.stringify(response('Reconnected sources')), { status: 200 }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(card.shadowRoot?.textContent).toContain('Reconnected sources');
    vi.unstubAllGlobals();
  });
});
