// @vitest-environment jsdom
import { render } from 'lit-html';
import { describe, expect, it } from 'vitest';
import { getSearchItemMetadata, renderSearchItem } from './search.view';

describe('search result metadata', () => {
  it('uses the artist as the album result subtitle', () => {
    expect(
      getSearchItemMetadata({
        group: 'albums',
        name: 'Album',
        uri: 'album://1',
        artist: 'Artist',
        album: 'Album',
      }),
    ).toBe('Artist');
  });

  it('uses artist and album for track result subtitles', () => {
    expect(
      getSearchItemMetadata({
        group: 'tracks',
        name: 'Track',
        uri: 'track://1',
        artist: 'Artist',
        album: 'Album',
      }),
    ).toBe('Artist - Album');
  });

  it('does not expose the old breadcrumb expansion route', () => {
    const container = document.createElement('div');
    render(
      renderSearchItem({
        group: 'albums',
        name: 'Album',
        uri: 'album://1',
        artist: 'Artist',
        can_expand: true,
      }),
      container,
    );

    expect(container.querySelector('[data-search-expand="true"]')).toBeNull();
    expect(container.textContent).not.toContain('Open');
  });
});