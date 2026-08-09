import { describe, expect, it } from 'vitest';
import { formatDuration, formatMediaValue, getGroupMembers, toMediaItemFromSearch } from './dom';

describe('formatMediaValue', () => {
  it('extracts display text from structured media metadata', () => {
    expect(formatMediaValue({ name: 'Artist' })).toBe('Artist');
    expect(formatMediaValue({ title: 'Album' })).toBe('Album');
  });

  it('returns an empty string for unsupported metadata', () => {
    expect(formatMediaValue({ uri: 'artist://1' })).toBe('');
    expect(formatMediaValue(undefined)).toBe('');
  });
});

describe('formatDuration', () => {
  it('formats seconds as m:ss', () => {
    expect(formatDuration(75)).toBe('1:15');
    expect(formatDuration(5)).toBe('0:05');
  });

  it('returns 0:00 for non-finite or non-positive values', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(-4)).toBe('0:00');
    expect(formatDuration(Number.NaN)).toBe('0:00');
  });
});

describe('toMediaItemFromSearch', () => {
  it('maps a search item to a media item', () => {
    expect(
      toMediaItemFromSearch({
        name: 'Song',
        uri: 'track://1',
        media_type: 'track',
        can_expand: true,
        artist: 'Artist',
      }),
    ).toEqual({
      media_content_id: 'track://1',
      media_content_type: 'track',
      title: 'Song',
      thumbnail: undefined,
      can_play: true,
      can_expand: true,
      artist: 'Artist',
      album: undefined,
    });
  });
});

describe('getGroupMembers', () => {
  it('returns string group members and filters out invalid entries', () => {
    const entity = {
      entity_id: 'media_player.a',
      state: 'idle',
      attributes: { group_members: ['media_player.a', 'media_player.b', 1] },
    };
    expect(getGroupMembers(entity)).toEqual(['media_player.a', 'media_player.b']);
  });

  it('returns an empty array when group_members is missing', () => {
    expect(getGroupMembers({ entity_id: 'media_player.a', state: 'idle', attributes: {} })).toEqual([]);
  });
});
