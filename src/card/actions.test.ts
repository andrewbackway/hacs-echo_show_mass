import { describe, expect, it, vi } from 'vitest';
import type { HomeAssistant } from '../home-assistant';
import { createInitialState, type CardState } from './card-store';
import { applySpeakerSelection, runSpeakerAction, type ActionContext } from './actions';

function createContext(selectedPlayerIds: string[]): { context: ActionContext; callService: HomeAssistant['callService'] } {
  const callService = vi.fn().mockResolvedValue({});
  const state: CardState = {
    ...createInitialState(),
    speakerState: { loading: false, selectedPlayerIds },
  };
  const context: ActionContext = {
    getHass: () => ({ states: {}, callService }),
    getConfig: () => ({ type: 'custom:music-assistant-card', player: 'media_player.living_room' }),
    getState: () => state,
    setState: vi.fn(),
    isQueueRequested: () => false,
    setQueueRequested: vi.fn(),
    loadQueue: vi.fn().mockResolvedValue(undefined),
    loadMedia: vi.fn().mockResolvedValue(undefined),
    loadSpeakers: vi.fn().mockResolvedValue(undefined),
    loadLibrary: vi.fn().mockResolvedValue(undefined),
    getCurrentSpeakerSelection: () => ['media_player.living_room'],
  };
  return { context, callService };
}

describe('applySpeakerSelection', () => {
  it('sends added players as group_members to the current player', async () => {
    const { context, callService } = createContext(['media_player.living_room', 'media_player.kitchen']);

    await applySpeakerSelection(context);

    expect(callService).toHaveBeenCalledWith(
      'media_player',
      'join',
      { group_members: ['media_player.kitchen'] },
      { entity_id: 'media_player.living_room' },
      true,
      false,
    );
  });
});

describe('runSpeakerAction', () => {
  it('transfers the current queue to the selected player through Music Assistant', async () => {
    const { context, callService } = createContext(['media_player.living_room']);

    await runSpeakerAction(context, 'transfer', 'media_player.kitchen');

    expect(callService).toHaveBeenCalledWith(
      'music_assistant',
      'transfer_queue',
      { source_player: 'media_player.living_room', auto_play: true },
      { entity_id: 'media_player.kitchen' },
      true,
      false,
    );
  });
});
