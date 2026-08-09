# Home Assistant API Stack Migration Plan

## Decision and Scope

The card must operate only through the authenticated Home Assistant frontend APIs:

- `hass.callService` for supported Music Assistant and `media_player` services.
- `hass.callWS` only for standard, user-authorized Home Assistant WebSocket commands where a service response is not available.
- `hass.states` for player state, metadata, and the configured player list.

The card must not call Music Assistant add-on ingress, discover ingress through Supervisor APIs, or make direct HTTP requests to Music Assistant. Those paths require administrator-level add-on/Supervisor access and are incompatible with non-admin dashboard users.

No implementation is included in this plan. Approval is required before modifying application code.

## Current API Inventory

| Current behavior | Current API path | Home Assistant stack candidate | Status |
| --- | --- | --- | --- |
| Discover add-on ingress | `callWS({ type: 'supervisor/api', endpoint: '/addons' })` and `/addons/{slug}/info` | None needed; remove discovery | **Blocker: admin-only Supervisor API** |
| Send every native MA command | `fetch(<ingress>/api)` | Replace with HA service calls/actions | **Blocker: direct MA ingress** |
| Browse provider/library hierarchy | MA `music/browse` | `callWS({ type: 'media_source/browse_media', media_content_id: 'media-source://music_assistant' })` | Use this exact MA media-source root; preserve returned artwork URLs in the UI |
| Search | MA `music/search` | `music_assistant.search` with `config_entry_id`, `name`, and optional filters | Verified response groups: artists, albums, tracks, playlists, radio, audiobooks, podcasts |
| Load queue | MA `players/all`, `player_queues/get_active_queue`, `player_queues/items` | `music_assistant.get_queue` targeted at the MA `media_player` entity | Verified response is keyed by entity ID |
| Play / replace / enqueue media | MA `player_queues/play_media` | `music_assistant.play_media` only | Verified fields: `media_id`, optional `media_type`, and `enqueue`: `play`, `replace`, `next`, `replace_next`, or `add` |
| Play a queue index | MA `player_queues/play_index` | No known generic HA equivalent | **Exception: verify MA action availability** |
| Play/pause and next | MA queue commands | `media_player.media_play_pause`, `media_player.media_next_track` | Likely direct replacement |
| Shuffle and repeat | MA queue commands | `media_player.shuffle_set`, `media_player.repeat_set` | Likely direct replacement |
| Seek | MA `player_queues/seek` | `media_player.media_seek` | Likely direct replacement |
| Clear queue | MA `player_queues/clear` | `music_assistant.clear_queue` if registered | Verify exact service and response behavior |
| Set volume | MA `players/cmd/volume_set` | `media_player.volume_set` | Likely direct replacement |
| Transfer queue | MA `player_queues/transfer` | `music_assistant.transfer_queue`, targeted at destination, with `source_player` and optional `auto_play` | Verified action |
| Group / ungroup players | MA `players/cmd/group`, `ungroup`, `ungroup_many` | `media_player.join` / `media_player.unjoin`, when supported by the player integration | Provider capability-dependent |
| Add/remove favorite | MA `music/favorites/*` | No verified HA service equivalent | **Exception: potentially remove or defer feature** |
| List/create playlists/add tracks | MA `music/playlists/*` | No verified HA service equivalent | **Deferred: hide/disable all playlist controls for now** |

## Confirmed Repository Findings

- [src/music-assistant/ingress.ts](src/music-assistant/ingress.ts) resolves MA ingress via the Supervisor WebSocket endpoint. This is an administrator-level path and must be removed.
- [src/music-assistant/transport.ts](src/music-assistant/transport.ts) posts native MA commands to `<ingress>/api`. This is the direct MA request path and must be removed.
- [src/music-assistant/api.ts](src/music-assistant/api.ts) contains all native MA command wrappers used by the card. It should be replaced by a HA service/action adapter or deleted once callers have migrated.
- [src/music-assistant/search.ts](src/music-assistant/search.ts) already calls `music_assistant.search` through `hass.callService`; [src/music-assistant/queue.ts](src/music-assistant/queue.ts) already calls `music_assistant.get_queue`. Neither adapter is currently used by [src/card.ts](src/card.ts).
- [src/editor.ts](src/editor.ts), [src/home-assistant.ts](src/home-assistant.ts), and [README.md](README.md) currently expose and describe the ingress-path configuration. It must be retired.

## Technical Design

### API Boundary

Create one Home Assistant-only adapter owned by `src/music-assistant/`. It receives `HomeAssistant`, never receives an ingress URL, and exposes no `fetch` transport or MA-native player/queue identifiers.

```ts
const MA_MEDIA_SOURCE_ROOT = 'media-source://music_assistant';

type EnqueueMode = 'play' | 'replace' | 'next' | 'replace_next' | 'add';

interface MusicAssistantHaApi {
  browse(mediaContentId?: string): Promise<MediaBrowseResponse>;
  search(configEntryId: string, query: string): Promise<SearchResponse>;
  getQueue(playerEntityId: string): Promise<QueueDetails>;
  playMedia(playerEntityId: string, mediaId: string | string[], options?: {
    mediaType?: string;
    enqueue?: EnqueueMode;
  }): Promise<void>;
  transferQueue(sourcePlayerEntityId: string, destinationPlayerEntityId: string, autoPlay: boolean): Promise<void>;
}
```

The adapter calls the established frontend client methods only:

```ts
await hass.callWS({
  type: 'media_source/browse_media',
  media_content_id: mediaContentId ?? MA_MEDIA_SOURCE_ROOT,
});

await hass.callService('music_assistant', 'play_media', {
  media_id: mediaId,
  ...(options?.mediaType ? { media_type: options.mediaType } : {}),
  ...(options?.enqueue ? { enqueue: options.enqueue } : {}),
}, { entity_id: playerEntityId }, true);

await hass.callService('music_assistant', 'transfer_queue', {
  source_player: sourcePlayerEntityId,
  auto_play: autoPlay,
}, { entity_id: destinationPlayerEntityId }, true);
```

No adapter method may call `fetch`, form an `/api` URL, send `supervisor/api`, accept `ingress_path`, or construct MA-native `player_id`/`queue_id` values.

### Browse and Artwork Contract

- Change the media-browser adapter default from `media-source://` to `media-source://music_assistant`.
- Browse children only by the `media_content_id` returned by the preceding Home Assistant response. Do not synthesize `provider://`, `library://`, or MA server paths.
- Keep the existing structural validation: root and child items require `media_content_id`, `media_content_type`, and `title`; malformed child entries fail the request rather than being sent into card rendering.
- Map `thumbnail` from the media-browser response directly to the card image source. Treat it as Home Assistant-provided, authenticated media, not an MA ingress URL.
- Use `<img src="thumbnail" alt="">` where a non-empty thumbnail is returned. On image load failure or an absent value, replace it with the existing music-note fallback. Never hide a valid returned thumbnail behind a placeholder.
- Preserve each returned item's `can_play` and `can_expand` flags. An expandable item opens its returned child ID; a playable item calls `music_assistant.play_media` with the same returned ID.

### Service Data and Response Normalization

| Adapter operation | Domain/service or WS message | Data | Target | Normalized result |
| --- | --- | --- | --- | --- |
| Browse MA root or child | `media_source/browse_media` WS | `media_content_id` | N/A | Validated `MediaBrowseResponse` |
| Search | `music_assistant.search` | `config_entry_id`, `name`, `limit: 12`; optionally `media_type`, `artist`, `album`, `library_only` | none | Object containing only valid supported media-type arrays |
| Get library | `music_assistant.get_library` | `config_entry_id`, `media_type`, optional favorite/search/pagination/sorting fields | none | `{ items, limit, offset, order_by, media_type }`; only `items` is required by initial UI |
| Get queue | `music_assistant.get_queue` | none | `{ entity_id: playerEntityId }` | Read `response[playerEntityId]`; tolerate a direct response only for legacy compatibility |
| Play, replace, enqueue | `music_assistant.play_media` | `media_id`, optional `media_type`, optional `enqueue` | `{ entity_id: playerEntityId }` | Void success; then refresh entity and queue state |
| Transfer queue | `music_assistant.transfer_queue` | `source_player`, `auto_play` | `{ entity_id: destinationPlayerEntityId }` | Void success; refresh source and destination entity/queue state |

For all response-bearing calls, request `returnResponse: true`. A missing, non-object, or malformed response becomes a user-visible operation error and must not be rendered as if it were an empty successful response. Preserve the existing request/lifecycle IDs so stale asynchronous responses cannot overwrite a newer player, browse path, or search query.

### Player and Capability Model

Player selection is entity-based:

1. Treat `MusicAssistantCardConfig.player` as a Home Assistant `media_player` entity ID.
2. Delete `players/all` discovery and the friendly-name/attribute MA-player-ID matching path. Do not guess an entity-to-MA player mapping.
3. Build candidates from `hass.states` entries whose IDs start with `media_player.`. Exclude missing, `unavailable`, and `unknown` entities from interactive lists.
4. For `player_list: all`, show every remaining candidate. For `player_list: selected`, de-duplicate the configured `players` in first-occurrence order, append the primary `player` if absent, then omit unavailable runtime entities.
5. Use the entity's `friendly_name` when present; otherwise use its entity ID as the display label.
6. Read `attributes.supported_features` before exposing `media_player.join` or `media_player.unjoin`. Capability absence means the grouping UI is not rendered or is disabled with no action call. Re-evaluate this when `hass.states` updates.

The configured primary player remains the playback source. Selecting a player from the visible list changes the active entity ID used for subsequent actions and queue reads; it never requires or stores an MA native player ID.

### State and Failure Rules

- The card becomes usable once `hass` and a valid `player` are present. It must not enter an ingress discovery/loading state.
- Initialize browse state at `MA_MEDIA_SOURCE_ROOT`. Load browse data only when the browse screen is opened, preserving the existing lazy-load behavior.
- Queue state is keyed by active Home Assistant player entity ID. Clear it when that entity changes, then load with `music_assistant.get_queue`.
- Standard controls use HA media-player actions targeted at the active entity: play/pause, next, shuffle, repeat, seek, and volume. Do not route these actions through MA ingress.
- After a mutation, refresh only the impacted state: queue after play/queue/transfer; entity state after transport, seek, volume, shuffle, or repeat; both when required by displayed metadata.
- Convert denied, missing-action, malformed-response, and unsupported-feature errors into concise operation errors. Do not retry with Supervisor, ingress, direct HTTP, or an alternative user identity.
- Playlist controls are not rendered in this release. Favorite and queue-index controls are disabled or absent according to the exception register.

### Configuration Schema and Migration

```ts
interface MusicAssistantCardConfig {
  type: 'custom:music-assistant-card';
  player: string;
  config_entry_id?: string;
  player_list?: 'all' | 'selected';
  players?: string[];
  show_search?: boolean;
  show_queue?: boolean;
  click_action?: 'play' | 'queue';
}
```

- Remove `ingress_path` from the public type, defaults, validation, visual editor, README, and example YAML.
- Reject `player_list: selected` when `players` is not an array of non-empty `media_player.*` entity IDs. In `all` mode, ignore a legacy `players` list rather than failing the card.
- Normalize selected entities at runtime rather than rewriting the user's YAML automatically. The effective list includes the primary player even when the saved `players` list does not.
- `config_entry_id` remains required for `search` and `get_library`; it is not needed for targeted player actions, queue retrieval, transfer, or media-source browse. If a user enables search without it, hide the search control and report a configuration error rather than discovering MA through Supervisor.

### Acceptance Tests

1. The built card contains no `fetch`, `supervisor/api`, `ingress_path`, `/api/hassio_ingress`, or MA native command strings such as `players/all` and `player_queues/`.
2. Opening browse first calls `media_source/browse_media` with exactly `media-source://music_assistant`; opening a child uses exactly its response-provided ID.
3. A browse result with `thumbnail` renders an image; no thumbnail or a failed image renders the fallback artwork.
4. Play and queue buttons call only `music_assistant.play_media`, with the active entity target and `enqueue: 'replace'` or `enqueue: 'add'` respectively.
5. Search normalizes documented grouped results; queue normalizes the documented entity-keyed response; malformed responses produce errors rather than blank success views.
6. Selected-player mode presents configured players in order and includes the primary player exactly once. Unavailable entities do not appear or receive service calls.
7. Grouping controls are hidden/disabled without the relevant `supported_features`; playlist controls are absent; queue-index and favorite actions cannot reach a direct MA call.
8. A non-admin dashboard user can browse, search, read queue state, play, enqueue, and transfer using only Home Assistant-authorized calls.

## Exception Register

1. **MA browsing through Home Assistant**: use the exact media-source root `media-source://music_assistant`; do not use direct MA browse commands. Retain only the hierarchy and metadata returned to the authenticated HA session. Render returned artwork/thumbnail URLs as cover art, with the existing generic-art fallback only when absent or failing.
2. **HA-only generic browsing**: defer a generic `media_player`/HA-only browsing alternative to future work. It is outside this migration; this card continues to browse the MA media source through Home Assistant.
3. **Queue-index playback**: standard `media_player` services do not select an arbitrary queue position, and no documented `music_assistant` action exposes queue-index selection. Hide or disable this control until such an action exists.
4. **Queue transfer**: this is supported by `music_assistant.transfer_queue`. Target the destination entity and pass the source MA player entity as `source_player`; do not depend on MA queue IDs.
5. **Favorites**: the current feature uses MA library IDs and URIs, which are not supplied by generic HA player state. Treat as unsupported until a documented HA `music_assistant` action is confirmed.
6. **Playlist support**: hide or disable playlist listing, creation, and track-mutation UI for this release. No documented HA action currently covers the needed playlist mutations.
7. **Player grouping**: use `media_player.join` and `media_player.unjoin` only when the selected MA player advertises the required supported features. Hide or disable grouping controls when unavailable; never show an action that is expected to fail.
8. **Verified service response contracts**: current HA documentation (2026.8.1) confirms that `music_assistant.search` returns media-type groups; `music_assistant.get_queue` returns queue details keyed by targeted entity ID; and `music_assistant.get_library` returns `{ items, limit, offset, order_by, media_type }`. MA integration support requires MA server 2.4 or later. Runtime tests must still validate real non-admin authorization and the exact frontend `callService` envelope.

## Proposed Player Visibility Configuration

Use Home Assistant `media_player` entity IDs rather than MA player IDs. This avoids MA direct player discovery and lets the user restrict what the card exposes.

```yaml
# Default: all eligible Home Assistant media_player entities
player_list: all

# Restricted: display only these Home Assistant media_player entities
player_list: selected
players:
  - media_player.living_room
  - media_player.kitchen
```

Rules:

- `player_list` defaults to `all` for backwards-compatible behavior.
- `players` is required and must contain at least one `media_player` entity when `player_list: selected`.
- The editor uses a mode selector and a multi-entity picker filtered to `media_player`.
- In `all` mode, list entities from `hass.states` that are `media_player` and eligible for the action. In `selected` mode, preserve the configured order, omit absent/unavailable entities, and never add unconfigured players.
- The configured primary `player` is automatically included in a selected list when omitted. Persist it into the normalized effective list without requiring the user to select it twice.

## Implementation Plan After Approval

1. Validate the verified current contracts with a non-admin Home Assistant user on the latest Home Assistant Core and MA server supported by the integration (MA 2.4+): `music_assistant.search`, `get_queue`, `get_library`, `play_media`, and `transfer_queue`, plus standard player controls and supported-feature flags.
2. Define a single HA adapter module around `callService`/`callWS`. Move the existing search and queue adapters into it; add the verified `music_assistant.play_media` and `transfer_queue` wrappers; normalize their documented responses and errors.
3. Refactor [src/card.ts](src/card.ts) to consume HA adapter results and Home Assistant entity state. Remove ingress lifecycle, transport construction, MA player-ID mapping, and native queue-ID dependencies.
4. Replace the browse UI with `callWS({ type: 'media_source/browse_media', media_content_id: 'media-source://music_assistant' })` and child media-source IDs returned from it. Map returned thumbnail/artwork fields to visible cover art, preserving the fallback artwork behavior.
5. Route every play, replace, and enqueue request solely through `music_assistant.play_media`; do not fall back to `media_player.play_media` or MA ingress. Replace remaining controls with confirmed HA services, and hide or disable queue-index, favorite, playlist, and unsupported grouping controls.
6. Add `player_list` and `players` to the card config, config validation, editor controls, and player-list filtering.
7. Remove ingress configuration, Supervisor discovery, direct MA transport, and their documentation/tests. Update YAML examples and migration notes.
8. Add focused tests for exact `play_media` payloads and enqueue modes, search/queue/library response normalization, MA media-source browse requests and cover-art mapping, non-admin denied access, player-list modes and automatic primary inclusion, unavailable selected entities, playlist suppression, and capability-gated grouping.
9. Run `npm run check`, `npm test`, and `npm run build`, then test manually in a non-admin Lovelace dashboard.

## Questions Requiring Direction

The following decisions are settled for this migration:

1. The primary `player` is automatically included in `player_list: selected`.
2. A generic Home Assistant-only browsing experience is deferred to future work; browsing is MA media-source browsing through the HA WebSocket API.
3. Target the latest released Home Assistant Core and Music Assistant integration/server supported by it; the plan records the documented MA minimum server version of 2.4.
4. Playlist features are hidden or disabled for now.
