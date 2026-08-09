import { flattenSearchResults } from '../music-assistant/search';
import { toMediaItemFromSearch } from './dom';
import { applySpeakerSelection, callService, handleControl, playMedia, runAction, runSpeakerAction } from './actions';
import type { ActionContext } from './actions';

export const ROOT_MEDIA_ID = 'media-source://';

const CLICK_TARGET_SELECTOR =
  '[data-speaker-action], [data-speaker-id], [data-item-action], [data-item-index], [data-search-uri], [data-path-index], [data-path-root], [data-path-back], [data-control], [data-queue-index]';

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
          void runAction(context, () => playMedia(context, item.media_content_id, item.media_content_type, option));
      } else if (row?.dataset.searchUri) {
        const searchUri = row.dataset.searchUri;
        void runAction(context, () => playMedia(context, searchUri, row.dataset.searchType ?? 'music', option));
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
      const { browseState, searchState } = context.getState();
      if (target.dataset.searchExpand === 'true') {
        const searchItem = flattenSearchResults(searchState.response ?? {}).find(
          (item) => item.uri === target.dataset.searchUri,
        );
        if (searchItem)
          void context.loadMedia(target.dataset.searchUri, [...browseState.path, toMediaItemFromSearch(searchItem)]);
      } else {
        void runAction(context, () =>
          playMedia(context, target.dataset.searchUri as string, target.dataset.searchType ?? 'music'),
        );
      }
      return;
    }

    if (target.dataset.pathRoot !== undefined) {
      void context.loadMedia(ROOT_MEDIA_ID, []);
      return;
    }

    if (target.dataset.pathBack !== undefined) {
      const parentPath = context.getState().browseState.path.slice(0, -1);
      void context.loadMedia(parentPath.at(-1)?.media_content_id ?? ROOT_MEDIA_ID, parentPath);
      return;
    }

    if (target.dataset.pathIndex !== undefined) {
      const index = Number(target.dataset.pathIndex);
      const path = context.getState().browseState.path;
      const pathTarget = path[index];
      void context.loadMedia(pathTarget?.media_content_id ?? ROOT_MEDIA_ID, path.slice(0, index + 1));
      return;
    }

    if (target.dataset.queueIndex !== undefined) {
      const index = Number(target.dataset.queueIndex);
      void runAction(context, async () => {
        const items = context.getState().queueState.details?.items;
        await callService(context, 'media_player', 'play_media', {
          media_content_id: items?.[index]?.uri,
          media_content_type: items?.[index]?.media_type,
        });
        await context.loadQueue();
        const uiState = context.getState().uiState;
        context.setState({ uiState: { ...uiState, activeFlyout: null } });
      });
      return;
    }

    void runAction(context, () => handleControl(context, target.dataset.control ?? ''));
  };
}
