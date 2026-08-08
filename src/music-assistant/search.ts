import type { HomeAssistant } from '../home-assistant';

export type SearchGroup = 'artists' | 'albums' | 'tracks' | 'playlists' | 'radio' | 'audiobooks' | 'podcasts';

export interface SearchItem {
  name: string;
  uri: string;
  media_type?: string;
  artist?: string;
  album?: string;
  image?: string;
  provider?: string;
}

export type SearchResponse = Partial<Record<SearchGroup, SearchItem[]>>;

export async function searchMusicAssistant(
  hass: HomeAssistant,
  query: string,
  configEntryId: string,
): Promise<SearchResponse> {
  const result = await hass.callService<SearchResponse>('music_assistant', 'search', {
    config_entry_id: configEntryId,
    name: query,
    limit: 12,
  }, undefined, true, true);
  return result.response ?? {};
}

export function flattenSearchResults(response: SearchResponse): Array<SearchItem & { group: SearchGroup }> {
  return (Object.entries(response) as Array<[SearchGroup, SearchItem[] | undefined]>).flatMap(([group, items]) =>
    (items ?? []).map((item) => ({ ...item, group })),
  );
}