import { describe, expect, it, vi } from 'vitest';
import { CardStore } from './card-store';

describe('CardStore', () => {
  it('notifies once and applies the patch for a normal setState call', () => {
    const onChange = vi.fn();
    const store = new CardStore(onChange);
    store.setState({ operationError: 'first' });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(store.getState().operationError).toBe('first');
  });

  it('coalesces a setState made synchronously from inside onChange into one follow-up notification', () => {
    let reentered = false;
    const onChange = vi.fn(() => {
      if (!reentered) {
        reentered = true;
        store.setState({ uiState: { ...store.getState().uiState, clearQueueConfirmOpen: true } });
      }
    });
    const store = new CardStore(onChange);

    store.setState({ operationError: 'triggering' });

    // One call for the initial setState, one for the reentrant setState made inside onChange —
    // not zero (it must still run) and not more (it must not recurse into overlapping renders).
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(store.getState().uiState.clearQueueConfirmOpen).toBe(true);
    expect(store.getState().operationError).toBe('triggering');
  });
});
