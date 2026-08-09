# Echo Show UI Redesign Plan

## Status

**Phases 1-6 partially implemented.** The shell/state foundation, Now Playing playback layout, Queue flyout, speaker selection, playlist success behavior, and Search/Browse navigation are in the repository. Final flyout and live visual refinements remain pending.

> **Note (post API-stack migration & architecture refactor):** the "Technical Handoff Specification" section below predates both the HA-only API migration (see `API_STACK_MIGRATION_PLAN.md`) and the `src/card/*` module split (see `ARCHITECTURE_REFACTOR_PLAN.md`). References to Music Assistant ingress, `MusicAssistantTransport`, and `src/music-assistant/api.ts` describe an architecture that was not carried forward — the card now calls Music Assistant exclusively through `hass.callService`/`hass.callWS`, and rendering/actions/events live under `src/card/` rather than a single `src/card.ts` monolith. Treat file paths in that section as historical context, not current locations.

## Pending Approval: Layout Refinement Plan

**No application code changes are authorized by this section until explicit approval.** This plan covers the next deployed-review findings and the requested Now Playing reflow.

### Scope and ownership

> Paths below are updated to reflect the post-refactor `src/card/*` module split; the render functions are now pure functions, not `MusicAssistantCard` methods.

| File | Planned change | Reason |
| --- | --- | --- |
| `src/card/card.styles.ts`, `src/card/views/topmenu.view.ts`, `src/card/views/now-playing.view.ts`, `src/card/views/speakers.view.ts`, `src/card/views/queue.view.ts` | Update `cardStyles`, `renderTopMenu`, `renderNowPlaying`, `renderSpeakerSheet`, `renderQueue`, and `renderQueueItem`. | These render the affected surfaces and own their layout. |
| `src/music-assistant/queue.ts` | Extend `QueueDetails`/`QueueItem` only if live queue responses expose a duration field (there is no separate `api.ts` adapter layer; adapters live directly under `src/music-assistant/`). | Duration must be displayed from a verified native payload, never inferred from queue position. |
| `src/music-assistant/queue.ts` | Normalize the verified queue duration field into `QueueItem` if it differs from the ingress type. | Keeps the queue display model typed. |
| `src/card.test.ts` | Add DOM/action assertions for each changed layout contract. | Prevents duplicate headers, duplicated close controls, and rearranged controls from regressing. |
| `UI_REDESIGN_PLAN.md` | Mark this section implemented only after live review at the reference viewport. | Keeps the approval and verification record accurate. |

### Speaker flyout: Players

1. Rename the flyout title from **Speakers** to **Players** in the generic flyout title mapping and accessible label.
2. Retain a single `.speaker-row` border. Make `.speaker-select` a full-row, left-aligned text control with no visual border/background of its own. Its selected state remains on the outer row only.
3. Make player text explicitly left aligned: `.speaker-select { justify-content: flex-start; text-align: left; }`, with `.media-copy` consuming the available width.
4. Remove the redundant Cancel control and its `data-speaker-action="cancel"` event branch. Closing with the flyout `X` or backdrop continues to discard staged selection by resetting it on close.
5. Move Apply into a non-scrolling sticky footer at the bottom of the flyout body. The list becomes the only scrolling region. Apply remains touch-sized and uses the existing staged reconciliation behavior.
6. Remove the button chrome from the transfer action: preserve `data-speaker-action="transfer"`, its accessible name, focus state, and touch target, but render it as an icon-only action with no border/background at rest.

### Queue flyout

1. Keep exactly one Queue header. The generic flyout header remains suppressed for Queue.
2. Render the Queue title, Clear, Shuffle, and Close actions in the single Queue header row. Clear and Shuffle remain adjacent; Close remains the final header action.
3. Extend `renderQueueItem()` to include a compact square thumbnail before queue metadata. Use `item.image_url` first, then `item.image`; fall back to the existing music-note visual when neither is present.
4. Render a formatted duration in the queue metadata row. Verify the current Music Assistant queue payload and normalize the authoritative field, expected to be a finite number of seconds. Hide duration rather than render a false value when it is absent or invalid.
5. Keep the existing current-item indicator, queue-index selection command, confirmation-before-clear behavior, and fixed header/list-scroll boundary.

### Search and Browse

1. Remove the in-content Search header close button from the `primary-header` template.
2. Restore the top-menu close button only while `primaryView === 'search'`; it becomes the sole Search close action and retains `data-control="discover"`.
3. Keep the Search heading and preserve current query/results/breadcrumb state when closing and reopening Search.

### Top menu

1. Split `.top-menu` into a full-width header rail rather than an upper-right-only overlay.
2. Place the current player trigger and its label at the far left of that rail. It continues to open the Players flyout.
3. Place Queue, Playlist, and Search/Close actions in a right-aligned action cluster. The player-name label retains ellipsis behavior but receives a wider bounded column so it cannot push action icons off-screen.
4. Update Now Playing/Search safe-area padding to reserve the full header rail, rather than only the right half.

### Now Playing reflow

Target structure:

```text
+ Player name                                      [queue] [playlist] [search] +
| [cover art]                                                               |
|                                                                            |
| Title / album metadata spans the usable content width                     |
| ------------------------------------------------------------------------- |
| 0:00 --------------------------- full-width progress ---------------- 3:42|
| [play] [next]                                  [favorite]  [repeat]   [vol]|
+----------------------------------------------------------------------------+
```

1. Replace the current three-column `.now-playing-layout` with a grid where the art has its own row/area and metadata spans the usable content width rather than remaining in a narrow side column.
2. Increase the requested artwork maximum from $128$ px to $256$ px. To preserve the Echo Show height budget, set the actual artwork size with a height-aware clamp, e.g. `min(256px, available-content-height)`, and retain a smaller fallback at constrained heights. The live reference validation must confirm whether the full $256$ px is feasible below dashboard chrome.
3. Move the progress/timeline out of its constrained metadata relationship. It becomes a full-width row below title/album and above controls. Keep elapsed/duration labels at the row edges and use the remaining width for the slider.
4. Split the control row into a left playback cluster and a right utility cluster. Left: Play/Pause, Next. Right: Favorite, Repeat, Volume.
5. Right-align the utility cluster. Apply a deliberate double gap between Repeat and Volume only; Favorite remains the leftmost utility action.
6. Move Favorite out of `.now-playing-layout`; retain its disabled safety condition and `aria-pressed` semantics.
7. Preserve repeat-mode icon/state behavior and volume flyout trigger behavior.

### Tests and verification gates

- Component tests: Players title; no Cancel button; single selected row surface; Apply exists in a distinct footer; transfer remains an accessible icon action.
- Component tests: Queue has one Queue heading/header, includes thumbnail fallback/image markup, and renders a verified duration when supplied.
- Component tests: Search has one close action while open, supplied by the top menu; closing retains query and browse state.
- Component tests: top menu places player control before the right action cluster; Now Playing renders Favorite/Repeat/Volume in the right utility cluster and Timeline before controls.
- Automated checks: `npm test`, `npm run check`, `npm run build`, and `git diff --check`.
- Live validation: deploy, then capture $960 \times 480$ screenshots for idle/active Now Playing, Queue, Players, Search, Volume, and Playlist. Confirm no double header/close control, no nested borders, touch targets at least $48$ px, internally scrolling lists, and no clipped artwork/metadata.

### Approval gate

On approval, implement in the following order: structural/semantic template changes, responsive CSS reflow, verified queue-duration normalization, focused tests, then deployed Echo Show visual review. No code will be changed before approval.

## Goal

Replace the current dense, simultaneous playback/browse/queue layout with an Echo Show 5-first interface. The default is a focused **Now Playing** screen. Search is the only other primary screen. Queue, speaker selection, volume, and add-to-playlist are right-anchored flyouts layered over the primary screen.

The visual reference is an Echo Show 5 landscape viewport of $960 \times 480$ CSS pixels. The card height must reserve space for Home Assistant dashboard chrome and fit within the remaining visible viewport; it must not assume the entire $480$ px height is available to the card. Every primary screen and every flyout must fit within this resulting card height. Lists scroll inside their own bounded area rather than stretching the card or overlapping controls.

## Evidence Behind This Plan

- The live card currently renders playback, queue, and volume in the same narrow area; the queue overlaps the playback metadata and controls.
- The current card uses a two-column discovery panel plus inline sheets. That architecture cannot enforce “one primary component at a time” or a full-height right flyout.
- Queue-item playback currently calls generic `player_queues/play_media` with `replace`. The implementation will verify the native Music Assistant queue-index command and use it instead of assuming a URI replay is equivalent to selecting a queued item.
- The current player payload already includes useful visibility signals: `available`, `enabled`, `hide_in_ui`, `synced_to`, and `group_members`.

## Information Architecture

### View model

```text
Card shell
|
|-- Primary screen (exactly one)
|   |-- Now Playing [default]
|   `-- Search / Browse
|
`-- Right flyout (zero or one)
    |-- Queue
    |-- Speakers
    |-- Volume
    `-- Add to playlist
```

The card will use explicit UI state rather than relying on whether data has loaded:

```text
primaryView: "now-playing" | "search"
activeFlyout: "queue" | "speakers" | "volume" | "playlist" | null
```

Opening a flyout replaces any open flyout. Closing it, completing a flyout action, or changing the primary screen sets `activeFlyout` to `null`. A primary-screen change never leaves a stale flyout visible.

## Technical Handoff Specification

This section is prescriptive for the implementing agent. Follow existing TypeScript/custom-element patterns. Do not introduce React, Lit, a new styling framework, or a dependency for icons. Continue using the card's Shadow DOM, `ha-icon`, template-string rendering, delegated events, the existing same-origin Music Assistant ingress transport, and Vitest/jsdom tests.

### Files and ownership

| File | Required change | Do not do |
| --- | --- | --- |
| `src/card.ts` | Own card UI state, rendering, CSS, events, and orchestration. Replace inline discovery/sheet layout with the shell described below. | Do not split into a component framework or leave both old and new layouts active. |
| `src/music-assistant/api.ts` | Add thin, typed native-command adapters only after command names and argument shapes are verified. | Do not issue raw command strings from `card.ts`. |
| `src/music-assistant/players.ts` | Add pure player eligibility, active-group, sort, and selection-diff helpers. | Do not mix DOM or network operations into helpers. |
| `src/music-assistant/search.ts` | Preserve navigation/playability fields needed by Search; update its tests. | Do not reduce results to URI/name only. |
| `src/card.test.ts` | Add UI/state/action tests for all redesign behavior. | Do not remove lifecycle and DOM-preservation coverage. |
| `src/music-assistant/adapters.test.ts` | Add exact command/argument tests for every new adapter. | Do not fake an unverified Music Assistant endpoint contract. |
| `src/card.lifecycle.test.ts` | Adjust only where the new UI-state model changes a valid assertion. | Do not weaken stale-request or reconnect protection. |

Keep `MusicAssistantCard` as the public custom element and preserve existing YAML parsing. `layout`, `show_search`, and `show_queue` may become ignored legacy options, but must not cause configuration validation failures or a second layout path.

### State contract

Replace `discoveryOpen` with these fields on `MusicAssistantCard`:

```ts
type PrimaryView = 'now-playing' | 'search';
type FlyoutKind = 'queue' | 'speakers' | 'volume' | 'playlist';

interface CardUiState {
  primaryView: PrimaryView;
  activeFlyout: FlyoutKind | null;
  clearQueueConfirmOpen: boolean;
  searchScrollTop: number;
  browseScrollTop: number;
}

interface SpeakerSelectionState {
  loading: boolean;
  error?: string;
  players?: MusicAssistantPlayer[];
  primaryPlayerId?: string;
  selectedPlayerIds: string[];
}
```

Initial state is:

```ts
{
  primaryView: 'now-playing',
  activeFlyout: null,
  clearQueueConfirmOpen: false,
  searchScrollTop: 0,
  browseScrollTop: 0,
}
```

State transitions must use these rules:

| Event | Required state result | Data load |
| --- | --- | --- |
| Open Search | `primaryView = 'search'`; `activeFlyout = null` | Load root browse data only once per ingress/session; retain query/result/path state. |
| Close Search | `primaryView = 'now-playing'`; `activeFlyout = null` | Do not clear `searchState`, `browseState`, or stored scroll positions. |
| Open a flyout | `activeFlyout = requested`; `clearQueueConfirmOpen = false` | Load only the requested resource if it is absent/stale. |
| Close flyout/backdrop | `activeFlyout = null`; `clearQueueConfirmOpen = false` | Do not discard search/browse state. |
| Open another flyout | Replace the existing `activeFlyout`; never stack flyouts. | Load the new resource as needed. |
| Change configured player | Reset queue/player/speaker/playlist identity and selection; set flyout to `null`. | Keep the default primary screen as Now Playing. |
| Disconnect | Clear timers and invalidate request IDs exactly as the current code does. | Do not render stale async results after reconnect. |

`speakerState.selectedPlayerId` is insufficient and must be replaced by staged multi-selection. The selected IDs must contain the active primary player when an Apply action is allowed. Do not mutate live group membership when a checkbox is tapped; mutate it only on Apply.

### Render contract

`render()` must emit one shell with this stable shape whenever ingress is available:

```html
<section class="card" aria-label="Music Assistant">
  <nav class="top-menu" aria-label="Music controls">...</nav>
  <main class="primary-view" data-primary-view="now-playing|search">...</main>
  <button class="flyout-backdrop" data-control="close-flyout"></button>
  <aside class="flyout" data-flyout="queue|speakers|volume|playlist">...</aside>
  <section class="operation-message" aria-live="polite">...</section>
</section>
```

- Render exactly one `<main class="primary-view">`: `renderNowPlaying()` for `now-playing`, `renderSearchBrowse()` for `search`.
- Omit the backdrop and `<aside>` when `activeFlyout === null`.
- Render each flyout through one common `renderFlyout(title, kind, body)` helper. The helper owns the title, `X` button, fixed header, body element, and accessible dialog semantics.
- Keep playback updates narrow: `updatePlayback()` may replace only the Now Playing region when it is active. It must not rebuild Search while a user is typing or change the open flyout. When a full render is unavoidable, restore focus, text selection, and the two stored scroll positions.
- `renderNowPlaying()` must not render queue rows, speaker rows, playlist rows, or an inline volume slider.
- `renderSearchBrowse()` must retain separate scrollable elements for browse results and search results. Give them stable hooks such as `data-browse-scroll` and `data-search-scroll`.

### Event contract

Use the existing delegated click/input/change listeners. Expand their selector once, then dispatch by explicit `data-control` values. Do not attach a listener per row during every render.

Required controls:

```text
open-search          close-search          open-queue
open-speakers        open-volume           open-playlist
close-flyout         clear-queue-request   clear-queue-confirm
clear-queue-cancel   queue-item-play        toggle-shuffle
toggle-repeat        play-pause             next
favorite             speaker-apply          speaker-transfer
media-open           media-play             media-queue
browse-back          browse-crumb           playlist-select
playlist-create
```

Required event semantics:

- `open-*`: set UI state synchronously, render loading state, then begin an asynchronous load if needed.
- `close-search`: save the current Search/Browse scroll position before switching to Now Playing.
- `close-flyout` and backdrop: close without issuing an API request.
- `clear-queue-request`: set `clearQueueConfirmOpen = true`; it must not call `clearMusicAssistantQueue`.
- `clear-queue-confirm`: call `clearMusicAssistantQueue`, await `loadQueue()`, then set confirmation closed. Keep Queue open after clearing.
- `queue-item-play`: call only the verified queue-index adapter. On success refresh the queue/current playback context, set `activeFlyout = null`, and render Now Playing. On failure leave Queue open and show `operationError`.
- `playlist-select` and successful `playlist-create`: perform the existing add operation, then close the Playlist flyout.
- Search input: keep the existing $350$ ms debounce and request-ID stale-response protection. An empty query displays the retained browse path/list rather than a blank screen.
- Volume input: update the displayed percentage on every `input`; send `players/cmd/volume_set` on `change` or through a single throttled stream. There must be no concurrent unbounded request burst.

### CSS and layout contract

Use CSS custom properties in `cardStyles`; do not put dimensions in rendering templates.

```css
:host {
  --music-card-height: 430px; /* provisional fallback; measure live dashboard */
  --music-header-height: 56px;
  --music-touch-target: 48px;
  --music-list-row-height: 56px;
  --music-flyout-width: clamp(360px, 50%, 500px);
}

.card {
  position: relative;
  height: min(var(--music-card-height), calc(100dvh - var(--music-dashboard-chrome, 0px)));
  max-height: calc(100dvh - var(--music-dashboard-chrome, 0px));
  overflow: hidden;
}

.top-menu { position: absolute; z-index: 10; inset: 0 0 auto 50%; }
.primary-view { position: absolute; z-index: 1; inset: 0; min-height: 0; }
.flyout-backdrop { position: absolute; z-index: 20; inset: 0; }
.flyout { position: absolute; z-index: 30; inset: 0 0 0 auto; width: var(--music-flyout-width); }
.flyout-body, .search-results, .browse-results, .queue-list, .speaker-list, .playlist-list {
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
}
```

The numeric fallback is provisional, not a final device claim. Before release, measure the real dashboard chrome and update the fallback/custom property with the smallest safe value. Do not use `100vh` alone, as it includes browser/device viewport behavior that may exceed the visible card area.

Required constraints:

- `.card`, every primary screen, and `.flyout` use `height: 100%` within the card shell. No content may use intrinsic height to expand the card.
- Primary screen uses a grid with an explicit menu-safe top/right region; title and art must not be under `.top-menu`.
- Cover art: `inline-size: 128px; block-size: 128px; flex: 0 0 128px` at the reference layout.
- Song title: `font-size: 28px`; subtitle: `font-size: 21px`; both use `overflow-wrap: anywhere` and line clamp/max-height appropriate to their allocated region.
- `top-menu` items remain within the right half of the card. Speaker label uses `max-inline-size`, ellipsis, and `white-space: nowrap`; do not let a long player name push Search off-screen.
- Flyout header is fixed at `--music-header-height`; body occupies `calc(100% - var(--music-header-height))`.
- At narrow widths, set `--music-flyout-width: min(100%, 440px)` and allow the menu to wrap inside its own safe region. Do not restore `.columns` or stack old playback/queue panels.
- Queue/speaker/playlist rows have minimum $56$ px height. Icon buttons have at least $48 \times 48$ px hit areas.
- Use `@media (prefers-reduced-motion: reduce)` to disable flyout transitions.

### Music Assistant adapter contract

Continue using `MusicAssistantTransport.command()` through ingress. Add adapters to `src/music-assistant/api.ts`, then test their exact command and argument payloads in `src/music-assistant/adapters.test.ts`.

| Capability | Adapter to add | Command/arguments status |
| --- | --- | --- |
| Play queued item by index | `playMusicAssistantQueueItem(transport, queueId, index)` | **Implemented and fixture-tested** as `player_queues/play_index` with `{ queue_id, index }`. Do not replace this with URI replay. |
| Remove one player from a group | `ungroupMusicAssistantPlayer(transport, playerId)` | Command is expected to be `players/cmd/ungroup`; verify exact argument shape before implementation. |
| Remove several players from a group | `ungroupMusicAssistantPlayers(transport, playerIds)` | Command is expected to be `players/cmd/ungroup_many`; verify exact argument shape before implementation. |

Existing known adapters remain the source of truth for queue retrieval, transfer, grouping, volume, playlists, favorites, and browse/search. The adapter layer must remain the sole mapping from UI intent to native MA command names.

### Speaker grouping algorithm

Implement pure helpers and unit-test them before wiring the flyout:

```ts
function isVisibleAvailablePlayer(player: MusicAssistantPlayer): boolean;
function getActiveGroupPlayerIds(players: MusicAssistantPlayer[], primaryPlayerId: string): string[];
function orderSpeakerPlayers(players: MusicAssistantPlayer[], activeIds: string[]): MusicAssistantPlayer[];
function diffSpeakerSelection(currentIds: string[], selectedIds: string[]): {
  toGroup: string[];
  toUngroup: string[];
};
```

Rules:

1. Filter first: only visible, enabled, available MA players are selectable.
2. Derive current group IDs from the primary player's `group_members`; also include players whose `synced_to` resolves to the primary player.
3. Always include the primary player in staged selection; its checkbox is checked and disabled.
4. Sort active group players alphabetically, then remaining eligible players alphabetically using `localeCompare`.
5. On Apply, compute a set diff. Call the verified ungroup-many operation for `toUngroup` when nonempty. Then group each `toGroup` player with the primary player using the existing group adapter. If the user selected Transfer, transfer the queue instead of group reconciliation.
6. Await all operations in a deterministic, documented order. Reload players and queue only after successful completion. On partial failure, reload live state, keep the flyout open, and show the failure rather than trusting staged state.

### Search and browse data contract

Extend the normalized `SearchItem` type in `src/music-assistant/search.ts`; do not lose raw navigation metadata while flattening:

```ts
interface SearchItem {
  name: string;
  uri?: string;
  path?: string;
  media_type?: string;
  image?: string;
  provider?: string;
  artist?: string;
  album?: string;
  is_playable?: boolean;
  can_expand?: boolean;
  group: SearchGroup;
}
```

Normalizers must use these rules, in order:

```text
navigationId = item.path ?? item.uri ?? item.item_id
canExpand = item.can_expand ?? Array.isArray(item.items) ?? media type requires browse verification
canPlay = item.is_playable ?? !canExpand
```

The final fallback for `canExpand` is a verification gate, not a guess: inspect real payloads for artists, albums, podcasts, audiobooks, folders, and playlists. Add fixtures that prove the desired category can open. For a result with both capabilities, render a whole-row Open action plus distinct icon actions for Play and Add to Queue. Stop click propagation from those action buttons so they cannot also open the container.

For breadcrumbs, keep path entries only when a successful `loadMedia()` response has been accepted for the active request ID. Implement navigation as:

```ts
openChild(item): loadMedia(item.media_content_id, [...path, item])
goBack(): loadMedia(path.at(-1)?.media_content_id ?? ROOT_MEDIA_ID, path.slice(0, -1))
goToCrumb(index): loadMedia(path[index]?.media_content_id ?? ROOT_MEDIA_ID, path.slice(0, index))
```

Do not encode `..` as a `MediaItem`, append it to `path`, or make it a breadcrumb label.

### Error, loading, and request rules

- Preserve the existing monotonic request IDs and `lifecycleId` checks for browse, queue, and search. Add a speaker/playlist request ID only if those loads can be overtaken by subsequent opens.
- Show loading content inside the primary/flyout region that initiated it. Never replace a visible primary screen with a full-card loading state after ingress is established.
- An operation error stays in `operationError` and is announced with `aria-live="polite"`. It must not silently close a flyout or clear retained Search state.
- Only close Queue/Playlist/Speakers after the associated command succeeds. On failure, preserve the open context and actionable controls.
- Do not add optimistic queue/current-player UI state that can disagree with the MA API; refresh the relevant queue/player state after mutations.

### Required fixture coverage

Add deterministic fixtures in existing test files for:

- A 20-item queue with current index, artwork, and a successful/failed item-selection command.
- A player list containing available, unavailable, disabled, hidden, grouped, and alphabetically unordered players.
- Group selection with one added and one removed player, including a failed ungroup command.
- Empty, long, and non-editable playlist lists; successful playlist add closes the flyout.
- Search results for a playable track, expandable folder, expandable/playable podcast, and nested podcast episode with images.
- Root browse, nested browse, Back, breadcrumb jump, and a rejected/malformed response that retains the last valid view.
- A long title, long artist, and long speaker name at the reference viewport to prove no clipping/overlap.

### Echo Show 5 layout

```text
960 x 480 Echo Show viewport
Home Assistant dashboard chrome is outside the card budget

+--------------------------------------------------------------------------------+
|                                       Top menu: right 50%                      |
|                                  [speaker name...] [queue] [playlist] [search] |
|                                                        (over primary content)  |
|                                                                                |
|  Primary screen: Now Playing OR Search                                         |
|  +--------------------------------------------+                                |
|  |                                            |    [Now Playing / Paused ]     |
|  |             album artwork                  |    Title                       |
|  |                                            |    Artist / album              |
|  +--------------------------------------------+                                |
|                                                                                |
|                                                                         [heart]|
|  elapsed --------------------------- progress --------------------------- total |
|  [pause] [next]                                                 [repeat] [volume] |
|                                                                                |
+--------------------------------------------------------------------------------+
```

The menu is an absolutely positioned, high-z-index control rail anchored at the card's top-right. It occupies the right half of the card width, remains visually above primary content, and does not consume layout height. The primary screen reserves a top-right safe area so artwork and title never appear underneath it.

```text
Queue / Player / Volume / Playlist flyout

+--------------------------------- card -----------------------------------------+
| Primary screen (visible but blocked)       +------------------ flyout --------+ |
|                                            | Title                        [X]  | |
|                                            +-----------------------------------+ |
|                                            |                                  | |
|                                            | scrollable content               | |
|                                            |                                  | |
|                                            |                                  | |
|                                            +-----------------------------------+ |
+--------------------------------------------------------------------------------+

Flyout: right edge anchored, 46-52% of width, full card height, above the screen.
```

The flyout has a visible close button in its top-right corner, a fixed header, and a single scrollable body. A transparent or dimmed backdrop blocks accidental interaction with the primary screen while the flyout is open; tapping the backdrop also closes it.

## Shared Design Rules

### Dimensions and touch behavior

- Measure the usable card height in the live Echo Show dashboard after Home Assistant chrome is rendered. Set the card height to the remaining visible viewport using a CSS viewport-based cap (for example `calc(100dvh - var(--dashboard-chrome-height))` when a reliable dashboard offset is available), with a conservative fixed fallback verified against the real device. The card itself must never claim the full $480$ px display height.
- At the final Echo Show dashboard target, maintain a small visible margin beneath the card rather than allowing it to meet or extend beyond the viewport edge.
- Use internal scrolling for long queues, player lists, search results, and playlists. Header, close controls, and essential playback controls stay fixed inside their respective surfaces.
- Use a minimum $48 \times 48$ px interactive target, with $56$ px list rows where a whole row is tappable.
- Use CSS grid/flex constraints, `min-width: 0`, ellipsis, and explicit overflow behavior. No control or text may change the card's fixed layout dimensions.
- Respect Home Assistant theme variables. Remove the search control's current solid blue primary treatment; the search trigger is an unfilled icon button until active/focused.
- Keep the primary screen visually quiet. Icon controls use tooltips and accessible labels; text buttons are reserved for queue-item playback and meaningful list actions.

### Component stacking

```text
z-index 30  flyout and its close button
z-index 20  flyout backdrop
z-index 10  top menu
z-index  1  active primary screen
```

### Responsive fallback

The Echo Show 5 landscape layout is the required baseline. At narrower widths, the card keeps the same single-primary/flyout model: the top menu wraps inside its reserved top-right area and the flyout widens toward full width without exceeding the viewport height. It must never revert to the present stacked two-column view.

## Primary Screen: Now Playing

### Default state and composition

Now Playing is the default `primaryView` on load and after closing search. It contains only playback information and the required controls; queue, speakers, volume, and playlist management are removed from this surface.

```text
+---------------------------------------------------------------------+
|                                      [Living Room ...] [queue] [+] [search] |
|                                                                     |
|          +-----------------------+                                  |
|          |                       |                                  |
|          |     128 x 128 art     |        Long song title           |
|          |                       |        Artist / album             |
|          +-----------------------+                                  |
|                                                               [heart]|
|  0:42  -------------------- progress slider -----------------  3:21 |
|                                                                     |
|  [pause] [next]                     [repeat: all / 1 / off] [volume]|
+---------------------------------------------------------------------+
```

### Required changes

- Increase cover art from the current $64 \times 64$ px to $128 \times 128$ px at the Echo Show reference size, with responsive constraints for smaller card widths.
- Increase the song title to approximately twice its present size and the subtitle to approximately $1.5\times$, while retaining one- or two-line clamping so controls never shift or overflow.
- Move search to the far right of the top menu. Its resting state is neutral, not blue-filled. Selecting it switches the primary screen to Search.
- Keep pause/play and next in the main control row.
- Move shuffle to the Queue flyout header, immediately to the right of its clear-queue `X` action.
- Move repeat into the main control row. Its visual state is explicit:
  - `all`: accent/highlighted repeat-all icon.
  - `one`: accent/highlighted repeat-one icon.
  - `off`: muted/grey icon.
- Move speaker selection to the top menu. The button shows a speaker icon plus the selected primary speaker name; when more than one player is selected/grouped, show the first name followed by `...`.
- Move Add to playlist to the top menu.
- Move Favorite to the far-right edge above progress slider. Retain disabled handling when Music Assistant cannot safely identify the current library item.
- Replace the inline volume slider with a speaker/volume icon in the main control row. Selecting it opens the Volume flyout.
- Retain seek/progress, including the existing API behavior, with a touch-sized slider thumb and visible elapsed/total time.

## Subcomponent: Speaker Selection Flyout

### Behavior

```text
+---------------- Speakers ------------------------------- [X] +
| Playing here                                                 |
| [x] Kitchen                                                   |
| [x] Living Room                                               |
|                                                               |
| Available                                                     |
| [ ] Bedroom                                                   |
| [ ] Office                                                    |
|                                                               |
|                                      [Apply selection]        |
+----------------------------------------------------------------+
```

- Load only Music Assistant players eligible for the active user interface:
  - exclude `available === false`, `enabled === false`, and `hide_in_ui === true`;
  - use only Music Assistant's `players/all` result, never a generic Home Assistant entity list;
  - preserve the configured/current player even if metadata is incomplete, and present a clear state if it becomes unavailable.
- Sort alphabetically inside each group using locale-aware comparison.
- Show currently playing/grouped players first, derived from the active MA player, `synced_to`, and `group_members`; then show other available MA players.
- Use full-width, single-surface rows. Remove the current nested/double border created by a button inside a bordered row.
- Allow multiple selection through checkbox-style rows. Selection stages locally until Apply, then reconciles the Music Assistant group membership in a deterministic order: transfer to the chosen primary player where needed, group selected players, and ungroup players removed from the staged selection.
- Apply closes the flyout on success; cancel, close `X`, or backdrop discards unapplied changes.
- The top-menu speaker bubble immediately reflects the active primary speaker and ellipsis state after the refreshed player data arrives.
- Show a transfer action for each eligible player. It transfers playback to that player, refreshes players/queue state, and closes the flyout after success.

### Music Assistant grouping contract

Extend the API adapter and its tests for Music Assistant's native ungroup operations, including `players/cmd/ungroup` and `players/cmd/ungroup_many`, before building selection reconciliation. Verify their exact argument shapes against the installed Music Assistant API contract. The interface must apply additions and removals, not only add players to a group.

## Subcomponent: Queue Flyout

```text
+---------------- Queue ----------------------- [clear X] [shuffle] +
| Now playing                                                          |
| > Track title                                                 [Play] |
|   Artist - Album                                                      |
|------------------------------------------------------------------------|
| Next                                                                  |
|   Track title                                                 [Play] |
|   Artist - Album                                                      |
|   ... scroll ...                                                      |
+------------------------------------------------------------------------+
```

- Remove queue rendering from Now Playing and make Queue available from the top menu.
- Make the flyout full card height, with only its list body scrolling.
- Place clear queue `X` and shuffle side-by-side in the header. Clear queue always opens a confirmation dialog before making the destructive request. Confirming clears and refreshes the list; cancelling preserves the queue and returns to the flyout.
- Keep the current item visually distinct, with artwork when queue item image data is available.
- Make every queue row touch friendly. A row tap and its explicit Play action both select that queue item.
- Fix queue-item playback by adding a dedicated API adapter for the verified native queue-index/select command. Do not implement this as a generic media replacement unless live API verification establishes that it is the intended queue-selection behavior.
- Refresh queue state after playback, shuffle, clear, or a queue-item selection. Selecting a queue item closes Queue and returns to Now Playing after the native command succeeds.

## Subcomponent: Volume Flyout

```text
+---------------- Volume ------------------------------- [X] +
|                                                            |
|                         100                                |
|                          |                                 |
|                          |                                 |
|                          O  wide vertical touch slider      |
|                          |                                 |
|                          |                                 |
|                          0                                 |
+------------------------------------------------------------+
```

- Open from the Now Playing volume icon.
- Use a wide vertical slider with a large track and thumb suitable for touch. It occupies the flyout's central vertical space rather than a narrow $28$ px inline input.
- Display the current percentage and update it while the slider moves, throttling native requests if necessary to avoid flooding the API.
- Close with `X`, backdrop, or after an explicit Done action if one is added during implementation. The initial recommendation is no Done button: value changes apply immediately and `X` simply closes.

## Subcomponent: Add to Playlist Flyout

- Open from the top-menu playlist icon.
- Show editable playlists in a full-height scrollable list with full-width rows and provider metadata.
- Keep the create-playlist input fixed at the bottom, above the safe edge, while the list scrolls.
- Selecting an existing playlist adds the current queue item and closes the flyout after success. **Implemented and tested.**
- Creating a playlist adds the current item and closes on success; failures retain the flyout for correction. **Implemented and tested.**
- Preserve the current protective behavior: do not present add actions if the current queue item has no safe Music Assistant URI.

## Primary Screen: Search and Browse

### Layout

```text
+---------------------------------------------------------------------+
| Breadcrumb / Back                                           [X]    |
| [ Search Music Assistant________________________________________ ] |
|---------------------------------------------------------------------|
| [art] Podcast / album / folder title                         [open]|
|       Artist or provider                                             |
| [art] Episode title                                           [play]|
|       Podcast name                                                   |
| ... scroll ...                                                       |
+---------------------------------------------------------------------+
```

- Search is a primary screen, never an inline panel. Opening it hides Now Playing as the primary surface but preserves playback state, the top menu, and the most recent search/browse state.
- Move Search close `X` to the screen's top-right. It returns to Now Playing while retaining the last query, results, breadcrumb, and scroll position so reopening Search resumes the prior context.
- Render album/podcast/container art in browse and search results whenever Music Assistant supplies it.
- Make the whole list body vertically scrollable, with the header, breadcrumb, search field, and close control outside the scroll area.
- Render every result as either a navigable container, a playable media item, or both. A container gets an explicit open affordance and uses its MA path/URI to load the next level. A playable item has play and queue actions.
- For items that are both expandable and playable, support both actions explicitly: row/open affordance navigates; play button plays. This enables podcast -> episode and similar drill-down flows.

### Breadcrumb rules

```text
Root > Podcasts > Example podcast > Episodes

Tap Root              -> root
Tap Podcasts          -> Podcasts contents
Tap Example podcast   -> podcast contents
Tap Back / ".."       -> Episodes parent: Example podcast
```

- Keep one canonical `browseState.path` array rooted at `[]`; never render or append a literal `..` path item.
- A Back control removes exactly one path segment. It is unavailable at root.
- A breadcrumb segment loads that segment and slices the path to its parent/index correctly. It never allows navigation outside the known root path.
- If MA returns an empty/malformed path response, retain the last valid path and show an error/empty state rather than a blank primary screen.

### Search container support

The current flattened search model discards container/playability metadata needed to drill into podcasts, albums, and folders. Extend the internal normalized search item with MA `path`, `uri`, `media_type`, `is_playable`, and a computed `canExpand` based on the verified payload. Search-result activation then follows this decision table:

| Result capability | Row action | Secondary action |
| --- | --- | --- |
| Expand only | Open container | None |
| Play only | Play according to configured play/queue behavior | Add to queue |
| Expand and play | Open container | Play / add to queue |

The implementation will verify whether `music/browse` accepts search-result `uri`, `path`, or a separate identifier for each relevant MA media type before finalizing this adapter behavior.

## Implementation Sequence

### 1. Establish the shell and state model

- Replace the current two-column/discovery boolean layout with primary-view and active-flyout state. **Implemented.**
- Add a fixed-height Echo Show layout shell, top-right menu, primary content region, backdrop, and right flyout region. **Implemented.**
- Keep ingress/loading/error paths compatible with the new shell. **Implemented.**
- Remove obsolete configuration-driven inline queue/search visibility where it conflicts with the redesign; retain backward-compatible config parsing until a later major version unless approval says otherwise. **Partially implemented.** The legacy configuration remains accepted, while moved controls are hidden from the old inline playback template pending Phase 2.

### 2. Build Now Playing first

- Recompose `renderPlayback` into the Now Playing primary screen, control row, and top-menu triggers. **Implemented.**
- Apply the artwork, typography, favorite placement, repeat-state, and volume-trigger changes. **Implemented.**
- Validate the screen at $960 \times 480$ before adding flyouts. **Automated fixture validation complete; live Echo Show screenshot remains pending.**

### 3. Add generic flyout infrastructure

- Create one reusable flyout renderer with fixed header, `X`, backdrop close, focus/scroll handling, and a bounded body.
- Migrate Volume, Queue, Speakers, and Playlist into it one at a time.
- Ensure one flyout at a time and action-driven close behavior.

### 4. Repair queue behavior and build Queue flyout

- Verify the native MA command for selecting a queue item using the live instance or authoritative MA API contract. **Implemented with `player_queues/play_index` and `{ queue_id, index }`.**
- Add adapter and unit tests for that command. **Implemented.**
- Render the full-height queue, fixed header actions, highlighted current item, and touch-sized scrolling rows. **Implemented.**
- Require confirmation before clearing the queue, then refresh the Queue flyout after the confirmed command. **Implemented.**

### 5. Implement player eligibility and multi-select behavior

- Add pure player-filtering/sorting/grouping helpers, including unavailable/hidden/disabled exclusions and current-group ordering. **Implemented and tested.**
- Add and test the native ungroup and ungroup-many API adapters, then implement group reconciliation for additions and removals. **Implemented and tested.**
- Add staged selection, Apply, refresh, and close behavior. **Implemented and tested.**

### 6. Rebuild Search/Browse as the second primary screen

- Move search open/close behavior to `primaryView`. **Implemented.**
- Replace the current list/card framing with bounded scroll regions and full art rows. **Implemented.**
- Correct the breadcrumb/back model, including root, explicit Back, and segment navigation without a literal `..` item. **Implemented and tested.**
- Preserve and normalize enough result metadata to navigate containers and select nested podcast episodes. **Implemented and tested for expandable search containers.**

### 7. Regression and visual verification

- Run unit/component tests throughout.
- Build the distributable artifact.
- Validate against the real shared Home Assistant dashboard at Echo Show 5 size, including its dashboard chrome, and at a narrower fallback width.

## Test Plan

### Unit and component tests

- Exactly one primary screen is rendered; opening one flyout replaces/overlays another and close actions restore the same primary screen.
- Top menu is right anchored and does not participate in primary content height.
- Now Playing renders the required control states, including repeat `off`, `all`, and `one`.
- Queue play invokes the verified queue-selection adapter with the correct queue ID and index.
- Queue-item selection closes Queue and returns to Now Playing only after a successful command.
- Clear queue opens a confirmation dialog; cancelling does not call the Music Assistant API.
- Queue, playlist, player, and search lists are scrolling regions with fixed headers at the reference viewport.
- Speaker filtering excludes unavailable, disabled, and hidden players; remaining players sort alphabetically with active group first.
- Multi-speaker selection uses tested group, ungroup, and ungroup-many commands with the exact MA API contract arguments.
- Volume UI dispatches the correct normalized 0-100 values and does not overflow at the reference height.
- Back removes one segment; breadcrumb clicks produce valid path slices; root cannot be popped; `..` is never added to the breadcrumb.
- Search results preserve artwork and correctly distinguish expandable, playable, and both-capability results.
- Opening an album/podcast/container reaches nested media and supports episode/item playback.

### Live visual checks

- Screenshot the real Home Assistant card in the $960 \times 480$ Echo Show viewport, with Home Assistant dashboard chrome present, for Now Playing, Search, Queue, Speakers, Volume, and Playlist.
- Confirm no overlaps, clipped labels, or vertical overflow in each state.
- Confirm touch targets are at least $48$ px and list scrolling is usable without moving the card itself.
- Confirm the top menu overlays primary content without hiding title/artwork because the primary screen reserves its safe area.
- Confirm queue playback, speaker grouping/transfer, container navigation, and playlist addition against the installed Music Assistant instance.

## Acceptance Criteria

- The card never renders two primary components simultaneously.
- Now Playing opens by default.
- Search occupies the primary screen and closes from its top-right `X`.
- Top-menu controls occupy the top-right half of the card and layer above primary content.
- Queue, speaker selection, volume, and playlist UI open as right-anchored flyouts above the primary screen and each have a top-right close control.
- Every required state fits beneath the Home Assistant chrome within the Echo Show 5 $960 \times 480$ reference viewport, with long lists scrolling internally.
- Cover art and playback typography meet the requested size increase without clipping.
- Queue item Play works through a verified Music Assistant queue-selection API.
- Only available, visible, enabled Music Assistant players appear in speaker selection; playing/grouped players appear first and the remainder are alphabetical.
- The speaker selector supports the approved multi-player behavior.
- Search navigation cannot add `..` to breadcrumbs or navigate above root; containers and nested episodes can be opened.

## Confirmed Interaction Decisions

1. **Echo Show height budget:** Account for Home Assistant dashboard chrome. The card must fit beneath it rather than occupying the entire $480$ px display height.
2. **Speaker multi-select:** Support group membership removal as well as additions through native ungroup operations.
3. **Queue close behavior:** Close Queue and return to Now Playing after a successful queue-item selection.
4. **Search close behavior:** Retain the last query, results, breadcrumb, and scroll position when Search closes and reopens.
5. **Playlist success behavior:** Close the playlist flyout immediately after a successful add or create-and-add operation.
6. **Clear queue confirmation:** Require confirmation before clearing the queue.

## Approval Gate

Phases 1-6 shell, playback, Queue, speaker, playlist, and Search/Browse work are complete and validated by the automated suite. Remaining work is live Echo Show screenshot validation and final flyout polish.
