# Music Assistant Card Rebuild Plan

## Status

**Approved by the user. Implementation is in progress.**

The implementation now includes `src/music-assistant/auth.ts`, which discovers the target Home Assistant OAuth provider through `auth/providers`, requests its authorization URL through `auth/authorization_url`, and parses the verified callback into runtime memory while cleaning the browser URL. `src/music-assistant/transport.ts` sends native MA HTTP commands with that in-memory session token. The card now gates loading on OAuth, routes browse/search through native MA commands, resolves the configured HA entity to an MA player, reads its active queue/items, and uses native `player_queues/play_media` for play/add behavior. Speaker selection, transfer/group actions, current-item favorite toggling, editable playlist selection/creation, playlist addition, and playlist-start shuffle sequencing are also implemented and covered by automated checks. Live authenticated validation of the target installation remains outstanding.

## Problem Statement

The current card has the right broad areas, but the data boundary and the interaction model do not match the intended product:

- Search is implemented against an unverified Music Assistant service contract and is known not to work in the target Home Assistant installation.
- Queueing is controlled by a global editor setting instead of an explicit action on each playable item.
- Browsing uses Home Assistant's generic `media_source/browse_media` WebSocket command. This exposes Home Assistant media sources instead of Music Assistant's own providers, library categories, and media hierarchy.
- The card opens directly into sources and browsing. The desired default is a focused playback-oriented main screen; discovery should be hidden until the user invokes search.
- The main screen requirements are not yet sufficiently specified to implement without making product decisions on the user's behalf.

The local Music Assistant API documentation has now been reviewed. The server is Music Assistant `2.9.11`; its direct API is authenticated and exposes the browse, search, player, and queue operations required for this rebuild. The contract is detailed below.

## Current Behavior and Evidence

| Area | Current implementation | Consequence |
| --- | --- | --- |
| Browse | `src/music-assistant/media-browser.ts` sends `media_source/browse_media` requests beginning at `media-source://`. | The card shows the Home Assistant media browser tree, not a Music Assistant-native media tree. |
| Search | `src/music-assistant/search.ts` calls `music_assistant.search` with `config_entry_id`, `name`, and `limit`. | The adapter has fixture tests but no live Music Assistant contract evidence; a field, service, response, or permission mismatch can make it fail. |
| Queue add | `src/card.ts` sends `media_player.play_media` with `enqueue: add` only when the global `click_action` configuration is `queue`. | Users cannot see or choose queueing per item, and changing the editor setting changes every playable row. |
| Sources and search | The left column always renders sources/search when `show_search` is enabled. | Discovery occupies the main screen rather than being intentionally opened from it. |
| Playback | The current track, transport controls, progress, volume, and optional queue are rendered beneath the browser. | Playback is visually and interactionally secondary even though it should be the default task surface. |

## Product Goals

1. Use Music Assistant as the authoritative source for discovery, search, and browsing.
2. Show all Music Assistant media categories and providers exposed to the authenticated user, without substituting the generic Home Assistant media browser.
3. Make each playable item offer an understandable play-now action and add-to-queue action.
4. Make the card initially open to a compact, touch-friendly main screen centered on active playback.
5. Hide sources and media browsing until the user activates a search/discover icon on the main screen.
6. Let the user select an available speaker, transfer playback to it, or group speakers from the main screen.
7. Let the user favorite the currently playing item and add it to an editable Music Assistant playlist, including creation of a new playlist.
8. Default playlist playback to shuffle while leaving non-playlist playback behavior unchanged.
9. Keep the workflow usable at the Echo Show reference viewport of `960x480`, ordinary desktop dashboards, and narrow screens.
10. Validate against a real Home Assistant and Music Assistant installation before documenting a behavior as supported.

## Non-Goals for This Rebuild

- Building a separate backend or storing Music Assistant credentials in the card. Home Assistant OAuth is the required authorization path.
- Falling back silently to Home Assistant's generic media-source browser when Music Assistant data is unavailable.
- Adding queue reordering, queue-item removal, or favorite actions to this scope merely because the direct API supports some of them. They are separate product work.
- Adding a player switcher unless it is separately requested. The configured player remains the target for this work.
- Broad visual refactoring unrelated to the main screen, discovery flow, and supported playback actions.

## Proposed User Experience

### 1. Default Main Screen

The default card view is playback-first. It contains:

- Current artwork, title, artist, and album/provider metadata where available.
- Play/pause, next, shuffle, repeat, seek, and volume controls already supported by the configured media-player entity.
- A compact queue summary or the full queue, depending on the product decision below.
- An icon-only search/discover button with an accessible label and tooltip.
- An icon-only speaker button that displays the configured/current speaker as its default target.
- Current-item actions: favorite and add to playlist, disabled with an explanation when the current media cannot be resolved to an MA item.
- Clear unavailable, idle, loading, and service-error states.

The source browser and media list do not render on this initial screen.

### 2. Discovery Screen

Selecting the main-screen search/discover icon opens an in-card discovery view. The view must provide:

- A search input focused on open, with a close/back control to return to the main screen.
- Music Assistant source/provider categories from the Music Assistant root.
- Navigation into expandable containers, with a compact breadcrumb/back trail.
- A media list that can display tracks, albums, artists, playlists, radio, podcasts, audiobooks, folders, and provider-specific categories supplied by Music Assistant.
- Per-item actions for play now and queue add where an item is playable.
- Loading, empty, error, and unsupported-item states without collapsing the user back to the main screen.

Search and browsing can share this discovery view, provided search clearing restores the current browse location rather than losing it.

### 3. Speaker Selection, Transfer, and Grouping

Selecting the speaker button opens a speaker sheet or dialog:

- The configured/current MA speaker is shown as the active default selection.
- The card loads available MA players with `players/all` through the authenticated MA boundary. It filters unavailable, disabled, hidden, or unsupported candidates according to the approved policy and preserves the current speaker even if it is temporarily unavailable.
- Each speaker row identifies current playback/group status where MA `Player` data supplies it: name, availability, provider, `synced_to`, group membership, and supported features.
- Selecting a target exposes only the approved actions: **Transfer playback here** and **Add to group**. An action that is unsupported for the selected source/target pair must be disabled rather than attempted.
- Transfer obtains source and target active queues using `player_queues/get_active_queue`, then invokes `player_queues/transfer` with `source_queue_id`, `target_queue_id`, and the approved `auto_play` behavior.
- Grouping uses `players/cmd/group` for one player joining a selected target leader, or `players/cmd/set_members` when the UI needs to add/remove multiple members. The card refreshes player and queue state after success.
- Grouping failure is expected when providers cannot synchronize the selected speakers or either speaker is already synchronized incompatibly; show that service error in the dialog without changing the active target.

Approved grouping direction: **Add to group** adds the current speaker to the selected speaker's group. The selected speaker is the group leader/target, and the current speaker is passed as `player_id` to `players/cmd/group`.

### 4. Current-Item Favorites and Playlist Actions

The main screen exposes actions for the item currently playing on the configured MA player:

- **Favorite:** use `players/add_currently_playing_to_favorites { player_id }`. This is the correct current-song action because MA resolves the active media to a library item. It fails when nothing is playing or the active media cannot be resolved; the UI must show that result rather than presenting a false success state.
- **Add to playlist:** open a playlist chooser populated by `music/playlists/library_items` with pagination and search. Choosing a playlist calls `music/playlists/add_playlist_tracks { db_playlist_id, uris }`; the mutation is asynchronous and returns a `BackgroundTask`, so the UI must show queued/completed/failed feedback rather than assuming the write finished immediately.
- **Create playlist:** the chooser includes a create action that calls `music/playlists/create_playlist { name, media_types?, provider_instance_or_domain? }`, then adds the current item's URI to the newly created library playlist. The chooser must expose only MA providers capable of creating/editing playlists once that capability is verified.
- **Eligibility:** `add_playlist_tracks` requires a library playlist ID and accepts item URIs. The UI must explain when the active item has no usable URI or no editable library playlist is available. It must not offer writes to provider playlists that MA reports as read-only or non-library.
- **Favorite state:** the approved behavior is a true favorite/unfavorite toggle. The implementation must obtain a reliable library item ID and media type for `current_media`, use `players/add_currently_playing_to_favorites` when adding, and use `music/favorites/remove_item` when removing. If MA cannot resolve the current media to a removable library item, the control must show an unavailable state rather than guess identifiers.

### 5. Playlist Shuffle Default

When the user starts a playlist from discovery:

1. Resolve the target active MA queue.
2. Call `player_queues/play_media` with the playlist URI/item and the approved play-now option.
3. Call `player_queues/shuffle { queue_id, shuffle_enabled: true }` after the play request succeeds.
4. Refresh the queue and UI state, then report either action failure clearly.

The direct MA API does not expose a shuffle argument on `player_queues/play_media`; this two-command sequence is required. Approved behavior is to enable shuffle for every user-initiated playlist start from browse, search, or the playlist chooser. The user may immediately disable it with the shuffle control. The card must not force shuffle for tracks, albums, radio, podcasts, or manually constructed queues.

### 6. Play and Queue Semantics

The expected interaction model is:

| Item type | Primary row action | Secondary action |
| --- | --- | --- |
| Expandable source/category/folder | Open it | None unless the MA contract marks it playable |
| Track/episode/radio item | Play now | Add to end of queue |
| Album/playlist/artist/collection | Product decision required: play collection now or open details first | Add collection to queue only if the live MA service contract supports it |
| Queue item | Play that queue item | Existing clear-queue action remains separately available |

Every queue-affecting action refreshes the displayed queue after success. Errors appear in a concise, user-visible status region and must not be swallowed by an event handler.

## Technical Approach

### Verified Local API Contract

The following operations and argument names are confirmed from the local Music Assistant `2.9.11` generated command reference at `http://10.1.0.123:8095/api-docs/commands.json`.

| Card need | Direct MA command | Required arguments | Result / notes |
| --- | --- | --- | --- |
| Authenticate a direct WebSocket session | `auth` | `token` as the first command | Direct `/ws` sessions require this. Every request needs a unique `message_id`. |
| Browse MA root and descendants | `music/browse` | `path` is optional | Returns MA media items and `BrowseFolder` entries. Empty/omitted path is the MA browse root. This replaces Home Assistant `media_source/browse_media`. |
| Global MA search | `music/search` | `search_query` | Optional `media_types`, `limit`, and `library_only`; returns `SearchResults`. The current `name` and `config_entry_id` payload is not the direct MA API contract. |
| Read a player | `players/get` | `player_id` | Returns an MA `Player`, including supported features, grouping fields, and `current_media`. |
| List eligible MA players | `players/all` | None | Optional `return_unavailable`, `return_disabled`, `provider_filter`, and `return_protocol_players`. This powers speaker selection. |
| Resolve active queue | `player_queues/get_active_queue` | `player_id` | Returns the current active/synced `PlayerQueue`, including its `queue_id`. |
| Read queue metadata | `player_queues/get` | `queue_id` | Returns `PlayerQueue`. |
| Read queue items | `player_queues/items` | `queue_id` | Optional `limit` and `offset`; returns `QueueItem[]`. |
| Play now / replace / enqueue | `player_queues/play_media` | `queue_id`, `media` | `media` accepts MA media objects, item mappings, a URI string, or arrays. Set `option` to a verified `QueueOption`: `play`, `replace`, `next`, `replace_next`, or `add`. This is the required explicit queue mechanism. |
| Play a queue item | `player_queues/play_index` | `queue_id`, `index` | `index` accepts an integer index or queue item ID. |
| Clear queue | `player_queues/clear` | `queue_id` | Optional `skip_stop`. |
| Transfer playback | `player_queues/transfer` | `source_queue_id`, `target_queue_id` | Optional `auto_play`; speaker transfer requires both active MA queues. |
| Add player to a group | `players/cmd/group` | `player_id`, `target_player` | Adds the current speaker as `player_id` to the selected speaker's sync-group leader/group player. It may fail for incompatible or already-synced players. |
| Set group membership | `players/cmd/set_members` | `target_player` | Optional `player_ids_to_add` and `player_ids_to_remove`; use for multi-member group changes. |
| Add current item to favorites | `players/add_currently_playing_to_favorites` | `player_id` | Resolves current playback to a library media item; errors if no resolvable item is playing. |
| Remove current item from favorites | `music/favorites/remove_item` | `media_type`, `library_item_id` | Requires the resolved library item identity; use only for the true toggle's remove path. |
| List library playlists | `music/playlists/library_items` | None | Supports optional `search`, `limit`, `offset`, `provider`, and `favorite` filters. Use all accessible editable providers, not a hard-coded provider. |
| Add item to playlist | `music/playlists/add_playlist_tracks` | `db_playlist_id`, `uris` | Returns `BackgroundTask`; only a library playlist ID is accepted. |
| Create playlist | `music/playlists/create_playlist` | `name` | Optional `media_types` and `provider_instance_or_domain`; returns `Playlist`. |
| Playback controls | `player_queues/play_pause`, `play`, `pause`, `next`, `previous`, `seek`, `shuffle`, `repeat` | `queue_id`, plus command-specific value | These are MA-native alternatives to relying on Home Assistant media-player service parity. |

The documented `QueueOption` enum is `play`, `replace`, `next`, `replace_next`, and `add`. For the approved user experience, use one direct MA operation with `option: "play"` or `"replace"` for the primary play behavior and `option: "add"` for the queue icon. The final primary option must be confirmed against live behavior before release.

The documented MA media types include `artist`, `album`, `track`, `playlist`, `radio`, `audiobook`, `podcast`, `podcast_episode`, `folder`, `genre`, `audio_source`, `announcement`, `flow_stream`, `plugin_source`, and `sound_effect`. The card must render unknown future types safely rather than filtering them out or treating them as errors.

### Required Home Assistant OAuth and Identity Boundary

Home Assistant OAuth is the required authorization path. The card must never ask the user for an MA username/password or a long-lived MA token. The target MA `2.9.11` server was queried without credentials and returned these verified auth providers:

- `builtin` with `requires_redirect: false`
- `homeassistant` with `requires_redirect: true`

The provider ID is therefore `homeassistant` on the target installation. The API documentation's `hass` value is an example and must not be hard-coded without checking `auth/providers` first.

The unauthenticated command `auth/authorization_url` accepts `provider_id` and an optional `return_url`. For the target server, passing `provider_id: "homeassistant"` returned a Music Assistant authorization URL containing a server-generated state and a Music Assistant callback:

```text
auth/authorization_url -> { authorization_url: "https://.../auth/authorize?...&redirect_uri=http://10.1.0.123:8095/auth/callback?provider_id=homeassistant&state=..." }
```

The implementation must open that URL in the browser, allow Home Assistant to authenticate the user, and complete the MA-managed callback/state flow. A real authorized flow against the target server confirmed that MA redirects to the supplied `return_url` with the session JWT in the `code` query parameter. The supplied return URL must be the actual reachable Lovelace origin; the test URL `http://localhost:8123` failed with `ERR_CONNECTION_REFUSED` because no local server was listening. `src/music-assistant/auth.ts` now extracts that value only into runtime memory and returns a sanitized URL with OAuth query parameters removed. The implementation must never log, persist, or include the token in diagnostics.

The direct MA API can use HTTP RPC at `POST /api` or the recommended real-time WebSocket protocol at `ws://10.1.0.123:8095/ws`. Both require the resulting MA authorization:

- HTTP calls require `Authorization: Bearer <MA token>`.
- A direct WebSocket connection must send `auth` with the MA token as its first command.
- Tokens are secrets. A HACS/Lovelace JavaScript card must not place a long-lived MA token in card YAML, browser storage, source code, logs, or the generated artifact. Session credentials must be kept only in the authenticated HA/MA connection boundary and cleared on logout or expiry.
- The current configuration uses a Home Assistant `media_player` entity ID. The direct MA API requires an MA `player_id`, then resolves its current `queue_id` with `player_queues/get_active_queue`. The plan must define and test a reliable mapping rather than assume these identifiers are identical.

Therefore, the rebuild has an explicit prerequisite: implement the MA Home Assistant OAuth redirect/callback boundary, preferably through a documented HA Ingress or an HA-side endpoint that retains the token server-side and enforces the current user's permissions. Direct browser-to-MA access is not approved until this boundary is demonstrated to work without exposing a token.

The preferred transport after that boundary is a persistent MA WebSocket session because MA `2.9.11` documents automatic `player_updated`, `queue_updated`, `queue_items_updated`, and media/library events. Use HTTP RPC only if the secure proxy cannot support WebSockets; do not poll it frequently.

### Phase 0: Establish the Real Music Assistant Contract

**Objective:** Replace assumptions based on fixtures with evidence from the target installation.

1. Record the Home Assistant version, Music Assistant `2.9.11` schema version, enabled providers, and configured player/group identifiers.
2. Implement and test the Home Assistant OAuth authorization boundary: call unauthenticated `auth/providers`, select the returned Home Assistant provider (currently `homeassistant`), call `auth/authorization_url` with the reachable Lovelace origin, open the returned URL, capture the `code` callback value in memory, and immediately clean the browser URL. Provider discovery, authorization URL request, callback parsing, and the card transport/session handoff are implemented. Do not collect or embed an MA token in the Lovelace card.
3. Resolve the mapping from the configured Home Assistant `media_player` entity to MA `player_id`, then prove `player_queues/get_active_queue` returns the expected active/synced `queue_id`.
4. With the authorized path, capture sanitized responses from exactly these commands:
   - `music/browse` at the root and at least two nested paths.
   - `music/search` with a track, album, artist, playlist, radio station, and no-results query.
   - `players/get`, `player_queues/get_active_queue`, `player_queues/get`, and `player_queues/items`.
   - `player_queues/play_media` for both a direct item URI and a collection URI using the selected primary play option and `option: "add"`.
5. Confirm the artwork URL/proxy behavior from returned `MediaItemImage` data. Do not assume image paths are browser-accessible without the same authorization boundary.
6. Capture sanitized responses and live outcomes for `players/all`, `players/cmd/group`, `player_queues/transfer`, `players/add_currently_playing_to_favorites`, `music/favorites/remove_item`, `music/playlists/library_items`, `music/playlists/create_playlist`, and `music/playlists/add_playlist_tracks` using the OAuth-authenticated session.
7. Verify which returned MA players are actually accessible to the current MA user, which pairs can synchronize, and whether the configured HA player is represented by a direct MA player ID.
8. Verify all accessible editable playlist providers, a read-only/non-library playlist provider, a resolvable current track with favorite state, and a current media item that cannot be added to favorites or playlists.
9. Write a compatibility note listing which media types, provider paths, player features, grouping combinations, favorite behavior, playlist providers, and queue options are live-verified.
10. Create sanitized response fixtures that preserve relevant shapes, including missing images, empty children, provider-specific metadata, unsupported types, and service errors.

**Exit criteria:** The secure transport is proven; HA entity-to-MA player/queue identity is proven; and live responses confirm the documented commands for MA search, root browsing, nested browsing, queue retrieval, play now, and enqueue.

### Phase 1: Define and Test Stable Music Assistant Adapters

**Objective:** Isolate unstable external shapes from card rendering and interaction code.

1. Replace the current `media-browser.ts` Home Assistant media-source adapter with a Music Assistant adapter built on `music/browse` and the approved authenticated transport.
2. Define a normalized card model for every browse/search result:
   - Stable identifier/URI.
   - Display title and metadata.
   - Artwork URL, when supplied.
   - MA media type and provider/source identity.
   - `canExpand` and `canPlay` capabilities.
   - A request target for opening the next level or invoking playback.
3. Normalize all MA result groups dynamically. Do not discard valid groups because they are not one of the currently hard-coded search categories.
4. Validate runtime response shapes at the adapter boundary and return actionable errors for malformed or unsupported responses.
5. Add adapter tests for valid, empty, malformed, partial, delayed, and failed root/browse/search/queue responses.

**Exit criteria:** Rendering code consumes only normalized models and does not need to understand MA's wire-format variations.

### Phase 2: Implement Explicit Playback and Queue Operations

**Objective:** Make the answer to "How do I add this to the queue?" visible in the interface.

1. Replace the current global `click_action`-only behavior with item-level play and queue controls.
2. Keep the primary row action reserved for its natural behavior:
   - Open expandable rows.
   - Play playable leaves or the confirmed collection behavior.
3. Add an icon-only queue action to each item that supports enqueue, with an accessible name and tooltip.
4. Use `player_queues/play_media` with the resolved MA `queue_id`, `media: <item URI or MA item>`, and `option: "add"` for enqueue. Use the approved, live-verified primary option for play now; do not assume Home Assistant `media_player.play_media` has equivalent collection behavior.
5. Disable only the operation in progress, prevent duplicate activation, refresh queue data after successful mutations, and surface failure states.
6. Decide whether to retain `click_action` for backward compatibility. If retained, document it as a default rather than the only way to queue.
7. Test play and enqueue for all verified media types, including a rejected service response and stale queue reload.

**Exit criteria:** A user can identify and activate a queue action from the item itself, and the queue reflects the result without a manual card refresh.

### Phase 3: Rebuild Search on the Verified Contract

**Objective:** Make Music Assistant search reliable and useful across the user's MA media.

1. Implement direct MA search as `music/search` with `search_query`; add `media_types`, `limit`, or `library_only` only where the approved product behavior calls for them. Do not send the current `name` or `config_entry_id` fields to the direct MA API.
2. Preserve MA-provided URI/type/capability data so search results support both play and queue actions.
3. Support all response groups delivered by the verified service, including provider-specific groups.
4. Maintain a 300-400ms input debounce, cancel/ignore obsolete requests, and clear pending timers on disconnect.
5. Preserve the input caret and discovery state during unrelated Home Assistant updates.
6. Display focused states for search loading, no results, request errors, malformed responses, and an empty query.
7. Add component tests for debounce, rapid query replacement, errors, clearing a query, and play/queue actions from search results.

**Exit criteria:** Real MA queries show accurate, actionable grouped results and cannot be overwritten by stale responses.

### Phase 4: Move Sources and Browse Into Discovery

**Objective:** Make sources/media intentionally hidden until discovery is requested.

1. Introduce an explicit view state: `main` or `discover`.
2. Render the playback-first main screen by default.
3. Add a search/discover icon button on the main screen; opening it enters discovery and focuses the search field.
4. Load the MA root only when discovery opens, unless a small prefetch is proven necessary for responsiveness.
5. Keep current browse path, loaded children, and search state while the discovery view stays open.
6. Return to the main screen through an explicit close/back action. Define whether close preserves discovery state for the next open or resets to the MA root.
7. Do not load or render the generic Home Assistant media browser as a fallback.
8. Add component tests for default main view, opening discovery, closing it, lazy data loading, browse path preservation, and error recovery.

**Exit criteria:** Sources and media are absent from the initial visual hierarchy and are reachable through one obvious main-screen action.

### Phase 5: Finish Main-Screen Composition and Responsive Behavior

**Objective:** Make the first screen functional on a touch display without making browsing controls dominate.

1. Implement the approved main-screen content hierarchy.
2. Add the speaker sheet, with an active-speaker default, loading/empty/error states, a confirmation step before transfer/grouping, and action progress states.
3. Add current-item favorite and playlist controls with a playlist chooser and a create-playlist flow. Keep any form controls touch-sized and keyboard accessible.
4. Keep touch targets at least 40px and make icon controls discoverable through tooltips and accessible names.
5. Use Home Assistant theme variables and existing local style conventions; do not introduce a separate app-like theme.
6. Bound queue, speaker, playlist, and discovery scrolling so essential playback controls remain reachable at `960x480`.
7. Verify narrow-screen ordering: playback information, transport controls, discovery action, speaker/current-item actions, then queue according to the approved main-screen decision.
8. Ensure long metadata truncates safely and no controls overlap, shift, or force horizontal scrolling.
9. Preserve keyboard focus behavior and respect reduced-motion preferences.

**Exit criteria:** The card is usable at `960x480`, narrow mobile, and desktop dashboard widths with no unintended overflow or hidden primary action.

### Phase 6: Integration Validation and Documentation

**Objective:** Ensure claims match actual behavior before release.

1. Run unit, type, build, and artifact checks.
2. Validate in a real Lovelace dashboard against the target MA installation.
3. Exercise normal playback, no player, empty queue, empty provider, missing artwork, service failure, slow response, source navigation, search, play-now, and enqueue.
4. Capture screenshot evidence at `960x480`, a narrow viewport, and a normal desktop dashboard width.
5. Update README configuration, queue instructions, verified compatibility versions, known limitations, and screenshots.
6. Remove or revise statements in old planning documents that claim generic media-source browsing satisfies MA-native browsing.

**Exit criteria:** Documentation accurately states tested behavior and a user can configure, discover, search, play, and queue MA media without hidden configuration knowledge.

## Test Matrix

| Scenario | Expected behavior |
| --- | --- |
| Initial render | Playback-first main screen appears; sources/media browser is hidden. |
| Open discovery | Search gains focus; MA root loads from the verified MA endpoint. |
| Browse provider/category | MA-only items appear; generic HA media sources do not. |
| Open expandable item | Breadcrumb/path updates; older response cannot overwrite latest navigation. |
| Play a track | Correct verified service is called for the configured player. |
| Queue a track | Explicit queue control calls the verified enqueue operation and refreshes queue display. |
| Queue a collection | Behavior matches the approved and verified collection contract. |
| Play a playlist | The playlist begins using the approved primary option and the queue is then set to shuffle. |
| Search query | Debounced MA request shows normalized actionable results. |
| Rapid search | Only the latest query result/error appears. |
| Search failure | Error is visible and closing/retrying discovery remains possible. |
| Home Assistant state update | Playback refreshes without disrupting a focused search input or browse state. |
| Close discovery | Returns to main screen according to approved reset/preservation behavior. |
| Open speaker sheet | The current configured speaker is selected by default and only accessible eligible MA players appear. |
| Transfer speaker | Source queue transfers to target active queue with approved auto-play behavior and both views refresh. |
| Group speakers | The approved grouping direction is used; incompatible-provider failures remain visible in the sheet. |
| Favorite current item | The current MA item is favorited or a resolvability error is clearly reported. |
| Add current item to playlist | Library playlists can be searched, selected, created, and updated with task feedback. |
| Missing data | Empty queue, missing art, unavailable player, and malformed MA response have clear states. |
| Responsive layout | No horizontal overflow or overlapping text/control at reference viewports. |

## Decisions Needed Before Approval

1. **Meaning of "all entities":** Does this mean every Music Assistant provider/category/media type, every MA `media_player`, or both?
2. **Discovery entry point:** Should the main-screen icon open one combined Discover view with both search and sources, or open search with a separate browse-sources control?
3. **Main-screen queue:** Should the full queue be visible by default, should only a queue summary be visible, or should queue be hidden behind its own icon?
4. **Collection behavior:** For albums, playlists, artists, and folders, should a primary tap play the whole collection or open its contents first? Should the secondary action add the collection to the queue when supported?
5. **Discovery close behavior:** When a user closes discovery, should the next open restore its last path/query or restart at the MA root with an empty query?
6. **Main-screen controls:** Besides artwork, metadata, play/pause, next, progress, volume, and search/discover, which controls must always be present? A screenshot or wireframe is sufficient.
7. **Live contract evidence:** Can sanitized Developer Tools responses be supplied for MA search, MA browse/list, and queue services? If not, Phase 0 must include a temporary development-only diagnostic capture path.
8. **Secure transport decision:** Which of the secure options is available in your Home Assistant installation: a documented MA Ingress URL usable from Lovelace, or permission to add a minimal HA-side proxy/integration endpoint? This decision is required before direct API implementation.
9. **Player identity mapping:** What is the MA `player_id` that corresponds to the currently configured Home Assistant `media_player` entity? If they differ, please provide the output of `players/all` or identify the entity-to-player mapping exposed by the MA integration.
10. **Group direction:** Approved: add the current speaker to the selected speaker's group.
11. **Transfer semantics:** Approved: transfer immediately starts playback on the destination (`auto_play: true`).
12. **Playlist provider:** Approved recommendation: discover all accessible editable playlist providers, avoid hard-coding one, and default to the first MA-recommended editable provider. If multiple providers are available, let the user choose.
13. **Favorite behavior:** Approved true add/remove toggle, subject to MA returning a reliable library identity for the current item.
14. **Playlist shuffle:** Approved: every user-initiated playlist start enables shuffle, and the user may immediately disable it with the shuffle control.
15. **Compatibility:** What Home Assistant version must be supported? This plan currently has direct API documentation evidence for MA `2.9.11`; other MA versions must be treated as unverified until their generated command contract is compared.

## Current Implementation Gate

The user has approved implementation. The remaining hard prerequisite before wiring the card to live MA discovery and playback is the secure authenticated transport and Home Assistant-entity-to-MA-player mapping described in Phase 0. The frontend must not embed an MA token in card configuration, browser storage, source code, logs, or the generated artifact.