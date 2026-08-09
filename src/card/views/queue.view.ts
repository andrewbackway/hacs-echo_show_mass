import { html, type TemplateResult } from 'lit-html';
import { repeat } from 'lit-html/directives/repeat.js';
import type { QueueItem } from '../../music-assistant/queue';
import type { QueueState } from '../card.types';

export function renderQueue(queueState: QueueState): TemplateResult {
  if (queueState.loading) return html`<div class="queue"><p class="state">Loading queue...</p></div>`;
  if (queueState.error) return html`<div class="queue"><p class="state error">${queueState.error}</p></div>`;
  const items = queueState.details?.items ?? [];
  if (items.length === 0) return html`<div class="queue"><p class="state">Queue is empty.</p></div>`;
  const currentIndex = queueState.details?.current_index ?? -1;
  return html`<div class="queue">
    <div class="queue-list">
      ${repeat(
        items,
        // Queue items have no stable id from the API; uri + position is the best available key.
        (item, index) => `${item.uri ?? 'item'}:${index}`,
        (item, index) => renderQueueItem(item, index === currentIndex),
      )}
    </div>
  </div>`;
}

export function renderQueueItem(item: QueueItem, current: boolean): TemplateResult {
  const metadata = [item.artist, item.album].filter(Boolean).join(' · ');
  return html`<div class="queue-row${current ? ' current' : ''}">
    <span class="media-copy"
      ><span class="media-title">${String(item.name ?? 'Untitled')}</span
      ><span class="media-meta">${metadata || 'Queue item'}</span></span
    >
  </div>`;
}
