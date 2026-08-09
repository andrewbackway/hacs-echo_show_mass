import type { HomeAssistant } from '../home-assistant';

export interface QueueItem {
  queue_item_id?: string;
  name?: string;
  uri?: string;
  media_type?: string;
  artist?: string;
  album?: string;
  image_url?: string;
  image?: string;
  duration?: number;
}

export interface QueueDetails {
  queue_id?: string;
  active?: boolean;
  name?: string;
  items?: QueueItem[];
  shuffle_enabled?: boolean;
  repeat_mode?: string;
  current_index?: number;
  elapsed_time?: number;
  current_item?: QueueItem;
  next_item?: QueueItem;
}

export async function getQueue(hass: HomeAssistant, player: string): Promise<QueueDetails> {
  const result = await hass.callService<Record<string, MassQueueItem[]>>(
    'mass_queue',
    'get_queue_items',
    { entity: player, offset: 0, limit: 1000 },
    undefined,
    true,
    true,
  );
  const response = result.response;
  if (!response) throw new Error('The complete queue response was empty. Is mass_queue installed?');
  const items = response[player];
  if (!Array.isArray(items)) throw new Error('The complete queue response did not contain the targeted player.');
  return {
    items: items.map(normalizeQueueItem),
  };
}

interface MassQueueItem {
  queue_item_id?: unknown;
  media_title?: unknown;
  media_album_name?: unknown;
  media_artist?: unknown;
  media_content_id?: unknown;
  media_image?: unknown;
  duration?: unknown;
  media_duration?: unknown;
}

function normalizeQueueItem(item: MassQueueItem): QueueItem {
  return {
    queue_item_id: typeof item.queue_item_id === 'string' ? item.queue_item_id : undefined,
    name: typeof item.media_title === 'string' ? item.media_title : undefined,
    album: typeof item.media_album_name === 'string' ? item.media_album_name : undefined,
    artist: typeof item.media_artist === 'string' ? item.media_artist : undefined,
    uri: typeof item.media_content_id === 'string' ? item.media_content_id : undefined,
    image_url: typeof item.media_image === 'string' ? item.media_image : undefined,
    duration: toDuration(item.duration ?? item.media_duration),
  };
}

function toDuration(value: unknown): number | undefined {
  const duration = Number(value);
  return Number.isFinite(duration) && duration > 0 ? duration : undefined;
}

export async function getCoreQueue(hass: HomeAssistant, player: string): Promise<QueueDetails> {
  const result = await hass.callService<QueueDetails | Record<string, QueueDetails>>(
    'music_assistant',
    'get_queue',
    undefined,
    { entity_id: player },
    false,
    true,
  );
  const response = result.response;
  if (!response) throw new Error('The queue response was empty.');
  if (isQueueDetails(response)) return normalizeQueueDetails(response);
  if (typeof response === 'object' && response !== null) {
    const keyed = (response as Record<string, unknown>)[player];
    if (isQueueDetails(keyed)) return normalizeQueueDetails(keyed);
    throw new Error('The queue response did not contain the targeted player.');
  }
  throw new Error('The queue response was invalid.');
}

function isQueueDetails(value: unknown): value is QueueDetails {
  if (!value || typeof value !== 'object') return false;
  const details = value as Partial<QueueDetails>;
  return Array.isArray(details.items) || isQueueItem(details.current_item) || isQueueItem(details.next_item);
}

function normalizeQueueDetails(details: QueueDetails): QueueDetails {
  if (Array.isArray(details.items)) return details;
  const items = [details.current_item, details.next_item].filter(isQueueItem);
  return {
    ...details,
    items,
    current_index: details.current_item ? 0 : undefined,
  };
}

function isQueueItem(value: unknown): value is QueueItem {
  return Boolean(value && typeof value === 'object');
}
