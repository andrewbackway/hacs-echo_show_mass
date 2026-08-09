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
  mediaContentId = 'media-source://music_assistant',
): Promise<MediaBrowseResponse> {
  if (!hass.callWS) {
    throw new Error('Home Assistant media browsing is unavailable.');
  }

  const response = await hass.callWS<unknown>({
    type: 'media_source/browse_media',
    media_content_id: mediaContentId,
  });
  if (!response || typeof response !== 'object' || typeof (response as MediaBrowseResponse).title !== 'string' || !Array.isArray((response as MediaBrowseResponse).children) || !(response as MediaBrowseResponse).children.every(isMediaItem)) {
    throw new Error('Home Assistant returned an invalid media browser response.');
  }
  return response as MediaBrowseResponse;
}

function isMediaItem(value: unknown): value is MediaItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<MediaItem>;
  return typeof item.media_content_id === 'string' && typeof item.media_content_type === 'string' && typeof item.title === 'string';
}
