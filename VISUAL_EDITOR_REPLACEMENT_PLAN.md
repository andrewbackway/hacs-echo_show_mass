# Visual Editor Replacement Plan

Status: Proposal only. No implementation is approved by this document.

## Goal

Replace the current visual editor with a small, predictable editor generated from a documented YAML contract. YAML is the source of truth. The editor is a convenience layer that must produce the same configuration a user could write by hand, and it must never invent a second configuration model.

The current editor is not a reliable foundation for that job:

- It hand-builds Home Assistant controls and wires several overlapping event names.
- It exposes implementation details from the older layout, including `show_search`, `show_queue`, and category switches.
- It treats `players` as a multi-value field but has to normalize a single picker value itself.
- It renders on every `hass` update without a clear preservation contract for focus, open controls, or partially edited values.
- Its labels and helper text describe behavior that is not fully represented by the card's current public contract.

The replacement should be designed from the YAML below, then reviewed against the current Home Assistant custom-card editor APIs before code is changed.

## Proposed YAML Contract

### Minimal configuration

```yaml
type: custom:music-assistant-card
player: media_player.living_room
```

`player` is the only required user setting. It must be a `media_player` entity ID and remains the card's primary playback target.

### Full configuration

```yaml
type: custom:music-assistant-card
player: media_player.living_room

# Optional Music Assistant integration entry. Required for the library/favorites browser.
music_assistant_config_entry_id: 0123456789abcdef0123456789abcdef

# Optional allow-list for the player picker and player/group actions.
# The primary player is always included by the card.
players:
  - media_player.living_room
  - media_player.kitchen

# What selecting a media item does.
click_action: play
```

`click_action` accepts `play` or `queue`, and defaults to `play`. An omitted `players` list means that all eligible Music Assistant media players are allowed. An omitted `music_assistant_config_entry_id` keeps the card usable with the existing browse/search fallback, but library features that require an integration entry cannot be populated.

### Fields intentionally excluded from the new contract

These fields must not be offered by the replacement editor:

| Field | Decision | Reason |
| --- | --- | --- |
| `layout` | Retire from active documentation and editor | The card has one responsive layout; a second layout mode creates an unsupported rendering path. |
| `show_search` | Retire from active documentation and editor | Search is a primary card workflow, not an optional layout fragment. |
| `show_queue` | Retire from active documentation and editor | Queue is an available flyout/action, not a second inline layout. |
| `search_categories` | Retire from active documentation and editor | Categories are application navigation and should not be configured as a fragile set of switches. |
| `type` | Preserve as required Lovelace metadata | Home Assistant owns this value; the editor must never let users change it. |

Existing configurations containing the retired fields should continue to load for the migration window. They should be ignored consistently, without creating a legacy rendering path or being re-emitted by the editor. Removing them from the active schema is a deliberate breaking-cleanup decision for documentation, generated config, and future tests, not a request to silently delete user YAML.

## YAML Behavior Rules

1. Do not write defaults into YAML unless the user changes that setting. A minimal card should remain minimal after opening and saving it in the editor.
2. Preserve unknown keys when emitting `config-changed`, unless the card explicitly rejects them during `setConfig`. This avoids destroying user-managed metadata during an editor change.
3. Normalize only at the card boundary: trim entity IDs and the integration entry ID, remove empty player IDs, and validate enum values.
4. Keep `players` a YAML sequence, even when one player is selected. The editor must use a true multi-entity selector or explicitly convert its output to a sequence.
5. Treat an empty optional value as omission where possible. In particular, do not emit `music_assistant_config_entry_id: ''` from the editor.
6. Reject invalid required data with a visible Home Assistant configuration error. Do not make the editor appear healthy while the card itself cannot initialize.
7. Keep the YAML examples in the README synchronized with this contract and include one minimal and one full example.

## Recommended Editor Shape

### First choice: Home Assistant built-in form schema

The current Home Assistant developer documentation describes `static getConfigForm()` for cards with relatively simple configuration. It supports a schema of controls, selectors, required fields, helper text, expandable sections, and an `assertConfig` callback. This card's proposed active configuration is small enough to use that API.

Proposed form schema, expressed as behavior rather than implementation:

| Order | YAML key | Control | Required/default | Notes |
| --- | --- | --- | --- | --- |
| 1 | `player` | Entity selector filtered to `media_player` | Required | Primary player; helper explains that synchronized groups are valid when exposed as media players. |
| 2 | `click_action` | Select | Omitted means `play` | Labels should describe the result: Play now / Add to queue. |
| 3 | `players` | Multi-entity selector filtered to `media_player` | Optional | Helper explains allow-list behavior and that the primary player is always included. |
| 4 | `music_assistant_config_entry_id` | Text selector | Optional | Put under an expandable Advanced section if the form becomes visually noisy. Explain when it is needed, not how to discover internal IDs at length. |

The form should use `computeLabel` and `computeHelper` for stable, user-facing copy, and `assertConfig` for cross-field or incompatible-value checks. The editor should not duplicate card rendering or data loading merely to display the form.

There is no custom-editor fallback. If the minimum supported Home Assistant version cannot provide this form API, the minimum supported version must be raised before implementation proceeds.

## Best-Practice Review

This proposal is based on the Home Assistant custom-card documentation reviewed on 2026-08-10:

- A card validates user configuration in `setConfig` and throws for invalid required data.
- A graphical editor is optional; Home Assistant calls `setConfig` on it and expects a bubbling, composed `config-changed` event with `{ config }` in `detail`.
- `getStubConfig()` supplies picker defaults and should represent the minimal useful configuration.
- The built-in `getConfigForm()` is the preferred lower-maintenance option for a relatively simple form. Selectors are preferred over native ad hoc input types.
- `assertConfig` can disable the form for incompatible configuration rather than allowing misleading edits.
- Entity suggestions through `window.customCards` are useful only when the card genuinely applies to the selected entity; broad suggestions would be noisy here.
- The editor should not assume that its controls are available before Home Assistant has upgraded them. The built-in form avoids much of that lifecycle risk.

Reference: [Home Assistant Custom Cards](https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card/), sections “Graphical card configuration” and “Using the built-in form editor”.

## Migration Plan After Approval

1. Confirm the minimum supported Home Assistant version and whether it supports `getConfigForm()` for this custom card.
2. Add focused configuration-contract tests before replacing the editor: minimal YAML, full YAML, retired keys, invalid player, invalid enum, and preservation of unknown keys.
3. Implement the built-in form schema as the only editor path.
4. Remove the old custom editor registration and implementation.
5. Update `getStubConfig()` to the minimal YAML shape; do not include empty optional strings.
6. Update the TypeScript config type and card normalization so the active contract and editor schema agree.
7. Update README YAML examples and the form's user-facing helper text.
8. Test in a real Home Assistant dashboard, including loading an old YAML config, opening the form, changing one field, and verifying the resulting YAML does not lose unrelated keys.

## Approval Checklist

- [ ] Minimal and full YAML examples are accepted as the public contract.
- [ ] `layout`, `show_search`, `show_queue`, and `search_categories` are retired from the active editor/schema.
- [ ] Legacy YAML loading behavior is explicitly accepted.
- [ ] Empty optional values are omitted rather than serialized as empty strings.
- [ ] `players` is always represented as a YAML sequence.
- [ ] Built-in `getConfigForm()` support is confirmed for the minimum supported Home Assistant version; otherwise that minimum is raised.
- [ ] The exact unknown-key preservation policy is accepted.
- [ ] No code changes begin until this checklist is approved.
