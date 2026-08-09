import type { HassEntity } from '../home-assistant';
import type { MediaBrowseResponse, MediaItem } from '../music-assistant/media-browser';
import type { QueueDetails } from '../music-assistant/queue';
import type { SearchResponse } from '../music-assistant/search';

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
