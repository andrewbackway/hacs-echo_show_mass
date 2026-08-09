# Architecture & Code-Management Refactor Plan

> Status: **PROPOSED — awaiting approval.** No application code changes will be made until explicitly approved.
> Scope: structural/maintainability refactor only. No user-facing behavior or visual changes intended.

## 1. Summary of the current state

The project is a single Home Assistant custom Lovelace card (`music-assistant-card`). It is functional and reasonably tested, but the core is concentrated in one file that has grown into a "god class".

| File | Lines | Role | Health |
| --- | --- | --- | --- |
| `src/card.ts` | ~815 | Card element: CSS + state + rendering + events + logic + HA adapters + utils | **Overloaded** |
| `src/editor.ts` | ~144 | Config editor element | OK, minor duplication |
| `src/music-assistant/search.ts` | ~50 | Search API adapter | Good |
| `src/music-assistant/media-browser.ts` | ~42 | Browse API adapter | Good |
| `src/music-assistant/queue.ts` | ~42 | Queue API adapter | Good |
| `src/home-assistant.ts` | ~41 | Shared HA/card types | Good |
| `src/main.ts` | 1 | Entry point | Good |
| `src/*.test.ts` | — | vitest + jsdom tests | Good coverage foundation |

The `src/music-assistant/*` adapter layer is already clean, small, typed, and validated at the boundary. **The problem is almost entirely inside `src/card.ts`.**

## 2. Key architectural problems

### P1 — `card.ts` is a god class (815 lines, ~7 responsibilities)
`MusicAssistantCard` owns styling, four separate state slices, all HTML rendering, all event handling, business logic, HA service calls, and utility functions. Any change requires navigating the whole file, and unrelated concerns share the same scope.

### P2 — String-concatenation rendering into `innerHTML`
Every state change calls `render()`, which rebuilds the entire subtree via `this.root.innerHTML = ...`. Consequences:
- Manual XSS defense: every dynamic value must be wrapped in `escapeHtml()` by hand — easy to miss and a latent security risk.
- Whole-DOM teardown on each render forces workarounds (search-input focus/selection is manually saved and restored; progress bar is patched imperatively via `querySelector` in `updateProgress`/`updatePlayback` to avoid re-rendering).
- No diffing → wasted work and subtle focus/scroll bugs.

### P2a — Over-rendering / visible "flashing" every few seconds (reported bug)
**Root cause found.** Home Assistant assigns `card.hass = hass` on **every** state change of **any** entity (a fresh `hass` object each time). The current `set hass` (in `src/card.ts`) unconditionally calls `updatePlayback()`, which does:

```ts
playback.outerHTML = this.renderPlayback(player);
```

`outerHTML =` **destroys and recreates the entire `.playback` subtree**, including the `<img src="…">` album art. Recreating the `<img>` element forces the browser to re-fetch/re-decode the image → a visible flash. Because HA pushes a new `hass` on unrelated entity changes too, this fires every few seconds → continuous flashing.

Two compounding defects:
1. `set hass` does not check whether the **configured player** actually changed. HA reuses the same entity object reference when an entity is unchanged, so `oldHass.states[player] === newHass.states[player]` can gate the work — but that guard is missing.
2. `outerHTML` replacement recreates the `<img>` even when its `src` is unchanged, so the artwork reloads needlessly.

This is the concrete symptom of P2 and is fixable immediately (see Phase 0.5) without waiting for the full refactor.

### P3 — One monolithic delegated click handler
`bindEvents()` contains a single `click` listener with a long `if/else` chain branching on `dataset` keys (`data-speaker-id`, `data-item-action`, `data-path-*`, `data-control`, `data-queue-index`, …). Control flow is hard to follow, hard to test in isolation, and easy to break when adding actions.

### P4 — Duplicated async race-handling
The `requestId` + `lifecycleId` guard pattern is copy-pasted three times (`loadMedia`, `loadQueue`, `runSearch`), plus `invalidateRequests()` bumps three counters. This is repetitive and error-prone.

### P5 — Ad-hoc state management
State lives in ~20 mutable instance fields across four `*State` objects plus loose flags (`queueRequested`, `needsReconnectLoad`, `eventsBound`, `progressStartedAt`, …). Mutations and `render()` calls are scattered throughout, with no single source of truth or update path.

### P6 — Unstructured inline CSS
`cardStyles` is one large, minified-style string with duplicated rules (e.g. the `prefers-reduced-motion` block appears twice) and no logical grouping. Hard to find, hard to review, hard to change safely.

### P7 — No linter/formatter; very long lines
There is no ESLint/Prettier config. Many statements are packed onto single very long lines, which hurts readability, review, and diff quality. `tsconfig` provides some checks but not style/consistency enforcement.

### P8 — Minor: stale references & editor duplication
- `UI_REDESIGN_PLAN.md` references `src/music-assistant/api.ts`, which does not exist (leftover from an earlier stack). Docs should be reconciled.
- `editor.ts` has three near-identical `listen*` wiring helpers with repeated boilerplate.

## 3. Target architecture

Keep it a dependency-light vanilla Web Component (no framework mandate), but split `card.ts` by responsibility. Proposed `src/` layout:

```
src/
  main.ts                     # entry (unchanged)
  card/
    card.element.ts           # custom element: lifecycle, wiring, orchestration (thin)
    card.state.ts             # state shape + a small store/reducer + request-guard helper
    card.styles.ts            # organized CSS (grouped, de-duplicated)
    actions.ts                # HA service/business logic (play, queue, speakers, volume…)
    events.ts                 # event delegation → typed action dispatch
    views/                    # pure render functions returning markup
      topmenu.view.ts
      now-playing.view.ts
      search.view.ts
      media-list.view.ts
      queue.view.ts
      speakers.view.ts
      flyout.view.ts
    dom.ts                    # escapeHtml, formatDuration, small render helpers
  music-assistant/            # unchanged adapter layer (already clean)
  home-assistant.ts           # shared types (unchanged)
  editor.ts                   # config editor (light cleanup only)
```

Design principles:
- **Render functions are pure** `(state) => string` (or DOM), with no `this`. Easy to unit-test.
- **A single request-guard helper** replaces the three duplicated `requestId` blocks.
- **A tiny state store** centralizes mutation + a single `render()` trigger, removing scattered `this.render()` calls.
- **Event delegation maps to named action handlers**, replacing the giant `if/else`.
- **Escaping centralized**: prefer a small tagged-template `html\`\`` helper that auto-escapes interpolations, eliminating manual `escapeHtml` calls and P2's XSS risk.

### Decision: adopt `lit` (approved direction)
Home Assistant cards are conventionally built with `lit`, which gives declarative templates, auto-escaping, and efficient DOM diffing — directly solving P2, P2a, and P3. This is the highest-leverage change.
- **Pro:** eliminates manual escaping, whole-DOM teardown, the flashing/over-render bug (diffing keeps the `<img>` in place when `src` is unchanged), the focus/progress `querySelector` hacks, and much of the event plumbing.
- **Con:** adds a small runtime dependency and is a broad rewrite of the render/event layers.
- **Status:** confirmed — `lit` will be adopted (Phase 6 is now committed, not optional). The interim Phase 0.5 hotfix stops the flashing immediately so it is not blocked on the full migration.

## 4. Phased execution plan

Each phase is independently shippable, keeps tests green, and produces no behavior change. Order minimizes risk.

### Phase 0 — Tooling & guardrails (no src logic changes) — **DONE**
1. Add ESLint + Prettier (or Biome) with a config matching current style, and an npm `lint`/`format` script.
2. Add `lint` to the `build`/CI gate.
3. Reformat once (mechanical) so later diffs are clean.
- **Exit:** `npm run lint` passes; `npm test` unchanged.

### Phase 0.5 — Hotfix the flashing bug (P2a) — targeted, ships before the refactor — **DONE**
Small, low-risk change to `src/card.ts` that stops the every-few-seconds flashing now, without the full render rewrite:
1. In `set hass`, capture the previous `hass` and skip `updatePlayback()` when the configured player entity is unchanged: `if (prevHass?.states[player] === hass.states[player]) return;` (after still storing `_hass`, session-identity, and progress-timer sync). This alone removes flashing caused by unrelated entity updates.
2. Replace the `playback.outerHTML = …` teardown with a guarded in-place update: only patch the fields that changed (title/subtitle/state/controls) and **never recreate the `<img>` when its `src` is identical** — update `img.src` only when it differs, or reuse the existing node. This removes flashing when the player itself updates (e.g. position ticks).
3. Add a regression test asserting that a `hass` update which does not change the configured player does not replace the `.playback` element (e.g. tag the node and confirm identity is preserved), and that album-art `<img>` identity is preserved across position-only updates.
- **Exit:** no visible flashing during playback or on unrelated entity churn; tests green. This code is superseded by Phase 6 (`lit` diffing) but is worth doing immediately.
- **Note:** requires approval to touch `src/card.ts`.

### Phase 1 — Extract styles (P6) — **DONE**
1. Move `cardStyles` into `src/card/card.styles.ts`, grouped by region (host/vars, shell, top-menu, now-playing, search, flyouts, lists, media queries).
2. De-duplicate repeated rules (e.g. the doubled `prefers-reduced-motion` block).
- **Exit:** identical rendered output; tests green.

### Phase 2 — Extract utilities & centralize escaping (P2 partial) — **DONE**
1. Move `escapeHtml`, `formatDuration`, `toMediaItemFromSearch`, `getGroupMembers` into `src/card/dom.ts`.
2. Introduce an auto-escaping `html` tagged-template helper; begin using it in new/extracted views.
- **Exit:** no behavior change; utilities unit-tested.

### Phase 3 — Extract pure view/render functions (P1, P2) — **DONE**
1. Move each `render*` method into a pure function under `src/card/views/`, taking the data it needs as arguments (no `this`).
2. `card.element.ts` composes these; markup output must be byte-for-byte equivalent (guarded by existing DOM tests, add snapshots where helpful).
- **Exit:** `card.element.ts` render path is orchestration only; view functions independently testable.

### Phase 4 — Introduce a state store + request guard (P4, P5) — **DONE**
1. Add `src/card/card.state.ts` with the state shape and a minimal store exposing `getState`/`setState(patch)` that triggers a single render.
2. Add a `withRequestGuard`/`trackedRequest` helper and refactor `loadMedia`/`loadQueue`/`runSearch` to use it; drop the triplicated counters.
- **Exit:** all state changes go through the store; race behavior preserved; tests green.

### Phase 5 — Extract actions & event routing (P3) — **DONE**
1. Move HA/business logic (`playMedia`, `callService`, speaker/queue/volume actions, `handleControl`) into `src/card/actions.ts`.
2. Replace the monolithic click handler with a delegation table in `src/card/events.ts` mapping `dataset` intents → named action functions.
- **Exit:** `bindEvents` is a thin dispatcher; each action is unit-testable.

### Phase 6 — `lit` adoption (committed) — **DONE**
Convert view functions to `lit` templates and remove manual escaping plus the focus/progress/flashing workarounds (the Phase 0.5 hotfix is subsumed by `lit`'s diffing, which keeps the `<img>` node in place when `src` is unchanged).
- **Exit:** render/event hacks removed; no flashing; bundle size verified acceptable.

**Implementation notes:**
- Added `lit-html` (not the full `lit`/`LitElement` package) as a runtime dependency — only `html`/`render`/`nothing` are needed since the card stays a plain `HTMLElement` custom element; the existing store/actions/events architecture from Phases 4–5 needed no changes.
- All `src/card/views/*.ts` functions now return `TemplateResult` (via lit's `html` tag) instead of raw strings; every manual `escapeHtml()` call site is gone (`dom.ts`'s custom escaping `html`/`raw` helper and `escapeHtml` itself were removed as dead code once nothing depended on them).
- `card.ts`'s constructor now creates a separate `<style>` element (holding `cardStyles`, appended once, untouched by lit — `<style>`/`<script>` can't contain lit binding markers) and a `container` div that lit renders into on every `render()` call.
- `set hass` now always calls `this.render()` — the old `updatePlayback()` fast-path, `playbackSignature()`, and `lastPlaybackSignature` field are gone. Lit's diffing makes every render cheap and non-destructive, so the special-cased fast path is no longer needed.
- `updateProgress()` (the per-second timer callback while a track is playing) now just calls `this.render()` instead of manually poking `[data-seek]`/label DOM nodes; a new `computeLivePosition()` helper feeds the live position into `renderNowPlaying()`, and lit's diffing only touches the timeline's bound values.
- The search input renders its value via a lit **property** binding (`.value=`) rather than an attribute; combined with lit's dirty-checking (skips a DOM write when the bound JS value hasn't changed since the last render), this preserves focus/cursor/typed-text automatically — the old manual focus/selection-save-and-restore block in `render()` was removed entirely.
- Verified the production build strips lit's dev-mode console warning (Vite replaces `process.env.NODE_ENV` for `vite build`, so esbuild's minifier eliminates the dev-only branch) — confirmed by grepping the built artifact.
- Bundle size: ~46.9 kB → ~55 kB raw (~11.9 kB → ~15 kB gzip). A modest, expected increase for the templating/diffing engine.
- Test suite: 24/29 tests remain (5 removed were unit tests for the now-deleted custom `html`/`raw`/`escapeHtml` helper); all remaining tests, including the Phase 0.5 flashing-regression test, pass unmodified — that test now validates lit's diffing rather than the old signature-comparison hotfix.

### Phase 7 — Docs & cleanup (P8) — **DONE**
1. Reconcile `UI_REDESIGN_PLAN.md` / `API_STACK_MIGRATION_PLAN.md` references (remove stale `src/music-assistant/api.ts`).
2. De-duplicate `editor.ts` `listen*` helpers.
3. Update `README.md` with the new module map.

## 5. Risks & mitigations
- **Behavior/visual regressions:** every phase is guarded by the existing vitest/jsdom suite; add DOM-equivalence snapshots before large moves. Verify at the reference viewport before marking UI-adjacent phases done.
- **Bundle size (if `lit`):** verify `dist/music-assistant-card.js` size via the existing `verify-artifact.mjs` step after Phase 6.
- **Scope creep:** phases are mechanical/structural; no feature or design changes bundled in.
- **HACS artifact contract:** `scripts/copy-card.mjs` + `verify-artifact.mjs` must keep producing the same single-file output; run `npm run build` after each phase.

## 6. Success criteria
- No single source file over ~250 lines; `card.element.ts` is orchestration-only.
- Zero manual `escapeHtml` call sites (escaping centralized or handled by templates).
- Request-race logic exists in exactly one place.
- All state mutation flows through one store/update path.
- `npm run lint`, `npm test`, and `npm run build` all pass; artifact byte size within agreed bound.
- No behavior or visual change versus the current release.

## 7. Explicitly out of scope (unless separately approved)
- New features, new controls, or UI redesign (covered by `UI_REDESIGN_PLAN.md`).
- API/stack changes (covered by `API_STACK_MIGRATION_PLAN.md`).
- Changes to the `src/music-assistant/*` adapter contracts.

---
*Awaiting approval. Reply "approved" (optionally naming which phases and whether to adopt `lit`) to begin.*
