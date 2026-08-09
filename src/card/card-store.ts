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

/** Holds the card's render state and notifies `onChange` after each `setState` call. */
export class CardStore {
  private state: CardState = createInitialState();
  private readonly onChange: () => void;
  private notifying = false;
  private pendingNotify = false;

  constructor(onChange: () => void) {
    this.onChange = onChange;
  }

  getState(): CardState {
    return this.state;
  }

  setState(patch: Partial<CardState>): void {
    this.state = { ...this.state, ...patch };
    this.notify();
  }

  reset(): void {
    this.state = createInitialState();
  }

  // Coalesces a setState triggered synchronously from inside an in-flight onChange (e.g. a
  // render or event handler that immediately calls setState again) into a single follow-up
  // notification, instead of letting it recurse into a second overlapping render pass.
  private notify(): void {
    if (this.notifying) {
      this.pendingNotify = true;
      return;
    }
    this.notifying = true;
    try {
      this.onChange();
    } finally {
      this.notifying = false;
    }
    if (this.pendingNotify) {
      this.pendingNotify = false;
      this.notify();
    }
  }
}
