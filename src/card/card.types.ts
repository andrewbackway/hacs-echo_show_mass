import type { HassEntity } from '../home-assistant';
import type { MediaBrowseResponse, MediaItem } from '../music-assistant/media-browser';
import type { QueueDetails } from '../music-assistant/queue';
import type { SearchResponse } from '../music-assistant/search';
import type { LibraryItem, LibraryMediaType } from '../music-assistant/library';

export interface BrowseState {
  loading: boolean;
  error?: string;
  response?: MediaBrowseResponse;
  path: MediaItem[];
}

export interface SearchState {
  query: string;
  loading: boolean;
  error?: string;
  response?: SearchResponse;
}

export type LibraryCategory = 'favorites' | 'recently_played' | LibraryMediaType;

export interface LibraryState {
  selectedCategory: LibraryCategory | null;
  query: string;
  loading: boolean;
  loadingMore: boolean;
  error?: string;
  items: LibraryItem[];
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface QueueState {
  loading: boolean;
  error?: string;
  details?: QueueDetails;
}

export interface SpeakerState {
  loading: boolean;
  error?: string;
  players?: HassEntity[];
  selectedPlayerIds?: string[];
}

export type PrimaryView = 'now-playing' | 'search';
export type FlyoutKind = 'queue' | 'speakers' | 'volume';

export interface CardUiState {
  primaryView: PrimaryView;
  activeFlyout: FlyoutKind | null;
  clearQueueConfirmOpen: boolean;
}

/** Minimal shape of a `media_player` entity state needed by the now-playing view. */
export interface PlayerLike {
  state: string;
  attributes: Record<string, unknown>;
}
