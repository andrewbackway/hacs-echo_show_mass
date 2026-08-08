# Music Assistant Home Assistant Card Plan

## Goal

Build a HACS-installable custom Lovelace card for Music Assistant in Home Assistant, optimized for an Echo Show 5 landscape touch display while remaining usable on desktop and mobile.

The card should let a user browse Music Assistant media, navigate folders or playlists, inspect songs, and start playback without leaving the Home Assistant dashboard.

## Verification status

The repository now has adapter, custom-element, lifecycle, and production-artifact tests. Real Lovelace validation against the supported Home Assistant frontend and live Music Assistant service responses is required before release. Browser screenshot checks must run against a real Home Assistant dashboard.

## Proposed First Version

### Layout

- **Left column: navigation and media sources**
  - Music Assistant media root
  - Providers and source categories
  - Folders or playlists
  - Back navigation and breadcrumb path
  - Optional search entry point

- **Right column: current media view and playback**
  - Current folder or collection title
  - Media list with artwork, title, artist, album, and media type
  - Song rows with a clear play action
  - Multi-select or queue actions only if they are supported cleanly by Music Assistant
  - Empty, loading, and error states

- **Persistent playback area**
  - Current track artwork and metadata
  - Play/pause
  - Previous and next
  - Seek position and duration where the entity exposes them
  - Volume control and player/device selector
  - Queue shortcut if the selected player supports queue services

### Media List Behavior

- Display folders and navigable containers before songs where the API provides hierarchy.
- Selecting a folder opens it in the right column and updates the breadcrumb.
- Selecting a song starts playback or adds it to the queue, depending on the chosen behavior.
- Use artwork when available and a neutral media-type placeholder when it is not.
- Preserve the current browse path while playback state updates.
- Support touch-friendly row heights and keyboard navigation for desktop use.

### Search Behavior

- Provide a global search entry point in the left column and make it easy to reach on the Echo Show touch screen.
- Search across the available Music Assistant media sources through Home Assistant's authenticated connection.
- Debounce input and show a clear loading state while results are requested.
- Group results by media type or source, with artwork, title, artist, album, and provider labels where available.
- Follow the useful parts of the Spotify search pattern without copying its branding: one search field, categorized results, recent or active query state, and direct play or queue actions.
- Selecting a result keeps the user in the card, updates the browse context when appropriate, and supports the configured play-now or queue action.
- Show no-results, unavailable-source, and search-error states with a way back to the previous browse view.

## Integration Approach

1. Implement a custom Home Assistant card using the standard custom element and Lovelace card APIs.
2. Read Music Assistant data through Home Assistant state and service calls rather than building a separate backend.
3. Detect the relevant Music Assistant entities and expose a configurable player/entity target.
4. Use Home Assistant service calls for playback actions and subscribe to state changes so the card updates without manual refresh.
5. Keep the media-browser adapter isolated from the visual components so Music Assistant API or service details can change without rewriting the layout.
6. Use Home Assistant authentication for every request; the card stores no Music Assistant credentials or separate browser session.
7. Package the built JavaScript as a HACS frontend repository with a HACS-compatible distribution file and installation instructions.

## Suggested Project Structure

```text
README.md
PLAN.md
hacs.json
package.json
tsconfig.json
vite.config.ts
src/
  card.ts
  components/
    browse-panel.ts
    media-list.ts
    now-playing.ts
    player-controls.ts
  music-assistant/
    types.ts
    media-browser.ts
    services.ts
  styles/
    card.css
  test/
    media-browser.test.ts
    card.test.ts
public/
  icon.svg
```

The exact framework is intentionally undecided. A lightweight TypeScript custom element implementation is the default unless an existing preference or reusable component library is selected.

## Delivery Phases

### Phase 1: Project and integration spike

- Initialize the frontend build and HACS metadata.
- Confirm the target Home Assistant and Music Assistant entity/service model.
- Render a card shell with configurable player/entity settings.
- Verify the card loads through a local Home Assistant test dashboard or fixture.

### Phase 2: Browse experience

- Add left-column source navigation. **Implemented.**
- Add right-column folders and songs list. **Implemented.**
- Add breadcrumbs, loading state, empty state, error state, and artwork fallback. **Implemented.**
- Implement folder navigation and the selected-item state. **Implemented.**
- Use Home Assistant's authenticated `media_source/browse_media` WebSocket command through an isolated adapter. **Implemented.**

### Phase 3: Search

- Add the global search field and query state. **Implemented.**
- Implement debounced searching through the Home Assistant/Music Assistant media interfaces. **Implemented.**
- Render grouped, labeled results with artwork and direct play/queue actions. **Implemented.**
- Cover recent query state, no results, unavailable providers, cancellation, and errors. **Implemented.**
- Use the authenticated `music_assistant.search` action with response data and normalize its grouped result payload. **Implemented.**

### Phase 4: Playback

- Connect play, pause, next, volume, shuffle, repeat, and clear-queue actions to Home Assistant. **Implemented.**
- Add current-track metadata and progress display. **Implemented.**
- Implement queue viewing and queue-item playback. **Implemented.** Queue reordering and removal are not exposed by the public Home Assistant Music Assistant service API currently used by the card.
- Use Home Assistant's native play-media behavior as the default song action. **Implemented.**

### Phase 5: Responsive Echo Show polish

- Optimize for touch targets, landscape layout, and readable viewing distance. **Implemented.**
- Add responsive behavior for narrow screens by stacking the columns. **Implemented.**
- Add restrained transitions for navigation and playback-state changes. **Implemented.** Includes a reduced-motion fallback.
- Validate contrast, focus states, and error messaging. **Fixture-covered.** Focus rings, Home Assistant theme variables, and explicit loading/error states are present; live Lovelace accessibility validation remains open.

### Phase 6: Verification and release

- Add unit tests for media-tree mapping and service-call generation. **Implemented.** `npm test` covers media browsing, search payloads, grouped result flattening, and both queue response shapes.
- Add browser or component tests for folder navigation, search, queue editing, and playback controls. **Partially implemented.** Custom-element tests cover configuration, action errors, lifecycle races, reconnects, and DOM preservation. The local preview is manually smoke-tested; automated browser screenshots remain open.
- Test against representative Music Assistant states, missing artwork, unavailable players, empty folders, and service errors. **Implemented for fixture and adapter paths.** Live Home Assistant validation remains environment-dependent.
- Build the distributable asset and document HACS installation and card configuration. **Implemented.**
- Complete the full feature set before the first public HACS release. **Implemented for supported public services.** Queue reordering/removal and generic favorite are documented limitations because no public service contract was found for them.

## Initial Configuration Proposal

```yaml
type: custom:music-assistant-card
player: media_player.living_room
config_entry_id: 01JEXNDHT21V0BHJXM7A5SZANV
layout: two-column
show_search: true
show_queue: true
click_action: play
```

Configuration names are provisional and should be finalized after the entity/service questions below are answered.

## Open Questions

1. **Target device:** The target device is an Echo Show 5 in landscape, using 960x480 as the initial reference viewport.
2. **Player selection:** One configured `media_player` is sufficient for the complete first release; player switching is out of scope.
3. **Music Assistant version:** Music Assistant is expected to run as a Home Assistant add-on. Support the current stable Home Assistant and Music Assistant releases when implementation begins.
4. **Browse API:** Use Home Assistant's native media-browser and service APIs where possible, with Music Assistant-specific mapping isolated behind an adapter.
5. **Sources:** Search and browsing should include every Music Assistant provider available to the authenticated user, including local files, streaming services, radio, playlists, favorites, albums, and artists where exposed.
6. **Click behavior:** Use Home Assistant's native play-media behavior, exposed through a configurable action that defaults to play now.
7. **Folders:** The first release will treat filesystem-like folders, playlists, albums, artists, provider categories, and other navigable containers uniformly. Are any of these out of scope?
8. **Queue:** Queue viewing and editing are included in the first release.
9. **Search:** Global search is required and should search across the available Music Assistant sources, using a Spotify-like categorized-results experience adapted to Home Assistant.
10. **Visual direction:** Follow Home Assistant's native UI language, adapted for touch and viewing distance on the Echo Show 5.
11. **Player controls:** Required controls are play/pause, next, seek, volume, shuffle, repeat, favorite, and queue. Previous and mute are not required.
12. **Multi-room behavior:** Support Music Assistant synchronized groups as valid targets for the configured player entity.
13. **Authentication and secrets:** Always use Home Assistant authentication; do not request or store Music Assistant credentials in the card.
14. **Release scope:** Build the complete solution for the first public HACS release, including browsing, global search, playback, and queue editing.

## Recommended Decisions for a Fast First Release

- Target the Echo Show 5 landscape viewport first, using 960x480 as the initial reference size and responsive stacking for smaller screens.
- Configure one `media_player`; player switching is out of scope for the first release.
- Treat provider categories, playlists, albums, artists, and filesystem-like folders as generic navigable media containers.
- Include every provider available to the authenticated user rather than hard-coding a provider allowlist.
- Use Home Assistant's native media-browser and service interfaces, with Music Assistant running as a Home Assistant add-on.
- Make the song click action configurable, defaulting to Home Assistant's native play-media behavior.
- Include global search and queue viewing/editing in the complete first release.
- Use Home Assistant authentication for all data and service access.
- Support synchronized Music Assistant groups through the configured target entity where Home Assistant exposes them.

## Definition of Done for V1

- The card installs through HACS and loads as a custom Lovelace card.
- A user can open a Music Assistant source, navigate folders or other containers, and see songs.
- A user can start playback and control the active player from the card.
- A user can search across available Music Assistant sources and play or queue results.
- A user can view and perform supported actions on the playback queue. Queue removal and reordering require a future public Music Assistant/Home Assistant service.
- A user can target a supported synchronized Music Assistant group.
- The card reflects loading, empty, unavailable, and service-error states clearly.
- The layout is usable at the Echo Show 5 reference size of 960x480 and remains functional on a narrow screen.
- Configuration, supported versions, known limitations, and installation steps are documented.
