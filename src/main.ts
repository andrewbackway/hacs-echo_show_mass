import './style.css';
import { MusicAssistantCard } from './card';
import type { HomeAssistant } from './home-assistant';

const app = document.querySelector<HTMLDivElement>('#app');

if (app) {
  const card = new MusicAssistantCard();
  card.setConfig({
    type: 'custom:music-assistant-card',
    player: 'media_player.living_room',
    config_entry_id: 'demo-music-assistant',
  });

  const previewHass: HomeAssistant = {
    states: {
      'media_player.living_room': {
        entity_id: 'media_player.living_room',
        state: 'paused',
        attributes: {
          friendly_name: 'Living room',
          media_title: 'Demo track',
          media_artist: 'Demo artist',
          media_album_name: 'Demo album',
          media_duration: 245,
          media_position: 72,
          volume_level: 0.58,
          shuffle: false,
          repeat: 'off',
          entity_picture: 'https://placehold.co/160x160/506b7a/ffffff?text=MA',
        },
      },
    },
    callService: async <T,>(domain: string, service: string) => ({
      response: domain === 'music_assistant' && service === 'search'
        ? {
            tracks: [{ name: 'Demo track', uri: 'demo://track/1', media_type: 'track', artist: 'Demo artist', album: 'Demo album', provider: 'Music Assistant' }],
            albums: [{ name: 'Demo album', uri: 'demo://album/1', media_type: 'album', artist: 'Demo artist', provider: 'Music Assistant' }],
          }
        : domain === 'music_assistant' && service === 'get_queue'
          ? {
              items: [
                { name: 'Demo track', uri: 'demo://track/1', media_type: 'track', artist: 'Demo artist', album: 'Demo album' },
                { name: 'Another demo track', uri: 'demo://track/2', media_type: 'track', artist: 'Demo artist', album: 'Demo album' },
              ],
              current_index: 0,
            }
        : {},
    } as { response: T }),
    callWS: async <T,>(message: Record<string, unknown>) => {
        const isDemoFolder = message.media_content_id === 'media-source://music_assistant';
        const isDemoAlbum = message.media_content_id === 'demo:albums';
      return {
        media_content_id: String(message.media_content_id),
        media_content_type: 'container',
          title: isDemoFolder ? 'Music Assistant' : isDemoAlbum ? 'Albums' : 'Media sources',
        can_expand: true,
          children: isDemoFolder
            ? [{ media_content_id: 'demo:albums', media_content_type: 'album', title: 'Albums', can_expand: true }]
            : isDemoAlbum
              ? [{ media_content_id: 'demo://track/1', media_content_type: 'track', title: 'Demo track', artist: 'Demo artist', album: 'Demo album', can_expand: false }]
              : [{ media_content_id: 'media-source://music_assistant', media_content_type: 'container', title: 'Music Assistant', can_expand: true }],
      } as T;
    },
  };

  card.hass = previewHass;
  app.append(card);
}
