import { html, nothing, type TemplateResult } from 'lit-html';
import { repeat } from 'lit-html/directives/repeat.js';
import type { MediaItem } from '../../music-assistant/media-browser';
import type { BrowseState } from '../card.types';

export function renderRowActions(): TemplateResult {
  return html`<span class="row-actions"
    ><button class="control row-action" data-item-action="play" type="button" aria-label="Play now" title="Play now">
      <ha-icon icon="mdi:play"></ha-icon></button
    ><button
      class="control row-action"
      data-item-action="queue"
      type="button"
      aria-label="Add to queue"
      title="Add to queue"
    >
      <ha-icon icon="mdi:playlist-plus"></ha-icon></button
  ></span>`;
}

export function renderMediaList(browseState: BrowseState, items: MediaItem[]): TemplateResult {
  if (browseState.loading) return html`<p class="state" aria-live="polite">Loading media sources...</p>`;
  if (browseState.error) return html`<p class="state error" role="alert">${browseState.error}</p>`;
  if (items.length === 0) return html`<p class="state">This location has no media items.</p>`;
  return html`<div class="media-list">
    ${repeat(
      items,
      (item) => item.media_content_id,
      (item, index) => renderMediaItem(item, index),
    )}
  </div>`;
}

export function renderMediaItem(item: MediaItem, index: number): TemplateResult {
  const icon = item.can_expand
    ? html`<ha-icon icon="mdi:folder-music"></ha-icon>`
    : html`<ha-icon icon="mdi:music-note"></ha-icon>`;
  const thumbnail = item.thumbnail ? html`<img src="${item.thumbnail}" alt="" loading="lazy" />` : icon;
  const metadata = [item.artist, item.album, item.media_class ?? item.media_content_type].filter(Boolean).join(' · ');
  return html`<div
    class="media-row"
    data-item-index="${index}"
    role="${item.can_expand ? 'button' : 'group'}"
    tabindex="${item.can_expand ? '0' : '-1'}"
  >
    <span class="thumb" aria-hidden="true">${thumbnail}</span
    ><span class="media-copy"
      ><span class="media-title">${item.title}</span
      ><span class="media-meta">${metadata || (item.can_expand ? 'Open folder' : 'Media')}</span></span
    >${item.can_play && !item.can_expand ? renderRowActions() : nothing}
  </div>`;
}

export function renderPath(path: MediaItem[]): TemplateResult {
  const root = html`<button class="back-button" data-path-root type="button">
    <ha-icon icon="mdi:home-outline" aria-hidden="true"></ha-icon><span>Media sources</span>
  </button>`;
  if (path.length === 0)
    return html`${root}
      <p class="panel-copy">Choose a source to begin browsing.</p>`;
  const back = html`<button class="back-button" data-path-back type="button">
    <ha-icon icon="mdi:arrow-left" aria-hidden="true"></ha-icon><span>Back</span>
  </button>`;
  return html`<div class="media-list">
    ${root}${back}${path.map(
      (item, index) =>
        html`<button class="back-button" data-path-index="${index}" type="button">
          <ha-icon icon="mdi:chevron-right" aria-hidden="true"></ha-icon><span>${item.title}</span>
        </button>`,
    )}
  </div>`;
}
