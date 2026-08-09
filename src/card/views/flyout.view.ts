import { html, nothing, type TemplateResult } from 'lit-html';
import type { CardUiState, QueueState, SpeakerState } from '../card.types';
import { renderQueue } from './queue.view';
import { renderSpeakerSheet } from './speakers.view';

export function renderQueueHeader(shuffleEnabled: boolean): TemplateResult {
  return html`<div class="flyout-header">
    <h2 class="panel-title">Queue</h2>
    <span class="queue-header-actions"
      ><button
        class="queue-action"
        data-control="clear-queue-request"
        type="button"
        aria-label="Clear queue"
        title="Clear queue"
      >
        <ha-icon icon="mdi:close"></ha-icon></button
      ><button
        class="queue-action${shuffleEnabled ? ' active' : ''}"
        data-control="shuffle"
        type="button"
        aria-pressed="${shuffleEnabled}"
        aria-label="Toggle shuffle"
        title="Toggle shuffle"
      >
        <ha-icon icon="mdi:shuffle"></ha-icon></button
      ><button class="queue-action" data-control="close-flyout" type="button" aria-label="Close Queue" title="Close">
        <ha-icon icon="mdi:close"></ha-icon></button
    ></span>
  </div>`;
}

export function renderVolumeFlyout(volumePercent: number): TemplateResult {
  const volume = Math.max(0, Math.min(100, Math.round(volumePercent)));
  return html`<div class="volume-flyout-body">
    <ha-control-slider
      class="volume-slider-flyout"
      data-volume
      min="0"
      max="100"
      step="1"
      value="${volume}"
      vertical
      show-handle
      tooltip-mode="never"
      aria-label="Volume"
    ></ha-control-slider>
  </div>`;
}

export interface ActiveFlyoutParams {
  activeFlyout: CardUiState['activeFlyout'];
  clearQueueConfirmOpen: boolean;
  queueState: QueueState;
  speakerState: SpeakerState;
  currentPlayerId?: string;
  volumePercent: number;
}

export function renderActiveFlyout(params: ActiveFlyoutParams): TemplateResult | typeof nothing {
  const { activeFlyout, clearQueueConfirmOpen, queueState, speakerState, currentPlayerId, volumePercent } = params;
  if (!activeFlyout) return nothing;
  const title = activeFlyout === 'queue' ? 'Queue' : activeFlyout === 'speakers' ? 'Players' : 'Volume';
  const body =
    activeFlyout === 'queue'
      ? renderQueue(queueState)
      : activeFlyout === 'speakers'
        ? renderSpeakerSheet(speakerState, currentPlayerId)
        : renderVolumeFlyout(volumePercent);
  const confirmation = clearQueueConfirmOpen
    ? html`<div class="confirm-backdrop">
        <section class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="clear-queue-title">
          <h2 class="panel-title" id="clear-queue-title">Clear queue?</h2>
          <p class="panel-copy">This removes all queued items.</p>
          <div class="confirm-actions">
            <button class="control" data-control="clear-queue-cancel" type="button">Cancel</button
            ><button class="control danger" data-control="clear-queue-confirm" type="button">Clear queue</button>
          </div>
        </section>
      </div>`
    : nothing;
  const header =
    activeFlyout === 'queue'
      ? renderQueueHeader(queueState.details?.shuffle_enabled === true)
      : html`<div class="flyout-header">
          <h2 class="panel-title">${title}</h2>
          <button class="control" data-control="close-flyout" type="button" aria-label="Close ${title}" title="Close">
            <ha-icon icon="mdi:close"></ha-icon>
          </button>
        </div>`;
  return html`<button
      class="flyout-backdrop"
      data-control="close-flyout"
      type="button"
      aria-label="Close ${title}"
    ></button>
    <aside class="flyout" data-flyout="${activeFlyout}" aria-label="${title}">
      ${header}
      <div class="flyout-body">${body}</div>
    </aside>
    ${confirmation}`;
}
