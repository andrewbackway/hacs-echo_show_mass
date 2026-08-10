import { html, nothing, type TemplateResult } from 'lit-html';
import { formatDuration } from '../dom';
import type { PlayerLike } from '../card.types';

export function renderNowPlaying(player?: PlayerLike, livePosition?: number): TemplateResult {
  const attributes = player?.attributes ?? {};
  const titleValue = typeof attributes.media_title === 'string' ? attributes.media_title.trim() : '';
  const hasCurrentItem = titleValue.length > 0 || player?.state === 'playing' || player?.state === 'paused';
  const title = player ? titleValue || (hasCurrentItem ? 'Now playing' : 'Nothing playing') : 'Player unavailable';
  const artistValue = typeof attributes.media_artist === 'string' ? attributes.media_artist.trim() : '';
  const artist = artistValue;
  const image = typeof attributes.entity_picture === 'string' ? attributes.entity_picture : undefined;
  const mediaContentId = typeof attributes.media_content_id === 'string' ? attributes.media_content_id : '';
  const isFavorite = attributes.media_favorite === true;
  const isPlaying = player?.state === 'playing';
  const duration = Number(attributes.media_duration ?? 0);
  const position = livePosition ?? Number(attributes.media_position ?? 0);
  const repeat = String(attributes.repeat ?? 'off').toLowerCase();
  const repeatIcon = repeat === 'one' ? 'repeat-once' : repeat === 'all' ? 'repeat' : 'repeat-off';
  const repeatClass = repeat === 'off' ? 'muted' : 'active';
  return html`<section class="playback" aria-label="Now playing">
    <div class="now-playing-layout">
      <span class="now-playing-art"
        >${image ? html`<img src="${image}" alt="" />` : html`<ha-icon icon="mdi:music-note"></ha-icon>`}</span
      >
      <div class="now-playing-details">
        <span class="playback-state">${isPlaying ? 'Now playing' : 'Paused'}</span
        ><span class="now-playing-title">${title}</span
        >${artist ? html`<span class="now-playing-subtitle">${artist}</span>` : nothing}
      </div>
    </div>
    <div class="timeline">
      <span>${formatDuration(position)}</span
      ><input
        class="progress"
        data-seek
        type="range"
        min="0"
        max="${duration || 1}"
        .value="${String(Math.min(position, duration || 1))}"
        aria-label="Playback position"
      /><span>${formatDuration(duration)}</span>
    </div>
    <div class="controls now-playing-controls">
      <span class="playback-controls"
        ><button
          class="control primary"
          data-control="play-pause"
          type="button"
          aria-label="${isPlaying ? 'Pause' : 'Play'}"
        >
          <ha-icon icon="mdi:${isPlaying ? 'pause' : 'play'}"></ha-icon></button
        ><button class="control" data-control="next" type="button" aria-label="Next track">
          <ha-icon icon="mdi:skip-next"></ha-icon></button></span
      ><span class="utility-controls"
        ><button
          class="control favorite-control${isFavorite ? ' active' : ''}"
          data-control="favorite"
          type="button"
          aria-label="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}"
          aria-pressed="${isFavorite}"
          ?disabled=${!mediaContentId}
        >
          <ha-icon icon="mdi:star${isFavorite ? '' : '-outline'}"></ha-icon></button
        ><button
          class="control repeat-control ${repeatClass}"
          data-control="repeat"
          type="button"
          aria-label="Change repeat mode"
          aria-pressed="${repeat !== 'off'}"
        >
          <ha-icon icon="mdi:${repeatIcon}"></ha-icon></button
        ><button class="control" data-control="volume" type="button" aria-label="Open volume" title="Open volume">
          <ha-icon icon="mdi:volume-high"></ha-icon></button
      ></span>
    </div>
  </section>`;
}
