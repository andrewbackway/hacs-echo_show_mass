import type { HomeAssistant } from '../home-assistant';

export type LibraryMediaType = 'artist' | 'album' | 'track' | 'playlist' | 'podcast' | 'radio';

export interface LibraryItem {
  name: string;
  uri: string;
  media_type?: string;
  image?: string;
  artist?: string;
  album?: string;
  provider?: string;
  is_playable?: boolean;
  can_expand?: boolean;
  path?: string;
}

export interface LibraryResponse {
  items: LibraryItem[];
  limit?: number;
  offset?: number;
  order_by?: string;
  media_type?: LibraryMediaType;
}

export interface GetLibraryOptions {
  configEntryId: string;
  mediaType: LibraryMediaType;
  favorite?: boolean;
  search?: string;
  limit: number;
  offset: number;
  orderBy: string;
}

export async function getLibrary(hass: HomeAssistant, options: GetLibraryOptions): Promise<LibraryResponse> {
  const data: Record<string, unknown> = {
    config_entry_id: options.configEntryId,
    media_type: options.mediaType,
    limit: options.limit,
    offset: options.offset,
    order_by: options.orderBy,
  };
  if (options.favorite === true) data.favorite = true;
  if (options.search) data.search = options.search;
  const result = await hass.callService<unknown>('music_assistant', 'get_library', data, undefined, true, true);
  if (!result.response || typeof result.response !== 'object') return { items: [] };
  const response = result.response as Record<string, unknown>;
  const items = Array.isArray(response.items)
    ? response.items.filter(isLibraryItem).map((item) => ({ ...item, media_type: item.media_type ?? options.mediaType }))
    : [];
  return {
    items,
    limit: typeof response.limit === 'number' ? response.limit : undefined,
    offset: typeof response.offset === 'number' ? response.offset : undefined,
    order_by: typeof response.order_by === 'string' ? response.order_by : undefined,
    media_type: typeof response.media_type === 'string' ? (response.media_type as LibraryMediaType) : undefined,
  };
}

function isLibraryItem(value: unknown): value is LibraryItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<LibraryItem>;
  return typeof item.name === 'string' && typeof item.uri === 'string';
}