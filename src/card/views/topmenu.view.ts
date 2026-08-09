import { html, type TemplateResult } from 'lit-html';
import type { PrimaryView } from '../card.types';

export function renderTopMenu(speakerLabel: string, primaryView: PrimaryView): TemplateResult {
  const discover =
    primaryView === 'search'
      ? html`<button
          class="control menu-action"
          data-control="discover"
          type="button"
          aria-label="Close search"
          title="Close search"
        >
          <ha-icon icon="mdi:close"></ha-icon>
        </button>`
      : html`<button
          class="control menu-action"
          data-control="discover"
          type="button"
          aria-label="Open search"
          title="Open search"
        >
          <ha-icon icon="mdi:magnify"></ha-icon>
        </button>`;
  return html`<nav class="top-menu" aria-label="Music controls">
    <button
      class="control menu-action player-action"
      data-control="speaker"
      type="button"
      aria-label="Choose player"
      title="Choose player"
    >
      <ha-icon icon="mdi:speaker"></ha-icon><span class="menu-label">${speakerLabel}</span></button
    ><span class="menu-actions"
      ><button
        class="control menu-action"
        data-control="queue"
        type="button"
        aria-label="Open queue"
        title="Open queue"
      >
        <ha-icon icon="mdi:playlist-music"></ha-icon></button
      >${discover}</span
    >
  </nav>`;
}
