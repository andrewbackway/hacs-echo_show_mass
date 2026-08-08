import type { HomeAssistant } from '../home-assistant';

export interface MediaItem {
  media_content_id: string;
  media_content_type: string;
  media_class?: string;
  title: string;
  thumbnail?: string;
  can_play?: boolean;
  can_expand?: boolean;
  children?: MediaItem[];
  artist?: string;
  album?: string;
}

export interface MediaBrowseResponse extends MediaItem {
  children: MediaItem[];
}

export async function browseMedia(
  hass: HomeAssistant,
  mediaContentId = 'media-source://',
): Promise<MediaBrowseResponse> {
  if (!hass.callWS) {
    throw new Error('Home Assistant media browsing is unavailable.');
  }

  return hass.callWS<MediaBrowseResponse>({
    type: 'media_source/browse_media',
    media_content_id: mediaContentId,
  });
}
