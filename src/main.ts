import './style.css';
import { MusicAssistantCard } from './card';
import { MusicAssistantCardEditor } from './editor';
import type { HomeAssistant, MusicAssistantCardConfig } from './home-assistant';

const app = document.querySelector<HTMLDivElement>('#app');

if (app) {
  const initialConfig: MusicAssistantCardConfig = { ...MusicAssistantCard.getStubConfig(), config_entry_id: 'demo-music-assistant' };
  const editor = new MusicAssistantCardEditor();
  const card = new MusicAssistantCard();
  let config = initialConfig;
  const previewHass: HomeAssistant = {
    states: { 'media_player.living_room': { entity_id: 'media_player.living_room', state: 'paused', attributes: { friendly_name: 'Living room', media_title: 'Demo track', media_artist: 'Demo artist', media_album_name: 'Demo album', media_duration: 245, media_position: 72, volume_level: 0.58, shuffle: false, repeat: 'off', entity_picture: 'https://placehold.co/160x160/506b7a/ffffff?text=MA' } } },
    callService: async <T,>(domain: string, service: string) => ({ response: domain === 'music_assistant' && service === 'search' ? { tracks: [{ name: 'Demo track', uri: 'demo://track/1', media_type: 'track', artist: 'Demo artist', album: 'Demo album', provider: 'Music Assistant' }], albums: [{ name: 'Demo album', uri: 'demo://album/1', media_type: 'album', artist: 'Demo artist', provider: 'Music Assistant' }] } : domain === 'music_assistant' && service === 'get_queue' ? { items: [{ name: 'Demo track', uri: 'demo://track/1', media_type: 'track', artist: 'Demo artist', album: 'Demo album' }, { name: 'Another demo track', uri: 'demo://track/2', media_type: 'track', artist: 'Demo artist', album: 'Demo album' }], current_index: 0 } : {} } as { response: T }),
    callWS: async <T,>(message: Record<string, unknown>) => ({ media_content_id: String(message.media_content_id), media_content_type: 'container', title: message.media_content_id === 'media-source://music_assistant' ? 'Music Assistant' : message.media_content_id === 'demo:albums' ? 'Albums' : 'Media sources', can_expand: true, children: message.media_content_id === 'media-source://music_assistant' ? [{ media_content_id: 'demo:albums', media_content_type: 'album', title: 'Albums', can_expand: true }] : message.media_content_id === 'demo:albums' ? [{ media_content_id: 'demo://track/1', media_content_type: 'track', title: 'Demo track', artist: 'Demo artist', album: 'Demo album', can_expand: false }] : [{ media_content_id: 'media-source://music_assistant', media_content_type: 'container', title: 'Music Assistant', can_expand: true }] } as T),
  };
  const applyConfig = (next: MusicAssistantCardConfig): void => { config = { ...config, ...next }; card.setConfig(config); };
  editor.setConfig(config);
  card.setConfig(config);
  card.hass = previewHass;
  editor.addEventListener('config-changed', (event) => applyConfig((event as CustomEvent<{ config: MusicAssistantCardConfig }>).detail.config));
  app.innerHTML = '<header><div><p class="eyebrow">MUSIC ASSISTANT</p><h1>Visual card editor</h1><p class="subtitle">Tune the card and see the Echo Show layout update live.</p></div><span class="status"><i></i> Preview mode</span></header><main><aside class="inspector"><div class="section-heading"><h2>Card settings</h2><span>LIVE</span></div><div id="editor"></div><div class="config-preview"><span>Generated configuration</span><code id="config-output"></code></div></aside><section class="stage"><div class="stage-heading"><span>Canvas</span><span>960 x 480 reference</span></div><div class="canvas" id="canvas"></div></section></main>';
  app.querySelector('#editor')?.append(editor);
  app.querySelector('#canvas')?.append(card);
  const output = app.querySelector<HTMLElement>('#config-output');
  const syncOutput = (): void => { if (output) output.textContent = JSON.stringify({ ...config, type: 'custom:music-assistant-card' }, null, 2); };
  editor.addEventListener('config-changed', syncOutput);
  syncOutput();
}
