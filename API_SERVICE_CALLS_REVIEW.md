# API & Service Call Review — Music Assistant Card

Review of every Home Assistant API / service (action) call the card makes, with issues found and
proposed improvements. The complete queue migration described below is implemented; the remaining
items are follow-up recommendations.

Scope reviewed:

- [src/card/actions.ts](src/card/actions.ts) — `callService`, playback/speaker/control actions
- [src/card/events.ts](src/card/events.ts) — click routing to service calls (queue-index play, seek, volume)
- [src/music-assistant/search.ts](src/music-assistant/search.ts) — `music_assistant.search`
- [src/music-assistant/queue.ts](src/music-assistant/queue.ts) — `mass_queue.get_queue_items` and core `music_assistant.get_queue`
- [src/music-assistant/media-browser.ts](src/music-assistant/media-browser.ts) — `media_source/browse_media`
- [src/card.ts](src/card.ts) — load orchestration and request lifecycle

Service contracts below were verified against the current Home Assistant Music Assistant docs
(2026.8) and `droans/mass_queue` release 0.10.3 for `music_assistant.search`,
`music_assistant.play_media`, `music_assistant.get_queue`, `music_assistant.transfer_queue`, and
`mass_queue.get_queue_items`.

## Implemented Queue Migration

The card now uses `mass_queue.get_queue_items` as its queue source. The response-only service
returns the complete queue keyed by player entity ID. The card requests
`{ entity: player, offset: 0, limit: 1000 }`, then maps the documented fields:

| mass_queue field | Card field |
| --- | --- |
| `queue_item_id` | `queue_item_id` |
| `media_title` | `name` |
| `media_album_name` | `album` |
| `media_artist` | `artist` |
| `media_content_id` | `uri` |
| `media_image` | `image_url` |

The built-in `music_assistant.get_queue` action remains isolated as `getCoreQueue` for comparison
and compatibility tests, but it is not sufficient for the full queue because its documented
response focuses on `current_item` and `next_item`. The `mass_queue` integration must be installed
and configured for the card's complete queue view to work.

The card derives the highlighted current row by matching the primary player's
`media_content_id` to the returned queue item URI. This compensates for `get_queue_items` not
returning a `current_index` field.

---

## Current call inventory

| Operation | Call today | Location |
| --- | --- | --- |
| Browse media | `callWS({ type: 'media_source/browse_media', media_content_id })` | media-browser.ts |
| Search | `music_assistant.search` `{ name, limit: 12 }` (no target) | search.ts |
| Get queue | `mass_queue.get_queue_items` (`entity`, `offset: 0`, `limit: 1000`, `returnResponse`) | queue.ts |
| Play media | `music_assistant.play_media` `{ media_id, media_type, enqueue }` | actions.ts `playMedia` |
| Play queue item | `media_player.play_media` `{ media_content_id: uri, media_content_type }` | events.ts |
| Play / pause | `media_player.media_play` / `media_pause` | actions.ts `handleControl` |
| Next | `media_player.media_next` | actions.ts `handleControl` |
| Shuffle | `media_player.shuffle_set` | actions.ts `handleControl` |
| Repeat | `media_player.repeat_set` | actions.ts `handleControl` |
| Clear queue | `media_player.clear_playlist` | actions.ts `handleControl` |
| Seek | `media_player.media_seek` `{ seek_position }` | events.ts (`change`) |
| Volume | `media_player.volume_set` `{ volume_level }` | events.ts (`value-changed`) |
| Transfer | `media_player.transfer_playback` | actions.ts `runSpeakerAction` |
| Group / ungroup | `media_player.join` / `media_player.unjoin` | actions.ts `applySpeakerSelection` |

---

## Critical issues (functional bugs)

### C1. `music_assistant.search` is missing the required `config_entry_id`

`music_assistant.search` documents `config_entry_id` as **Required** (alongside `name`). The card
sends only `{ name, limit: 12 }`, so search will be rejected by strict schema validation and cannot
reliably work. See [src/music-assistant/search.ts](src/music-assistant/search.ts).

The card currently has no mechanism to obtain a config entry ID.

Proposed fix:

- Resolve the Music Assistant config entry ID once and cache it, then pass it on every `search`
  call. Two options, in order of preference:
  1. Look it up at runtime via `hass.callWS({ type: 'config_entries/get', domain: 'music_assistant' })`
     and pick the single `entry_id` (error clearly if zero or ambiguous multiple).
  2. Add an optional `config_entry_id` config field as a fallback/override for multi-instance setups.
- Thread the resolved ID through the search adapter signature
  (`searchMusicAssistant(hass, configEntryId, query)`), matching the shape already sketched in
  [API_STACK_MIGRATION_PLAN.md](API_STACK_MIGRATION_PLAN.md).

### C2. `media_player.transfer_playback` is not a real service

`runSpeakerAction` in [src/card/actions.ts](src/card/actions.ts) calls
`media_player.transfer_playback`, which does not exist in Home Assistant. The transfer button will
always raise an error.

The correct action is `music_assistant.transfer_queue`, targeted at the **destination** entity, with
`source_player` set to the current player and optional `auto_play`:

```ts
await hass.callService(
  'music_assistant',
  'transfer_queue',
  { source_player: currentPlayerId, auto_play: true },
  { entity_id: destinationPlayerId },
  true,
);
```

Proposed fix: replace the `transfer_playback` call with `music_assistant.transfer_queue` using the
current configured player as `source_player` and the clicked player as the target, then refresh
queue and speaker state.

---

## Correctness / robustness issues

### R1. Malformed service responses are silently treated as empty success

- `getQueue` returns `{}` when the response is missing or malformed
  ([src/music-assistant/queue.ts](src/music-assistant/queue.ts)).
- `searchMusicAssistant` returns `{}` on a non-object response
  ([src/music-assistant/search.ts](src/music-assistant/search.ts)).

Both render as an "empty but successful" result, hiding real failures. The migration plan explicitly
requires a missing/non-object/malformed response to surface as a user-visible operation error rather
than an empty success.

Proposed fix: throw a descriptive error on missing/invalid response so the existing
`catch` blocks in `loadQueue` / `runSearch` set an error state. Keep the legacy entity-keyed shape
tolerance for `get_queue` (real successful data), but treat "no parseable payload" as an error.

### R2. Playing a queue item re-plays instead of jumping to the index

Clicking a queue row calls `media_player.play_media` with the item's `uri`
([src/card/events.ts](src/card/events.ts)). There is no generic "play queue index" HA action, so this
re-submits the media rather than seeking to that existing queue position, which can duplicate/replace
queue entries and lose position.

Proposed handling (pick one, pending verification):

- Verify whether a Music Assistant action exposes "play index" on the active queue; if so, use it.
- Otherwise, document this as a known limitation and, at minimum, pass an explicit
  `enqueue: 'replace'` (or `play`) so behaviour is deterministic rather than integration-default, and
  guard against undefined `uri`/`media_type` before calling.

### R3. `play_media` media type from browse/queue may not match MA's accepted types

`playMedia` and the queue-item path forward `media_content_type` straight from browse/queue payloads.
`music_assistant.play_media` accepts a specific `media_type` set (`artist`, `album`, `audiobook`,
`folder`, `playlist`, `podcast`, `track`, `radio`) and determines it automatically when omitted.

Proposed fix: when the value is not one of the accepted MA media types, omit `media_type` and let MA
infer it, rather than sending an unrecognized string.

### R4. No clamping / validation on volume and seek inputs

- `volume_set` is sent `value / 100` with no clamp to `[0, 1]`
  ([src/card/events.ts](src/card/events.ts)).
- `media_seek` sends `Number(target.value)` without bounds against `media_duration`.

Proposed fix: clamp volume to `[0, 1]` and seek to `[0, media_duration]`; ignore `NaN`
(volume already guards `NaN`, seek does not).

---

## Consistency / minor issues

### M1. Duplicate clear-queue control branch

`handleControl` handles `clear-queue-request` (opens confirm) and also `clear-queue` (opens the same
confirm) — a redundant branch. Recommend removing the dead `clear-queue` case or the emitter that
produces it. See [src/card/actions.ts](src/card/actions.ts).

### M2. Play/pause could use a single idempotent action

`handleControl` reads state and dispatches `media_play` vs `media_pause`. `media_player.media_play_pause`
is a single toggle and removes a state-read race. Low priority; current approach is functional.

### M3. `callService` always defaults the target to the configured player

`callService` defaults `target` to `{ entity_id: config.player }`
([src/card/actions.ts](src/card/actions.ts)). This is correct for player-scoped services but is a
foot-gun for any future non-player service. Recommend keeping the default but requiring callers that
target other entities (join/unjoin/transfer) to always pass an explicit target (they currently do).

### M4. No in-flight guard on rapid control presses

Transport buttons can be pressed repeatedly before the service resolves, firing duplicate calls.
Read-path staleness is handled by `RequestGuard`, but write actions are not debounced. Consider
disabling / ignoring re-entrant presses per control while a call is in flight. Low priority.

---

## Media browse & search improvements

Focused review of the browse/search data path:
[src/music-assistant/media-browser.ts](src/music-assistant/media-browser.ts),
[src/music-assistant/search.ts](src/music-assistant/search.ts),
[src/card/events.ts](src/card/events.ts) (navigation routing),
[src/card/dom.ts](src/card/dom.ts) (`toMediaItemFromSearch`),
[src/card/views/media-list.view.ts](src/card/views/media-list.view.ts),
[src/card/views/search.view.ts](src/card/views/search.view.ts).

### Browse

#### B1. Browse root is every HA media source, not Music Assistant

Browsing defaults to `media-source://` — the root of **all** Home Assistant media sources (local
media, cameras, other integrations), not Music Assistant. See the default param in
[src/music-assistant/media-browser.ts](src/music-assistant/media-browser.ts) and `ROOT_MEDIA_ID` in
[src/card/events.ts](src/card/events.ts). Users must drill into the MA source before any music
appears.

Proposed fix: default the root to `media-source://music_assistant` (single source of truth constant
shared by the adapter default and `ROOT_MEDIA_ID`), matching
[API_STACK_MIGRATION_PLAN.md](API_STACK_MIGRATION_PLAN.md). Update the `card.test.ts` /
`adapters.test.ts` expectations that currently assert `media-source://`.

#### B2. No image-load fallback for thumbnails

Both `renderMediaItem` and `renderSearchItem` emit `<img src=...>` with no `onerror` handling. A
broken/expired artwork URL leaves an empty box instead of falling back to the music-note icon. The
migration plan explicitly requires falling back to the generic icon on load failure, not only on an
absent value.

Proposed fix: add an image error handler that swaps a failed `<img>` for the existing icon fallback
(e.g. hide the img and reveal the icon, or route through a small shared thumbnail helper used by both
views).

#### B3. Playable-and-expandable items can't be played from the list

Row play/queue actions render only when `can_play && !can_expand`
([src/card/views/media-list.view.ts](src/card/views/media-list.view.ts)). Albums and playlists are
typically both expandable and playable, so the user can open them but cannot play/enqueue the whole
item in one tap; clicking the row only expands it.

Proposed fix: show the play/queue row actions whenever `can_play`, independent of `can_expand`, and
keep the row-body click as the expand affordance. Confirm the click routing in
[src/card/events.ts](src/card/events.ts) still expands on body click while the action buttons play.

#### B4. Expanding a search result reuses browse with an incompatible ID

Expanding a search result calls `loadMedia(item.uri, ...)`
([src/card/events.ts](src/card/events.ts)), which passes the search `uri` straight to
`media_source/browse_media`. Search returns MA-native URIs (e.g. `library://album/1`,
`spotify://...`), which are a different namespace from `media-source://music_assistant/...` and are
likely rejected by the media-source browser. `toMediaItemFromSearch` also defaults
`media_content_type` to `'music'`, which is not a valid browse type.

Proposed fix: verify what `media_source/browse_media` accepts for MA items. If it does not accept
MA-native URIs, either (a) only offer expand for items whose `uri` is already a `media-source://`
ID, or (b) map the search item to its media-source browse ID before expanding. Otherwise disable
expand for search results and keep play/enqueue only.

#### B5. Thumbnail URL signing (verify)

Media-source thumbnails are sometimes relative, session-signed paths rather than absolute provider
URLs. Confirm returned `thumbnail` values load in an authenticated dashboard without additional
signing; if not, resolve them via the standard signed-path flow before binding to `src`. Verify
before changing anything.

#### B6. No folder caching or pagination (optional)

Every navigation refetches, and large folders render all children at once. Optional follow-ups:
cache browse responses by `media_content_id`, and for library-scale lists consider
`music_assistant.get_library` with pagination (`limit`/`offset`) instead of a single unbounded
browse. Defer unless folders are large in practice.

### Search

#### S1. Missing `config_entry_id` (see C1)

Cross-reference: search cannot run reliably until C1 is resolved.

#### S2. No minimum query length

`runSearch` fires for any non-empty trimmed query after the 350 ms debounce
([src/card.ts](src/card.ts)). Single-character queries trigger broad, expensive searches.

Proposed fix: require a minimum length (e.g. 2 characters) before issuing the call; below it, clear
results without a service call.

#### S3. Unstable result-group ordering

`renderSearchResults` orders groups by their key order in the response object
([src/card/views/search.view.ts](src/card/views/search.view.ts)), so section order can vary. Impose a
fixed, meaningful order: artists, albums, tracks, playlists, radio, audiobooks, podcasts.

#### S4. Fixed `limit: 12`, no filtering or "show more"

Search always requests 12 per type with no type filter. `music_assistant.search` also accepts
`media_type`, `artist`, `album`, and `library_only`. Optional improvements: expose a media-type
filter (or per-group "show more" that re-queries with a higher limit / specific `media_type`), and a
"library only" toggle. Defer if out of current UX scope.

#### S5. Search thumbnails share the B2 fallback gap

Same missing `onerror` fallback as B2; fix both views with the shared thumbnail helper.

---

## Security review

No high-severity issues. All traffic goes through the authenticated `hass.callService` / `hass.callWS`
frontend clients (no direct `fetch`, no Supervisor/ingress paths). Notes:

- Thumbnail `src` values come from the trusted HA browse response; keep using them as-is with the
  existing image-error fallback. No user-supplied URL is constructed by the card.
- Continue to avoid interpolating raw response strings into HTML as anything other than text content
  (current lit-html binding is safe).

---

## Mass_queue Follow-up Opportunities

The new complete queue response unlocks improvements that were not possible with the core summary
action:

1. Use `queue_item_id` with `mass_queue.play_queue_item` so clicking a row plays the existing queue
  item instead of submitting its URI again through `media_player.play_media`.
2. Add remove and reorder controls using `mass_queue.remove_queue_item`,
  `mass_queue.move_queue_item_up`, `mass_queue.move_queue_item_down`, and
  `mass_queue.move_queue_item_next`.
3. Use `media_image` for queue-row artwork and support `local_image_encoded` if the optional
  `download_local` setting is enabled for local providers.
4. If queues can exceed 1000 items, add offset pagination or a configurable queue limit rather than
  silently truncating the response.
5. Use `mass_queue/get_info` only for optional capability and configuration diagnostics; do not make
  the card depend on its native Music Assistant player IDs because the card's public API is entity-based.

The highest-value preexisting API improvements remain transfer queue, search configuration entry
validation, media-type sanitization, input clamping, and the Music Assistant media-source root.

## Proposed change set

1. **C2 – Fix transfer** (highest value, lowest risk): swap `media_player.transfer_playback` for
   `music_assistant.transfer_queue` with `source_player` + target = destination. Update
   `runSpeakerAction` and its test.
2. **C1 – Add `config_entry_id` to search**: resolve via `config_entries/get` (cached), thread through
   `searchMusicAssistant`, add optional config override, update `adapters.test.ts`.
3. **R1 – Surface malformed responses as errors** in `getQueue` and `searchMusicAssistant`; add tests
   asserting the error path.
4. **R3 – Sanitize `media_type`** before `play_media` (omit when not an accepted MA type).
5. **R4 – Clamp volume/seek**; ignore `NaN` seek.
6. **R2 – Queue-index play**: verify MA "play index" availability; either adopt it or make the
   `enqueue` mode explicit and guard undefined `uri`/`media_type`.
7. **M1 – Remove duplicate `clear-queue` branch.**
8. **B1 – Default browse root to `media-source://music_assistant`** (shared constant; update
   `card.test.ts` / `adapters.test.ts`).
9. **B2 / S5 – Add image-load fallback** via a shared thumbnail helper used by the media-list and
   search views.
10. **B3 – Show play/queue actions for all `can_play` items** (independent of `can_expand`).
11. **B4 – Fix or gate search-result expand** after verifying `media_source/browse_media` accepts
    MA item IDs.
12. **S2 – Minimum search query length**; **S3 – fixed group ordering.**
13. Optional: **M2** (`media_play_pause`), **M4** (in-flight guard), **B5** (thumbnail signing),
    **B6** (browse caching / `get_library` pagination), **S4** (search filters / "show more").

### Verification per change

- `npm run lint`
- `npm test` (extend `adapters.test.ts` and `card.test.ts` for C1, C2, R1, B1)
- Manual smoke: search returns results, transfer moves playback, queue loads and clicking a queue
  item behaves deterministically, volume/seek stay in range.
- Browse smoke: opening browse lands on the Music Assistant source (B1); albums/playlists expose
  play/queue actions (B3); a broken artwork URL falls back to the music-note icon (B2/S5); search
  expand either navigates correctly or is not offered (B4).
