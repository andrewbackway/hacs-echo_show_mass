import { applySpeakerSelection, handleControl, playMedia, playQueueItem, runAction, runSpeakerAction } from './actions';
import type { ActionContext } from './actions';

const CLICK_TARGET_SELECTOR =
  '[data-speaker-action], [data-speaker-id], [data-item-action], [data-item-index], [data-search-uri], [data-control], [data-queue-index]';

/**
 * Builds the card's single delegated click handler. Routing is a sequence of dataset-attribute
 * checks (an element can match more than one, so order is significant) that each dispatch to a
 * named action function instead of inlining the logic.
 */
export function createClickHandler(context: ActionContext): (event: Event) => void {
  return (event) => {
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>(CLICK_TARGET_SELECTOR) : null;
    if (!target) return;

    if (target.dataset.speakerId) {
      const config = context.getConfig();
      const speakerState = context.getState().speakerState;
      const selected = new Set(speakerState.selectedPlayerIds ?? (config?.player ? [config.player] : []));
      if (target.dataset.speakerId === config?.player) return;
      if (selected.has(target.dataset.speakerId)) selected.delete(target.dataset.speakerId);
      else selected.add(target.dataset.speakerId);
      context.setState({ speakerState: { ...speakerState, selectedPlayerIds: [...selected] } });
      return;
    }

    if (target.dataset.speakerAction) {
      if (target.dataset.speakerAction === 'apply') {
        void runAction(context, () => applySpeakerSelection(context));
        return;
      }
      const targetPlayerId = target.dataset.speakerTarget;
      if (!targetPlayerId) return;
      void runAction(context, () => runSpeakerAction(context, target.dataset.speakerAction ?? '', targetPlayerId));
      return;
    }

    if (target.dataset.itemAction) {
      const row = target.closest<HTMLElement>('[data-item-index], [data-search-uri]');
      const option = target.dataset.itemAction === 'queue' ? 'add' : 'replace';
      if (row?.dataset.itemIndex !== undefined) {
        const item = context.getState().browseState.response?.children[Number(row.dataset.itemIndex)];
        if (item && !item.can_expand)
          void runAction(context, async () => {
            if (option === 'replace') {
              const uiState = context.getState().uiState;
              context.setState({ uiState: { ...uiState, primaryView: 'now-playing' } });
            }
            await playMedia(context, item.media_content_id, item.media_content_type, option);
          });
      } else if (row?.dataset.searchUri) {
        const searchUri = row.dataset.searchUri;
        void runAction(context, async () => {
          if (option === 'replace') {
            const uiState = context.getState().uiState;
            context.setState({ uiState: { ...uiState, primaryView: 'now-playing' } });
          }
          await playMedia(context, searchUri, row.dataset.searchType ?? 'music', option);
        });
      }
      return;
    }

    if (target.dataset.itemIndex !== undefined) {
      const browseState = context.getState().browseState;
      const item = browseState.response?.children[Number(target.dataset.itemIndex)];
      if (!item) return;
      if (item.can_expand) void context.loadMedia(item.media_content_id, [...browseState.path, item]);
      else void runAction(context, () => playMedia(context, item.media_content_id, item.media_content_type));
      return;
    }

    if (target.dataset.searchUri) {
      void runAction(context, () =>
        playMedia(context, target.dataset.searchUri as string, target.dataset.searchType ?? 'music'),
      );
      return;
    }

    if (target.dataset.queueIndex !== undefined) {
      void runAction(context, async () => {
        await playQueueItem(context, target.dataset.queueIndex as string);
        const uiState = context.getState().uiState;
        context.setState({ uiState: { ...uiState, activeFlyout: null } });
      });
      return;
    }

    void runAction(context, () => handleControl(context, target.dataset.control ?? ''));
  };
}
