# Search Page Plan: Favorites-First Category Library Browser

## Status and approval gate

**Approved for implementation on 2026-08-09.** The plan records the agreed behavior and implementation boundary.

## Required product direction

Search becomes a library browser with a persistent, left-side category rail. The rail must contain these options in this exact order:

1. Favorites
2. Artists
3. Albums
4. Tracks
5. Playlists
6. Podcasts
7. Radio

The selected category controls the content pane. A search box filters the selected library category instead of presenting an unstructured, mixed all-provider result stream.

Desktop/reference layout at $960 \times 480$:

```text
+--------------------------------------------------------------+
| [Search this library                                  ] [X] |
| Favorites     | Favorites                                | |
| Albums        | [art] Name                 [Play] [Queue] | |
| Tracks        | [art] Name                 [Play] [Queue] | |
| Playlists     |                                             | |
| Podcasts      |                                             | |
| Radio         |                                             | |
+--------------------------------------------------------------+
```

The category rail remains fixed while the result list scrolls. On a narrow viewport it becomes a horizontal, scrollable tab row above the result list; it must not disappear, wrap into overlapping controls, or expand the card height.

## Documented API contract

This plan is based on Home Assistant's [Get library items](https://www.home-assistant.io/actions/music_assistant.get_library/) action, reviewed on 2026-08-09.

`music_assistant.get_library`:

- Retrieves concise Music Assistant library items and does not alter playback.
- **Requires** `config_entry_id` and `media_type`.
- Does **not** accept an entity/device/area target.
- Supports `media_type`: `artist`, `album`, `audiobook`, `playlist`, `podcast`, `track`, and `radio`.
- Supports `favorite`, `search`, `limit`, `offset`, `order_by`, `album_type`, and `album_artists_only` filters.
- Responds with `items`, `limit`, `offset`, `order_by`, and `media_type`. Items include at least a name and URI suitable for `music_assistant.play_media`.

The browser will issue the action through the authenticated Home Assistant frontend session:

```ts
await hass.callService<LibraryResponse>(
  'music_assistant',
  'get_library',
  {
    config_entry_id: configuredMusicAssistantEntryId,
    media_type: selectedCategory.mediaType,
    search: normalizedQuery || undefined,
    limit: pageSize,
    offset: nextOffset,
    order_by: 'name',
  },
  undefined,
  true,
  true,
);
```

`search` must be omitted when the query is blank, rather than sending an empty string. The implementation must use the exact response shape returned by a real service call before it assumes optional artwork, artist, album, provider, or capability fields.

## Category-to-call mapping

| Rail label | Documented `media_type` | Initial sort | Result behavior |
| --- | --- | --- | --- |
| Favorites | Six calls: `artist`, `album`, `track`, `playlist`, `podcast`, `radio` with `favorite: true` | `name` | Auto-loaded by default, merged and de-duplicated across all supported media types. |
| Artists | `artist` | `name` | Open the artist detail/library path when the verified payload exposes navigation. Do not claim a result is directly playable unless the response proves it. |
| Albums | `album` | `name` | Open detail when navigation is verified; expose Play/Add only when supported by the returned item. |
| Tracks | `track` | `name` | Play and Add to Queue actions using the returned URI. |
| Playlists | `playlist` | `name` | Open playlist or provide Play/Add according to verified item capabilities. |
| Podcasts | `podcast` | `name` | Open podcast detail or Play/Add only when verified. |
| Radio | `radio` | `name` | Play and Add to Queue using the returned URI when supported. |

## Other required calls

| User operation | Home Assistant API call | Request |
| --- | --- | --- |
| Play a library item now | `hass.callService` | `music_assistant.play_media`, data `{ media_id: item.uri, media_type: selectedCategory.mediaType, enqueue: 'replace' }`, target `{ entity_id: configuredPlayer }` |
| Add a library item to queue | `hass.callService` | `music_assistant.play_media`, data `{ media_id: item.uri, media_type: selectedCategory.mediaType, enqueue: 'add' }`, target `{ entity_id: configuredPlayer }` |
| Refresh queue after enqueue | `hass.callService` | Existing `music_assistant.get_queue` request targeted at `{ entity_id: configuredPlayer }` with `returnResponse: true` |
| Open verified child/detail content | `hass.callWS` | Existing `{ type: 'media_source/browse_media', media_content_id: navigationId }`, only if the live library-item payload identifies a valid navigation ID |

## State and request contract

Replace the current grouped `SearchResponse`-only model with a dedicated category-library state. The query remains page-local and does not clear when the user changes categories.

```ts
type LibraryCategory = 'favorites' | 'artist' | 'album' | 'track' | 'playlist' | 'podcast' | 'radio';

interface LibraryItem {
  name: string;
  uri: string;
  mediaType: Exclude<LibraryCategory, 'favorites'>;
  image?: string;
  artist?: string;
  album?: string;
  provider?: string;
  navigationId?: string;
  isPlayable?: boolean;
  canExpand?: boolean;
}

interface LibraryState {
  selectedCategory: LibraryCategory | null;
  query: string;
  loading: boolean;
  loadingMore: boolean;
  error?: string;
  items: LibraryItem[];
  limit: number;
  offset: number;
  hasMore: boolean;
}
```

Rules:

- Opening Search selects Favorites by default and auto-loads all six documented media types with `favorite: true`. Reopening preserves the selected category, query, items, and scroll position for the active dashboard session.
- Selecting another documented category synchronously highlights it, resets `items`/`offset` to page one, and starts one `get_library` request.
- Input is debounced for $350$ ms. Enter bypasses the waiting period and starts the current request once. An empty query reloads the selected category without the `search` property.
- Each category switch, query change, page request, player/config change, disconnect, and session change advances a request token. Only the latest matching category/query/page token can update state.
- “Load more” is shown only when the returned item count proves another page may exist. It calls the same action with the next `offset`, appends de-duplicated URI values, and cannot run concurrently.
- Failure renders an in-pane alert and Retry; Retry repeats the identical category/query/offset request.
- Favorites fan out into six parallel documented calls on page open; other categories fetch only when selected.

## Configuration requirement: Music Assistant instance ID

The action's `config_entry_id` is required by the official API, but the current card configuration and `HomeAssistant` type do not contain it. The implementation cannot safely obtain it by guessing, parsing an entity ID, or targeting the playback player.

Approved source of truth: add `music_assistant_config_entry_id` to card YAML configuration and expose it in the visual editor. Cards without the ID retain the existing media-source browse fallback, but cannot auto-load Favorites or category library data.

## UI and interaction details

### Category rail

- Render the rail as a semantic navigation list with icon plus text labels. Use existing `ha-icon` icons: `mdi:star`, `mdi:account-music`, `mdi:album`, `mdi:music-note`, `mdi:playlist-music`, `mdi:podcast`, and `mdi:radio`.
- Each rail item is a native button with `aria-current="page"` for the selected category and a stable `data-library-category` value.
- Selected state uses the card accent token and a clear left indicator; unselected items remain readable and touch-sized.
- Categories are shown even when empty so the navigation remains predictable. An empty category displays a category-specific empty state in the content pane.

### Content pane

- Header: selected category name, item count when returned, and the search input. The top-menu close control remains the sole close action.
- Result rows use a fixed thumbnail area, title, compact verified metadata, then right-aligned icon-only Play and Queue controls where allowed.
- Use artwork only when a real response field is verified; otherwise use the existing music-note fallback.
- Container items open on the primary row action. Play/Queue buttons must stop propagation so they do not open the item as well.
- The list owns vertical scrolling. Preserve its scroll position only while the active category/query/items remain unchanged; reset to top after a category or query change.
- Favorites and categories use only the documented media types; Genres are removed from the rail and scope.

## Implementation sequence after approval

1. **Capture live response fixtures.** Verify redacted `get_library` responses for all six documented media types and Favorites behavior in the target installation.
2. **Add a typed library adapter.** Create `src/music-assistant/library.ts` with documented request/response types, strict normalization, and exact `hass.callService` invocation.
3. **Add state and guarded loading.** Extend `src/card/card.types.ts`, `src/card/card-store.ts`, and `src/card.ts` with Favorites fan-out, category selection, pagination, debounce, and request invalidation.
4. **Build the category browser view.** Render the Favorites-first rail, search field, states, library list, and Load More control.
5. **Route actions centrally.** Add delegated category, pagination, row-open, play, and queue routing.
6. **Style both viewports.** Use a fixed left rail at the reference size and a horizontally scrolling compact rail at narrow widths.
7. **Test and validate.** Run focused tests, then `npm test`, `npm run check`, `npm run lint`, `npm run build`, and `git diff --check`, followed by live dashboard review.

## Planned file ownership

| File | Planned responsibility |
| --- | --- |
| `src/music-assistant/library.ts` | New typed `music_assistant.get_library` adapter, documented request fields, response normalization, pagination metadata. |
| `src/music-assistant/adapters.test.ts` | Exact service payload and response normalization fixtures for each documented media type. |
| `src/home-assistant.ts` | Add configuration typing only if the approved instance-ID approach requires it. |
| `src/editor.ts` | Expose `music_assistant_config_entry_id` as an editor field. |
| `src/card/card.types.ts` | `LibraryCategory`, `LibraryItem`, `LibraryState`, and UI state integration. |
| `src/card/card-store.ts` | Initialize/reset library state with the existing store pattern. |
| `src/card.ts` | Guarded library loader, debounce, page orchestration, and Search render composition. |
| `src/card/views/search.view.ts` | Category rail, library list, states, and page controls. |
| `src/card/events.ts` | Delegated category, load-more, row-open, play, and queue event routing. |
| `src/card/card.styles.ts` | Responsive rail/content-pane layout, scrolling, selected/focus/touch states. |
| `src/card.test.ts`, `src/card.render.test.ts` | User-visible interaction, request guarding, DOM stability, and accessible controls. |
| `README.md` | Document the approved instance-ID configuration and the category-browser behavior. |

## Test matrix

| Scenario | Verification |
| --- | --- |
| Initial Search view | Favorites rail item is selected; six parallel `get_library` requests occur after the instance ID is available. |
| Category selection | Each documented rail item sends the matching `media_type` with `config_entry_id`, `limit`, `offset`, and `order_by`; previous results cannot overwrite the new category. |
| Blank/category query | Request omits `search`; results represent that category's library. |
| Typed filtering | One request occurs after $350$ ms with `search: normalizedQuery`; Enter runs immediately without a duplicate delayed request. |
| Pagination | A next-page request advances `offset`, appends unique URIs, preserves existing rows, and cannot race or duplicate. |
| Play/queue | The returned URI and category media type are passed exactly to `music_assistant.play_media` with `replace` or `add`. |
| Container item | Verified navigation opens only through the verified browse route; Play/Queue does not trigger navigation. |
| Error/retry | Failure shows an alert, retains category/query, and Retry repeats the same request. |
| Favorites | Six documented media-type calls use `favorite: true`, merge results, and de-duplicate URIs. |
| Accessibility/layout | Selected category announces current page; rail and content remain independently usable at $960 \times 480$ and narrow width, with no clipped/overlapping controls. |

## Approved decisions

1. `music_assistant_config_entry_id` is added to card configuration and the visual editor.
2. Genres are removed from the rail and implementation scope.
3. Page size is 50, sorted with `order_by: 'name'`; Load More advances `offset += returnedItems.length`.
4. Artists, Albums, Playlists, and Podcasts open details on primary-row tap by default when navigation is verified.
5. With no category selected, the existing `music_assistant.search` action searches across all media types.

## Definition of done

The approved category browser has Favorites first, followed by Artists, Albums, Tracks, Playlists, Podcasts, and Radio; auto-loads Favorites across all documented media types; uses a configured `config_entry_id`; supports global search when no category is selected; passes focused tests and repository checks; and is visually verified in the live Home Assistant dashboard.
