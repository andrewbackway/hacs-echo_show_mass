import { html, nothing, type TemplateResult } from 'lit-html';
import { repeat } from 'lit-html/directives/repeat.js';
import { flattenSearchResults, type SearchItem } from '../../music-assistant/search';
import type { SearchState } from '../card.types';
import type { LibraryCategory, LibraryState } from '../card.types';
import type { LibraryItem } from '../../music-assistant/library';
import { renderRowActions } from './media-list.view';

export function renderSearchInput(query: string): TemplateResult {
  return html`<label class="search"
    ><ha-icon class="search-icon" icon="mdi:magnify" aria-hidden="true"></ha-icon
    ><input data-search type="search" .value="${query}" placeholder="Search all music" aria-label="Search all music"
  /></label>`;
}

const libraryCategories: Array<{ id: LibraryCategory; label: string; icon: string }> = [
  { id: 'favorites', label: 'Favorites', icon: 'mdi:star' },
  { id: 'artist', label: 'Artists', icon: 'mdi:account-music' },
  { id: 'album', label: 'Albums', icon: 'mdi:album' },
  { id: 'track', label: 'Tracks', icon: 'mdi:music-note' },
  { id: 'playlist', label: 'Playlists', icon: 'mdi:playlist-music' },
  { id: 'podcast', label: 'Podcasts', icon: 'mdi:podcast' },
  { id: 'radio', label: 'Radio', icon: 'mdi:radio' },
];

export function renderLibraryNavigation(selectedCategory: LibraryCategory | null): TemplateResult {
  return html`<nav class="library-navigation swiper" data-swiper="library-navigation" data-swiper-responsive="horizontal" aria-label="Music library categories">
    <div class="swiper-wrapper">
      ${libraryCategories.map(
        (category) => html`<div class="swiper-slide">
          <button
            class="library-category${selectedCategory === category.id ? ' selected' : ''}"
            data-control="library-category:${category.id}"
            type="button"
            aria-current=${selectedCategory === category.id ? 'page' : nothing}
          >
            <ha-icon icon="${category.icon}"></ha-icon><span>${category.label}</span>
          </button>
        </div>`,
      )}
    </div>
  </nav>`;
}

export function renderLibraryResults(libraryState: LibraryState): TemplateResult {
  if (!libraryState.selectedCategory)
    return libraryState.query ? html`<p class="state">Search all music to see results.</p>` : html`<p class="state">Select a library category.</p>`;
  if (libraryState.loading) return html`<p class="state" aria-live="polite">Loading ${libraryState.selectedCategory}...</p>`;
  if (libraryState.error) return html`<p class="state error" role="alert">${libraryState.error}</p>`;
  if (libraryState.items.length === 0)
    return html`<p class="state">No ${libraryState.query ? `results for “${libraryState.query}”` : 'items'}.</p>`;
  return html`<div class="library-list swiper" data-swiper="library-results">
    <div class="swiper-wrapper">
      ${repeat(
        libraryState.items,
        (item) => item.uri,
        (item) => html`<div class="swiper-slide">${renderLibraryItem(item, libraryState.selectedCategory!)}</div>`,
      )}
      ${libraryState.hasMore
        ? html`<div class="swiper-slide">
            <button class="control load-more" data-control="library-load-more" type="button" ?disabled=${libraryState.loadingMore}>
              ${libraryState.loadingMore ? 'Loading...' : 'Load more'}
            </button>
          </div>`
        : nothing}
    </div>
  </div>`;
}

function renderLibraryItem(item: LibraryItem, category: LibraryCategory): TemplateResult {
  const canExpand = item.can_expand === true || ['artist', 'album', 'playlist', 'podcast'].includes(category);
  const canPlay = item.is_playable !== false && category !== 'artist';
  const mediaType = item.media_type ?? (category === 'favorites' ? 'track' : category);
  const metadata = [item.artist, item.album, item.provider].filter(Boolean).join(' · ') || category;
  const thumbnail = item.image
    ? html`<img src="${item.image}" alt="" loading="lazy" />`
    : html`<ha-icon icon="mdi:music-note"></ha-icon>`;
  return html`<div
    class="media-row"
    data-search-uri="${item.uri}"
    data-search-type="${mediaType}"
    data-search-expand="${canExpand}"
    role="${canExpand ? 'button' : 'group'}"
    tabindex="${canExpand ? '0' : '-1'}"
  >
    <span class="thumb" aria-hidden="true">${thumbnail}</span
    ><span class="media-copy"><span class="media-title">${item.name}</span><span class="media-meta">${metadata}</span></span
    >${canPlay ? renderRowActions() : nothing}
  </div>`;
}

export function renderSearchResults(searchState: SearchState): TemplateResult {
  if (searchState.loading) return html`<p class="state" aria-live="polite">Searching Music Assistant...</p>`;
  if (searchState.error) return html`<p class="state error" role="alert">${searchState.error}</p>`;
  const results = flattenSearchResults(searchState.response ?? {});
  if (results.length === 0) return html`<p class="state">No results for “${searchState.query}”.</p>`;
  const groups = [...new Set(results.map((item) => item.group))];
  return html`<div class="search-result-list swiper" data-swiper="search-results">
    <div class="swiper-wrapper">
      ${groups.map(
        (group) =>
          html`<section class="result-group swiper-slide">
            <h3 class="result-heading">${group}</h3>
            ${repeat(
              results.filter((item) => item.group === group),
              (item) => item.uri,
              (item) => renderSearchItem(item),
            )}
          </section>`,
      )}
    </div>
  </div>`;
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
