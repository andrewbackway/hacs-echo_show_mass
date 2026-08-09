import type { HomeAssistant } from '../home-assistant';

export type SearchGroup = 'artists' | 'albums' | 'tracks' | 'playlists' | 'radio' | 'audiobooks' | 'podcasts';

export interface SearchItem {
  name: string;
  uri: string;
  path?: string;
  media_type?: string;
  is_playable?: boolean;
  can_expand?: boolean;
  children?: SearchItem[];
  artist?: string;
  album?: string;
  image?: string;
  provider?: string;
}

export type SearchResponse = Partial<Record<SearchGroup, SearchItem[]>>;

export async function searchMusicAssistant(hass: HomeAssistant, query: string): Promise<SearchResponse> {
  const result = await hass.callService<unknown>(
    'music_assistant',
    'search',
    {
      name: query,
      limit: 12,
    },
    undefined,
    true,
    true,
  );
  if (!result.response || typeof result.response !== 'object') return {};
  const response = result.response as Record<string, unknown>;
  const normalized: SearchResponse = {};
  for (const group of Object.keys(response) as SearchGroup[]) {
    const items = response[group];
    if (!Array.isArray(items)) continue;
    normalized[group] = items.filter(isSearchItem);
  }
  return normalized;
}

function isSearchItem(value: unknown): value is SearchItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<SearchItem>;
  return typeof item.name === 'string' && typeof item.uri === 'string';
}

export function flattenSearchResults(response: SearchResponse): Array<SearchItem & { group: SearchGroup }> {
  return (Object.entries(response) as Array<[SearchGroup, SearchItem[] | undefined]>).flatMap(([group, items]) =>
    (items ?? []).map((item) => ({ ...item, group })),
  );
}
