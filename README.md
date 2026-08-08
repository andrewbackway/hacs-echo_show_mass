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

The distributable file is written to the repository root as `music-assistant-card.js` for HACS. The same build also writes the preview bundle to `dist/`.

The local fixture at `http://127.0.0.1:5173/` (or the next available Vite port) includes representative browse, search, playback, and queue data for browser smoke testing. The card was verified at the 960x480 Echo Show reference layout and at a narrow responsive layout.

## GitHub and HACS deployment

The GitHub repository is [andrewbackway/hacs-echo_show_mass](https://github.com/andrewbackway/hacs-echo_show_mass). The repository is structured as a HACS dashboard frontend repository. The built file is `music-assistant-card.js` at the repository root, which is committed for HACS to discover, and the HACS metadata is in `hacs.json`.

### Publish a release

Run the checks locally before publishing:

```sh
npm ci
npm test
npm run check
npm run build
```

Commit the source and generated `music-assistant-card.js` output, push the branch to GitHub, and create a GitHub release with a semantic version tag such as `v0.1.0`. HACS installs the tagged repository version and uses the root-level dashboard JavaScript. When the card changes, publish a new tag and release rather than asking users to download files manually.

### Install through HACS

The repository can be added as a custom HACS frontend repository until it is included in the default HACS store:

1. Open **HACS** in Home Assistant.
2. Open the menu and choose **Custom repositories**.
3. Add `https://github.com/andrewbackway/hacs-echo_show_mass`.
4. Set the repository type to **Dashboard**.
5. Add the repository, open **Music Assistant Card**, and choose **Download**.
6. Restart Home Assistant if HACS requests it.

After installation, register the generated JavaScript as a Lovelace resource if HACS has not added it automatically:

```yaml
url: /hacsfiles/hacs-echo_show_mass/music-assistant-card.js
type: module
```

In **Settings > Dashboards > Resources**, add the URL above as a JavaScript **Module** resource. If the resource already exists, do not add a duplicate. Clear the browser cache or reload the dashboard after upgrading to a new release.

### Add the card

Add a manual card to a dashboard:

```yaml
type: custom:music-assistant-card
player: media_player.living_room
config_entry_id: 01JEXNDHT21V0BHJXM7A5SZANV
layout: two-column
show_search: true
show_queue: true
click_action: play
```

The `player` value must be the Music Assistant `media_player` entity or a supported synchronized group. The `config_entry_id` is the Music Assistant integration entry used by global search. Both values are required.

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
