# Music Assistant Card

A HACS-installable custom Lovelace card for browsing and controlling Music Assistant from Home Assistant. The initial layout is designed for an Echo Show 5 landscape viewport at 960x480 and adapts to narrower screens.

## Current status

The card provides authenticated media-source browsing, expandable containers, breadcrumbs, artwork fallbacks, loading and error states, debounced global search with grouped results, native play or queue actions, current-track metadata, playback controls, progress and volume sliders, and queue viewing. Queue clearing and queue-item playback are supported. Queue removal and reordering are not currently exposed because the public Home Assistant Music Assistant service API does not provide those operations.

## Local preview

```sh
npm install
npm run dev
```

The preview uses a fixture for `media_player.living_room`. Home Assistant supplies the real authenticated connection when the built card is installed in a dashboard.

## Build

```sh
npm run check
npm test
npm run build
```

The distributable file is written to `dist/music-assistant-card.js`.

The local fixture at `http://127.0.0.1:5173/` (or the next available Vite port) includes representative browse, search, playback, and queue data for browser smoke testing. The card was verified at the 960x480 Echo Show reference layout and at a narrow responsive layout.

## Known limitations

The public Home Assistant Music Assistant services currently used by the card expose queue retrieval, clearing, playback, and enqueue behavior, but not generic queue-item removal or reordering. A generic favorite action is also not exposed consistently by the supported media-player service contract, so those controls are intentionally omitted rather than sending unsupported service calls.

## Home Assistant configuration

Install the repository through HACS as a dashboard frontend resource, then add the card:

```yaml
type: custom:music-assistant-card
player: media_player.living_room
config_entry_id: 01JEXNDHT21V0BHJXM7A5SZANV
layout: two-column
show_search: true
show_queue: true
click_action: play
```

The `player` and `config_entry_id` values are required. `player` may refer to a Music Assistant player or a supported synchronized group exposed by Home Assistant. `config_entry_id` is the Music Assistant integration entry used by the `music_assistant.search` action. The card uses Home Assistant's authenticated connection; it does not ask for or store Music Assistant credentials.
