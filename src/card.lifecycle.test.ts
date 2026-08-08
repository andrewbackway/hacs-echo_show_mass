// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import type { HomeAssistant } from './home-assistant';
import { MusicAssistantCard } from './card';

function response(title: string) {
  return { value: [{ name: title, path: `demo://${title}`, media_type: 'folder', is_playable: false }] };
}

function createHass(_callWS: HomeAssistant['callWS'], callService = vi.fn()): HomeAssistant {
  const discovery = vi.fn((message: Record<string, unknown>) => message.endpoint === '/addons'
    ? Promise.resolve({ addons: [{ name: 'Music Assistant', slug: 'music-assistant' }] })
    : Promise.resolve({ state: 'started', ingress: true, ingress_url: '/api/hassio_ingress/music-assistant' })) as unknown as HomeAssistant['callWS'];
  return {
    states: {
      'media_player.living_room': { entity_id: 'media_player.living_room', state: 'paused', attributes: {} },
    },
    callWS: discovery,
    callService,
  };
}

describe('MusicAssistantCard lifecycle', () => {
  it('keeps the newest browse response when an older request resolves later', async () => {
    const requests: Array<{ resolve: (value: Response) => void }> = [];
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => requests.push({ resolve }))) as unknown as typeof fetch;
    vi.stubGlobal('fetch', fetchMock);
    const card = new MusicAssistantCard();
    card.setConfig({ type: 'custom:music-assistant-card', player: 'media_player.living_room', config_entry_id: 'entry-id', show_queue: false });
    card.hass = createHass(vi.fn());
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    card.shadowRoot?.querySelector<HTMLElement>('[data-control="discover"]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
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
    const callService = vi.fn();
    const card = new MusicAssistantCard();
    card.setConfig({ type: 'custom:music-assistant-card', player: 'media_player.living_room', config_entry_id: 'entry-id', show_queue: false });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(response('Sources')), { status: 200 })));
    card.hass = createHass(vi.fn(), callService);
    document.body.append(card);
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    card.shadowRoot?.querySelector<HTMLElement>('[data-control="discover"]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

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
    const requests: Array<{ resolve: (value: Response) => void }> = [];
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => requests.push({ resolve }))) as unknown as typeof fetch;
    vi.stubGlobal('fetch', fetchMock);
    const card = new MusicAssistantCard();
    card.setConfig({ type: 'custom:music-assistant-card', player: 'media_player.living_room', config_entry_id: 'entry-id', show_queue: false });
    document.body.append(card);
    card.hass = createHass(vi.fn());
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    card.shadowRoot?.querySelector<HTMLElement>('[data-control="discover"]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(requests).toHaveLength(1);

    card.remove();
    document.body.append(card);
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(requests).toHaveLength(2);
    requests[1].resolve(new Response(JSON.stringify(response('Reconnected sources')), { status: 200 }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(card.shadowRoot?.textContent).toContain('Reconnected sources');
    vi.unstubAllGlobals();
  });
});
