# End-to-End Review and Remediation Plan

## Scope and baseline

This is a review-only plan. No application code was changed.

The current baseline passes `npm test` and `npm run check`, but that means only five adapter-focused tests pass. The existing preview is a synthetic fixture, not a Lovelace integration check. Browser inspection at a 960 x 480 viewport found that the preview page is 875px tall and its 640px-minimum-width card is placed in a 535px canvas, producing both vertical page overflow and a horizontal canvas scrollbar. It is not evidence that the card works at the advertised Echo Show reference size.

## Assessment

The project has a workable prototype core, but it is not ready to present as a reliable HACS card. The main risks are lifecycle/rendering behavior, incomplete Home Assistant editor integration, unverified Music Assistant contracts, and claims in the plans/README that overstate what has been tested.

## Findings

### P0 - Fix before release

1. **The editor does not use Home Assistant controls.**
   - [`src/editor.ts`](src/editor.ts) constructs and styles native `select`, `input`, and `checkbox` elements directly, then discovers entities by filtering raw `hass.states`.
   - This does not behave or look like the rest of Home Assistant. It bypasses `ha-entity-picker` domain filtering, unavailable/entity validation, current Home Assistant theming, and platform-standard change semantics. The configuration-entry input has no validation or discovery assistance.
   - The standalone preview makes these native controls especially conspicuous, but the larger problem is that it does not prove the editor works inside Lovelace.

2. **The card configuration flow rejects an incomplete new-card configuration.**
   - [`src/card.ts`](src/card.ts) requires a non-empty `config_entry_id` in `setConfig`, while `getStubConfig()` returns an empty ID.
   - A user should be able to add a new custom card, use the visual editor to complete it, and then save. The initial stub must render a configuration-required state rather than throw before the editor can resolve the value.

3. **A Home Assistant state update replaces the entire shadow DOM.**
   - The `hass` setter calls `render()` on every update, and `render()` assigns `shadowRoot.innerHTML` in [`src/card.ts`](src/card.ts).
   - This replaces controls during search typing, resets focus/caret, recreates sliders, and makes live UI interaction unstable when Home Assistant sends normal state updates. It also recreates every event handler. Replacing event nodes means the handlers are generally reclaimable rather than a permanent listener leak, but it is still the wrong rendering model for an interactive card.

4. **Asynchronous browsing and search can show stale data.**
   - [`src/card.ts`](src/card.ts) has no per-request sequence/version or cancellation for media browse requests; a slow earlier navigation can overwrite a later destination.
   - Search has a query comparison for successful responses, but error responses are not guarded equivalently. There is no cancellation on disconnect and the debounce timer is retained after the component is removed.

5. **Playback and queue mutations fail silently and do not consistently refresh.**
   - `playMedia()` and `callPlayerService()` in [`src/card.ts`](src/card.ts) propagate rejected service promises through `void` event callbacks. The user receives no error state.
   - Play/queue actions do not refresh queue data. A completed `clear_playlist` refreshes the queue, but a failed clear still attempts a reload; neither path reports the mutation failure.

### P1 - Address in the first stabilization release

6. **Changing card configuration leaves stale operational state.**
   - [`src/card.ts`](src/card.ts) sets `mediaRequested` and `queueRequested` once and does not reset them when `player`, search capability, or another relevant configuration value changes.
   - The editor can select a new player while the card continues showing the previous player’s queue/browse state.

7. **The API boundary trusts unvalidated external responses.**
   - [`src/music-assistant/media-browser.ts`](src/music-assistant/media-browser.ts), [`src/music-assistant/search.ts`](src/music-assistant/search.ts), and [`src/music-assistant/queue.ts`](src/music-assistant/queue.ts) cast Home Assistant/Music Assistant response data to local types without validating shape.
   - A service/version/provider response mismatch becomes an unclear rendering failure. Normalize and validate at adapters, return known empty/error states, and record the supported Home Assistant and Music Assistant API versions.

8. **The card has no component or interaction tests.**
   - [`src/music-assistant/adapters.test.ts`](src/music-assistant/adapters.test.ts) is the entire test suite. It covers five happy-path adapter cases only.
   - There are no tests for `setConfig`, the editor event contract, DOM preservation, browse/search races, service failures, player changes, responsive behavior, or actual configured/unconfigured states.

9. **The preview is not a faithful release harness.**
   - [`src/main.ts`](src/main.ts) creates a bespoke marketing/editor shell and a hand-written Home Assistant fixture; [`src/style.css`](src/style.css) defines global preview styles, not Lovelace behavior.
   - The production library entry is also `src/main.ts` in [`vite.config.ts`](vite.config.ts), mixing preview bootstrap and distributable entry concerns. Separate the card registration entry from the dev/demo entry so preview-only imports and global CSS cannot affect the HACS artifact.

10. **Responsive and interaction design do not meet the stated device target.**
   - [`src/style.css`](src/style.css) forces a 640px card in the preview canvas, making the claimed 960 x 480 composition overflow under its own inspector.
   - [`src/card.ts`](src/card.ts) uses text glyphs for player controls, duplicate reduced-motion CSS, no previous-track control despite the original scope, no elapsed/total time display, and a layout whose queue/playback area becomes disproportionately tall at the reference size.
   - The visual direction should follow Home Assistant’s surface, typography, icon, focus, spacing, and control conventions. Do not build an independent dark-themed admin page as proof of Lovelace fit.

11. **Documentation and plans overstate verification.**
   - [`PLAN.md`](PLAN.md) marks component/browser checks, cancellation, live-state handling, and broad validation as implemented although the repository does not contain that coverage.
   - [`README.md`](README.md) says the preview was verified at the reference layout and narrow layout. The current 960 x 480 check contradicts that claim.

### P2 - Clean up after correctness is established

12. **The configuration surface has dead or under-specified options.**
   - `layout` permits only `two-column`, so it currently adds configuration noise without behavioral value.
   - The player editor lists every `media_player`, not verified Music Assistant players/groups. Define the supported selection rules and show a clear unsupported-player status.

13. **Accessibility needs an explicit pass.**
   - The card has some labels and focus styling, but all state transitions, mutation errors, live updates, keyboard flows, slider behavior, icon tooltips, and contrast need keyboard/screen-reader validation in a real Home Assistant shell.

14. **Repository hygiene needs a small release gate.**
   - Remove unused starter artifacts such as [`src/counter.ts`](src/counter.ts) if still unreferenced, add a stable release/checklist workflow, and avoid committing generated output unless the release process deliberately requires it and validates it matches the source build.

## Proposed target architecture

### 1. Separate runtime, preview, and platform contracts

- Make one production entry that only registers the card and editor custom elements.
- Keep a separate dev-only preview entry and fixture. It must not be the built HACS resource.
- Define one richer Home Assistant type boundary (or use the supported Home Assistant frontend helper/types package if version compatibility permits) for `hass`, editor elements, entity-picker events, and service responses.
- Treat Music Assistant service and browse responses as untrusted at adapter boundaries. Normalize them into the card’s own stable view models.

### 2. Rebuild the editor around Home Assistant components

Use the same custom editor API (`getConfigElement`, `setConfig`, `hass`, and `config-changed`), but render Home Assistant’s own elements instead of native controls.

- Use `ha-entity-picker` for `player`, set `hass`, restrict it to `media_player`, and preserve/flag a currently configured entity that is unavailable or outside the supported Music Assistant capability set.
- Use `ha-textfield` for `config_entry_id` unless a stable, supported Home Assistant config-entry selector exists for the minimum supported version. Add required/error/helper state; do not pretend this opaque ID can be discovered safely when it cannot.
- Use `ha-select` with `mwc-list-item` (or the Home Assistant version-appropriate select implementation) for the click action.
- Use `ha-switch` for `show_search` and `show_queue` rather than raw checkboxes.
- Prefer `ha-form` plus selector schemas only if its versioned/public contract can cover the entity picker and all fields. Otherwise use the components above directly and test against the declared minimum Home Assistant version.
- Dispatch only typed, normalized config values. Render an incomplete-config editor state without making the card throw.

### 3. Make rendering stateful and race-safe

- Move from wholesale `innerHTML` replacement to a keyed reactive renderer or carefully scoped DOM updates. The search field, focus, slider interaction, and open browse location must survive unrelated `hass` updates.
- Add request IDs or `AbortController`-style cancellation at each async boundary. Apply a response/error only if it belongs to the latest browse/search/queue request and the card remains connected.
- Add `connectedCallback`/`disconnectedCallback` lifecycle management to clear timers and invalidate in-flight operations.
- Reset/reload derived browse and queue state when the relevant card configuration changes.
- Store and render operation errors in a single user-visible status model. Avoid unhandled rejections from event handlers.

## Delivery sequence

### Phase 0 - Contract and test harness (first)

1. Confirm the exact Music Assistant services, response examples, player/group capabilities, and minimum supported Home Assistant frontend version using a real development instance.
2. Split production entry from preview entry.
3. Add a browser/component test environment that can mount the custom elements with a realistic `hass` fixture. Add screenshot tests at 960 x 480 and 640px.
4. Correct `PLAN.md` and `README.md` claims immediately: label fixture-only validation honestly until live validation exists.

**Exit criteria:** A clean production bundle contains no preview bootstrap; CI can run unit, component, type, build, and screenshot/overflow checks.

### Phase 1 - Home Assistant-native editor and first-run flow

1. Replace custom native fields in `src/editor.ts` with the platform components listed above.
2. Implement correct `value-changed` handling and preserve `hass` propagation to each control.
3. Allow an incomplete new-card config to render the editor and an explicit card configuration-required state.
4. Validate player domain and supported capability; preserve old/unavailable config values visibly instead of discarding them.
5. Add editor tests for initialization, entity filtering, unavailable selected entity, input updates, booleans, and `config-changed` payloads.

**Exit criteria:** The editor is visually and behaviorally native in a real Lovelace dashboard, and a user can create/save a new card without hand-editing YAML.

### Phase 2 - Stabilize card lifecycle and actions

1. Introduce lifecycle cleanup and stale-request protection for browse, search, and queue operations.
2. Stop destructive rerenders during interaction; preserve input focus, input value/caret, and active slider gestures across `hass` updates.
3. Add an action-state model for play, queue, controls, and queue clear. Display errors and refresh queue state after every successful queue-affecting mutation.
4. Reload appropriate state when player/config changes and guard all calls against missing config/player state.
5. Add focused tests for races, disconnect cleanup, mutation failure, player switching, and no-config/unavailable-player behavior.

**Exit criteria:** No stale response can overwrite newer UI state; service failures are visible; interaction remains stable during repeated Home Assistant state updates.

### Phase 3 - Validate adapters and complete behavior

1. Validate and normalize browse/search/queue responses, including malformed payloads and entity-keyed/direct queue variants.
2. Test supported Music Assistant behavior on real data: empty providers, folders, groups, missing artwork, missing queue, search errors, slow responses, and unsupported players.
3. Decide and document the authoritative service contract for queue actions and the intended behavior for play-now versus enqueue.
4. Implement the missing declared playback behavior only after its Home Assistant/Music Assistant capability is confirmed. Do not create controls for unavailable services.

**Exit criteria:** Adapter tests cover success, empty, malformed, and failed responses; the README names the tested Home Assistant/Music Assistant versions and supported behavior.

### Phase 4 - Layout and accessibility polish

1. Design the card itself for 960 x 480 first, with bounded scroll regions and no dependence on a preview inspector width.
2. Replace raw control glyphs with Home Assistant-compatible icon controls and tooltips/accessible names.
3. Consolidate design tokens around Home Assistant theme variables, simplify nested surfaces, and remove duplicate CSS.
4. Verify keyboard navigation, focus visibility, touch targets, live status announcements, reduced motion, text truncation, and contrast.
5. Capture and approve browser screenshots in isolated card fixtures at 960 x 480, 640px, and a normal desktop dashboard width.

**Exit criteria:** Every reference viewport has no unintended horizontal overflow, no clipped critical controls, and no page-level scroll required to operate the card.

### Phase 5 - Release gate

1. Make CI run `npm test`, `npm run check`, `npm run build`, component/browser tests, and artifact verification.
2. Verify a newly built root `music-assistant-card.js` is the exact HACS artifact and can be loaded in a clean Home Assistant dashboard.
3. Update README configuration, screenshots, compatibility matrix, installation instructions, limitations, and troubleshooting.
4. Tag only after testing against a real Home Assistant/Music Assistant installation.

## Success metrics

- A new card can be configured entirely in the Lovelace visual editor using Home Assistant-native controls.
- The editor’s player selector is an `ha-entity-picker` constrained to `media_player` and correctly handles unavailable/current values.
- At 960 x 480, the isolated card has no horizontal overflow and all primary browse/playback/queue actions are reachable without page scrolling.
- Search typing and slider input remain stable during repeated `hass` updates.
- The code has tests for card/editor behavior, not only adapters; error and race paths are covered.
- Documentation distinguishes fixture tests from live Home Assistant/Music Assistant verification and makes no unverified release claims.