import type { HassEntity } from '../home-assistant';
import type { MediaItem } from '../music-assistant/media-browser';
import type { SearchItem } from '../music-assistant/search';

export function formatMediaValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (!value || typeof value !== 'object') return '';
  const metadata = value as Record<string, unknown>;
  for (const key of ['name', 'title', 'label']) {
    const candidate = formatMediaValue(metadata[key]);
    if (candidate) return candidate;
  }
  return '';
}

export function formatDuration(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0:00';
  const seconds = Math.floor(value);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function toMediaItemFromSearch(item: SearchItem): MediaItem {
  return {
    media_content_id: item.uri,
    media_content_type: item.media_type ?? 'music',
    title: item.name,
    thumbnail: item.image,
    can_play: item.is_playable !== false,
    can_expand: item.can_expand === true,
    artist: item.artist,
    album: item.album,
  };
}

export function getGroupMembers(entity: HassEntity): string[] {
  const members = entity.attributes.group_members;
  return Array.isArray(members) ? members.filter((member): member is string => typeof member === 'string') : [];
}
