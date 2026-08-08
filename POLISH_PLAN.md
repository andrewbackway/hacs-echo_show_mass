# Music Assistant Card Polish Plan

## Goal

Make the card feel like a deliberate, touch-first music controller for an Echo Show 5 landscape display rather than a prototype made from stacked bordered panels. Preserve the existing Home Assistant integration and supported playback behavior while improving hierarchy, density, visual rhythm, and feedback.

## Current status

The card now uses Home Assistant icon elements, delegated event handling, playback-only updates for steady-state `hass` changes, and a production artifact CI gate. Remaining validation must happen inside a real Lovelace dashboard at the 960 x 480 and narrow reference sizes.

## What Feels Unfinished Today

- The card has too many nested borders and rounded boxes competing for attention.
- The playback area is visually detached from browsing and leaves a large amount of unused space.
- Playback controls previously used raw text glyphs; production markup now uses Home Assistant `ha-icon` elements. The project intentionally has no standalone preview because it cannot reproduce Home Assistant's component registry or authenticated runtime.
- The queue is visually flat: the current item, queue actions, and secondary metadata do not have enough hierarchy.
- Search, breadcrumbs, media rows, and playback controls use nearly the same visual weight.
- The preview page still contains leftover starter CSS, so it does not provide a clean, trustworthy presentation frame.
- The vertical volume slider works but is visually isolated and has no compact control grouping around it.

## Visual Direction

Use a calm, warm-neutral Home Assistant surface with one blue interaction accent and a dark ink text color. The card should feel dense and composed at 960x480, with a clear playback anchor and quiet browsing surfaces.

- Use one outer card surface and mostly unframed internal sections.
- Reserve borders for the outer card, search field, and meaningful separators.
- Use a restrained 8px radius for controls and media tiles.
- Use the Home Assistant theme variables first, with neutral fallbacks.
- Keep typography readable from a viewing distance: 16px section labels, 15px media titles, 13px metadata, and strong contrast for active playback.
- Replace raw glyph controls with familiar icon shapes from a small local icon treatment or an existing icon library if one is introduced; keep text labels in `aria-label` and tooltips.
- Avoid gradients, decorative blobs, and dashboard-card nesting.

## Implementation Phases

### 1. Recompose the layout

- Change the desktop composition to a compact top workspace plus a dedicated playback rail:
  - Left: source navigation and search.
  - Center/right: media browser or search results.
  - Bottom: now playing, progress, core controls, and queue summary.
- Remove the second-level panel borders and excessive padding.
- Give the browser and queue bounded scroll regions so the card stays useful at 960x480.
- Keep the current responsive stack below 680px, but make the playback rail stack in a predictable order: now playing, controls, queue.
- Ensure `getCardSize()` reflects the compact layout rather than reserving unnecessary vertical space.

### 2. Establish a real visual system

- Replace repeated literal colors with local CSS custom properties mapped to Home Assistant theme variables.
- Define consistent spacing, control heights, border colors, muted text, active color, and surface colors.
- Remove the leftover preview starter CSS and create a simple neutral preview canvas with a centered 960x480 reference frame.
- Add a compact status treatment for loading, empty, unavailable, and error states.
- Use separators and whitespace for grouping instead of additional cards.

### 3. Polish media browsing and search

- Make the search field a clear primary action in the source column, with a stronger focus state and compact icon treatment.
- Style breadcrumbs as a single quiet navigation trail instead of a vertical list of back buttons.
- Use consistent media rows with fixed thumbnail dimensions, a clear title line, one metadata line, and a right-side action affordance where appropriate.
- Add a visible active/current state for the currently playing item when its URI can be matched.
- Keep folder rows and playable rows visually distinct without adding more containers.
- Make long titles truncate without shifting row height.

### 4. Polish playback and queue

- Make now-playing artwork the visual anchor, with title and artist beside it.
- Group play/pause, next, shuffle, and repeat into one compact control cluster with consistent icon buttons and tooltips.
- Keep seek horizontal and volume vertical, but place volume in a small dedicated control zone with a subtle level indicator.
- Show elapsed and total duration around the seek slider when available.
- Make the current queue item unmistakable with an accent bar or active tint, not only text color.
- Make queue rows tighter and show the clear action as an icon button with a tooltip.
- Keep supported queue actions only: play item, clear queue, play now, and add to queue. Do not add unsupported reorder/remove/favorite calls.
- Refresh queue state after supported queue mutations and show a lightweight action error state if a service call fails.

### 5. Interaction quality and accessibility

- Preserve visible keyboard focus rings with adequate contrast.
- Add tooltips or accessible labels for every icon-only control.
- Add `aria-live` only to dynamic status regions, not the entire card.
- Respect `prefers-reduced-motion` and keep transitions under 180ms.
- Ensure touch targets are at least 40px and do not shift when metadata changes.
- Handle missing player state gracefully with an unavailable state instead of an empty-looking playback surface.

### 6. Verification and release

- Add adapter tests for browse, search, queue response normalization, and service payloads.
- Add component/browser checks for:
  - 960x480 desktop/Echo Show composition.
  - 640px responsive stack.
  - Browse folder navigation.
  - Debounced grouped search.
  - Playback and vertical volume controls.
  - Queue clear and queue-item playback.
  - Missing artwork, empty queue, and unavailable player states.
- Check horizontal overflow, focus visibility, text truncation, and screenshot hierarchy.
- Run `npm test`, `npm run check`, and `npm run build` before release.
- Update `README.md` with the visual behavior, supported controls, and known API limitations.

## Acceptance Criteria

- At 960x480, the card reads as one cohesive music surface with no large unexplained empty region.
- The first visual anchor is the current track and its controls; browsing remains immediately reachable.
- No page section looks like an unnecessary card nested inside another card.
- Search, browsing, playback, and queue have distinct hierarchy without relying on heavy borders.
- The vertical volume control is intentional, compact, and accessible.
- The layout remains usable at 640px without horizontal scrolling.
- All existing Home Assistant calls and authenticated data paths remain intact.
- All automated checks pass and a browser screenshot confirms the intended hierarchy.

## Recommended Order

1. Replace the preview shell CSS and recompose the card grid.
2. Introduce the card-level design tokens and simplify borders/padding.
3. Refine playback and queue markup/styles.
4. Refine browse/search rows and breadcrumb treatment.
5. Add missing error/status feedback and accessibility details.
6. Run browser screenshots at 960x480 and 640px, then update documentation.
