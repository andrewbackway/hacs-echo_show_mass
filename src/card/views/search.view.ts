import { html, nothing, type TemplateResult } from 'lit-html';
import { flattenSearchResults, type SearchItem } from '../../music-assistant/search';
import type { SearchState } from '../card.types';
import { renderRowActions } from './media-list.view';

export function renderSearchInput(query: string): TemplateResult {
  return html`<label class="search"
    ><ha-icon class="search-icon" icon="mdi:magnify" aria-hidden="true"></ha-icon
    ><input data-search type="search" .value="${query}" placeholder="Search all music" aria-label="Search all music"
  /></label>`;
}

export function renderSearchResults(searchState: SearchState): TemplateResult {
  if (searchState.loading) return html`<p class="state" aria-live="polite">Searching Music Assistant...</p>`;
  if (searchState.error) return html`<p class="state error" role="alert">${searchState.error}</p>`;
  const results = flattenSearchResults(searchState.response ?? {});
  if (results.length === 0) return html`<p class="state">No results for “${searchState.query}”.</p>`;
  const groups = [...new Set(results.map((item) => item.group))];
  return html`${groups.map(
    (group) =>
      html`<section class="result-group">
        <h3 class="result-heading">${group}</h3>
        ${results.filter((item) => item.group === group).map((item) => renderSearchItem(item))}
      </section>`,
  )}`;
}

export function renderSearchItem(item: SearchItem & { group: string }): TemplateResult {
  const metadata = [item.artist, item.album, item.provider].filter(Boolean).join(' · ') || item.group;
  const thumbnail = item.image
    ? html`<img src="${item.image}" alt="" loading="lazy" />`
    : html`<ha-icon icon="mdi:music-note"></ha-icon>`;
  const canExpand = item.can_expand === true;
  const canPlay = item.is_playable !== false;
  return html`<div
    class="media-row"
    data-search-uri="${item.uri}"
    data-search-type="${item.media_type ?? item.group}"
    data-search-expand="${canExpand}"
  >
    <span class="thumb" aria-hidden="true">${thumbnail}</span
    ><span class="media-copy"
      ><span class="media-title">${item.name}</span
      ><span class="media-meta">${canExpand ? `${metadata} · Open` : metadata}</span></span
    >${canPlay ? renderRowActions() : nothing}
  </div>`;
}
