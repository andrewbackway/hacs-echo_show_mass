import type { BrowseState, CardUiState, QueueState, SearchState, SpeakerState } from './card.types';

export interface CardState {
  browseState: BrowseState;
  searchState: SearchState;
  queueState: QueueState;
  speakerState: SpeakerState;
  uiState: CardUiState;
  operationError?: string;
}

export function createInitialState(): CardState {
  return {
    browseState: { loading: false, path: [] },
    searchState: { query: '', loading: false },
    queueState: { loading: false },
    speakerState: { loading: false },
    uiState: { primaryView: 'now-playing', activeFlyout: null, clearQueueConfirmOpen: false },
  };
}

/** Holds the card's render state and triggers exactly one `onChange` per `setState` call. */
export class CardStore {
  private state: CardState = createInitialState();
  private readonly onChange: () => void;

  constructor(onChange: () => void) {
    this.onChange = onChange;
  }

  getState(): CardState {
    return this.state;
  }

  setState(patch: Partial<CardState>): void {
    this.state = { ...this.state, ...patch };
    this.onChange();
  }

  reset(): void {
    this.state = createInitialState();
  }
}
