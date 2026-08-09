import type { HomeAssistant } from '../home-assistant';

export interface QueueItem {
  name?: string;
  uri?: string;
  media_type?: string;
  artist?: string;
  album?: string;
  image_url?: string;
  image?: string;
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
  if (isQueueDetails(response)) return response;
  if (typeof response === 'object' && response !== null) {
    const keyed = (response as Record<string, unknown>)[player];
    return isQueueDetails(keyed) ? keyed : {};
  }
  throw new Error('The queue response was invalid.');
}

function isQueueDetails(value: unknown): value is QueueDetails {
  if (!value || typeof value !== 'object') return false;
  const details = value as Partial<QueueDetails>;
  return Array.isArray(details.items);
}
