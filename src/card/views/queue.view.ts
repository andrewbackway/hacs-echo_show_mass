import { html, nothing, type TemplateResult } from 'lit-html';
import { repeat } from 'lit-html/directives/repeat.js';
import type { QueueItem } from '../../music-assistant/queue';
import type { QueueState } from '../card.types';
import { formatDuration } from '../dom';

export function renderQueue(queueState: QueueState, currentDuration?: number): TemplateResult {
  if (queueState.loading) return html`<div class="queue"><p class="state">Loading queue...</p></div>`;
  if (queueState.error) return html`<div class="queue"><p class="state error">${queueState.error}</p></div>`;
  const items = queueState.details?.items ?? [];
  if (items.length === 0) return html`<div class="queue"><p class="state">Queue is empty.</p></div>`;
  const currentIndex = queueState.details?.current_index ?? -1;
  return html`<div class="queue">
    <div class="queue-list">
      ${repeat(
        items,
        (item, index) => item.queue_item_id ?? `${item.uri ?? 'item'}:${index}`,
        (item, index) => renderQueueItem(item, index === currentIndex, index === currentIndex ? currentDuration : undefined),
      )}
    </div>
  </div>`;
}

export function renderQueueItem(item: QueueItem, current: boolean, currentDuration?: number): TemplateResult {
  const metadata = [item.artist, item.album].filter(Boolean).join(' · ');
  const duration = item.duration ?? currentDuration;
  return html`<div class="queue-row${current ? ' current' : ''}">
    <span class="media-copy"
      ><span class="media-title">${String(item.name ?? 'Untitled')}</span
      ><span class="media-meta">${metadata || 'Queue item'}${duration ? ` · ${formatDuration(duration)}` : ''}</span></span
    ><span class="queue-now-playing">${current ? 'Now playing' : ''}</span
    >${item.queue_item_id
      ? html`<button class="control row-action" data-queue-index="${item.queue_item_id}" type="button" aria-label="Play ${String(item.name ?? 'queue item')}" title="Play queue item">
          <ha-icon icon="mdi:play"></ha-icon>
        </button>`
      : nothing}
    >
  </div>`;
}
