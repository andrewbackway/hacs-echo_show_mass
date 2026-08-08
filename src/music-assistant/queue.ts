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
  const result = await hass.callService<QueueDetails | Record<string, QueueDetails>>('music_assistant', 'get_queue', undefined, { entity_id: player }, false, true);
  const response = result.response;
  if (!response) return {};
  if (Array.isArray((response as QueueDetails).items)) return response as QueueDetails;
  return (response as Record<string, QueueDetails>)[player] ?? {};
}
