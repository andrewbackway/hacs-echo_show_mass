# Queue Logic Plan

Status: Approved and implemented.

## Goal

Keep the queue slide-out synchronized with the configured Home Assistant media player by reloading the queue whenever that player's `media_content_id` changes, using the Home Assistant `music_assistant.get_queue` action and a local queue cache.

Reference: [Home Assistant `music_assistant.get_queue`](https://www.home-assistant.io/actions/music_assistant.get_queue/)

## Current Behavior

- [src/card.ts](src/card.ts) loads the queue once when `hass` is first assigned while `show_queue` is enabled.
- A `queueRequested` flag prevents that automatic load from happening again.
- [src/music-assistant/queue.ts](src/music-assistant/queue.ts) already calls `music_assistant.get_queue` with the configured player as the target and requests a response.
- The action response is normalized from either the documented entity-keyed shape or the existing direct-details compatibility shape.
- [src/card/views/queue.view.ts](src/card/views/queue.view.ts) renders `CardState.queueState.details` inside the queue flyout.
- The card notices relevant player state changes for rendering, but it does not compare the old and new `attributes.media_content_id` values or use that change to refresh the queue.

## Proposed Design

### 1. Detect the active media change

In the `hass` setter, compare the configured player's previous and next `attributes.media_content_id` values.

- Normalize only string values; treat a missing value as `undefined`.
- Trigger a queue refresh when the values differ, including transitions to or from `undefined`.
- Do not refresh for routine progress, volume, playback-state, or unrelated-entity updates.
- Keep the existing initial queue load for the first usable `hass` assignment.
- Respect `show_queue`; if the queue feature is disabled, do not request queue data.

The comparison should happen before updating the stored previous `hass` reference, using the existing `lastHass` snapshot.

### 2. Add a local queue cache

Add a card-owned local cache containing the latest queue details and the media ID it was fetched for, for example:

```ts
private queueCache?: {
  mediaContentId?: string;
  details: QueueDetails;
};
```

Cache rules:

- On a media ID change, invalidate the prior cache for the old media ID and start a new `get_queue` request.
- Only store a response if its request is still current and the player has not changed media again.
- Clear the cache on config changes, disconnect/reconnect invalidation, and player configuration changes.
- Keep `QueueState` as the UI loading/error envelope; the cache is the source of successful queue details.
- Preserve the existing `RequestGuard` behavior so a slower response for the previous track cannot replace the current track's queue.

A cache field is preferable to a module-level variable because each card instance can have a different player and must not share queue data with another card.

### 3. Load through the documented Home Assistant action

Keep the service boundary in [src/music-assistant/queue.ts](src/music-assistant/queue.ts):

- Call `hass.callService('music_assistant', 'get_queue', undefined, { entity_id: player }, false, true)`.
- Read the documented response at `response[player]`.
- Preserve direct queue-details parsing only if compatibility with the current integration response is still desired.
- Treat a missing or malformed response as an error rather than silently rendering an empty successful queue.

The existing `loadQueue()` method in [src/card.ts](src/card.ts) should become the single owner of cache updates and UI loading/error transitions.

### 4. Render the queue slide-out from the cache

Update the queue rendering path so the active queue flyout uses the cached queue details.

- While a refresh is pending, show the existing loading state.
- On success, render the cached `items`, `current_index`, shuffle state, and metadata through [src/card/views/queue.view.ts](src/card/views/queue.view.ts).
- On failure, show the existing queue error state and do not display stale data from a different media ID.
- Preserve the current queue slide-out controls and row rendering unless a test exposes a related regression.

The implementation should avoid a second queue representation or duplicate fetch logic in the view.

### 5. Preserve mutation refreshes

Existing actions that change queue contents should continue to call `loadQueue()` after the service succeeds:

- play or enqueue media
- clear queue
- speaker transfer/group changes where queue data can change
- selecting a queue item

Those explicit refreshes should update the same local cache and use the same stale-response guard as media-change refreshes.

## Tests To Add or Update

Focus on behavior rather than implementation details:

1. Initial `hass` assignment calls `music_assistant.get_queue` once when queue display is enabled.
2. A new `hass` object with the same `media_content_id` does not call `get_queue` again.
3. A changed `media_content_id` calls `get_queue` again with the configured player's entity target.
4. Changes to unrelated player attributes, such as `media_position`, do not reload the queue.
5. A queue response keyed by the player is rendered in the queue flyout.
6. When two queue requests overlap, the newer media ID's response wins even if the older response resolves later.
7. A failed refresh shows an error and does not leave the previous track's queue displayed.
8. Config changes and disconnect/reconnect clear the cache and allow a fresh queue load.
9. Existing explicit queue mutations still refresh the same cache.

Likely test locations:

- [src/card.test.ts](src/card.test.ts) for `hass` transition and rendered flyout behavior.
- [src/card.lifecycle.test.ts](src/card.lifecycle.test.ts) for stale async response ordering and lifecycle invalidation.
- [src/music-assistant/adapters.test.ts](src/music-assistant/adapters.test.ts) for the documented entity-keyed response shape and malformed-response behavior.

## Acceptance Criteria

- The queue refresh is triggered by a change in the configured player's `media_content_id`.
- Queue data comes from the Home Assistant `music_assistant.get_queue` action, targeted at the configured player.
- The latest valid queue is cached per card instance and associated with the media ID that caused the request.
- The queue slide-out renders that cache and never shows a stale queue for a different media ID.
- Older asynchronous responses cannot overwrite newer queue data.
- Existing queue controls and explicit post-action refreshes continue to work.
- `npm test`, `npm run check`, and `npm run lint` pass after implementation.

## Approved Decisions

1. Keep the previous queue visible while a media-change refresh runs in the background.
2. Call `get_queue` even when `media_content_id` becomes missing, so a saved queue can still be shown.
3. Show malformed or missing queue responses as an error in the queue flyout.
4. Track changes only for the configured primary player.

## Implementation Boundary

The implementation is limited to the queue loader/state path, the `hass` media ID transition check, queue cache reset points, and focused queue/lifecycle tests. The queue view continues to consume the queue state supplied by the existing flyout; no unrelated API migration or UI redesign is included.
