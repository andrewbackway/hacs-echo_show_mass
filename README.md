# Echo Show Music Assistant Card

A custom Lovelace card for Home Assistant that lets you browse Music Assistant media, search your library, control playback, and manage the playback queue from an Echo Show-friendly interface. It is designed for a 960x480 landscape viewport and adapts to narrower screens.

## Current status

The card provides Home Assistant OAuth authentication, native Music Assistant provider browsing, expandable containers, artwork fallbacks, loading and error states, debounced global search with grouped results, explicit play or queue actions, current-track metadata, playback controls, speaker transfer/grouping, progress and volume sliders, queue viewing, favorites, editable playlist actions, and playlist shuffle. Queue removal and reordering are not currently exposed because the native Music Assistant API does not provide those operations in the verified contract.

## Build

```sh
npm run check
npm test
npm run build
```

The distributable file is written to the repository root as `music-assistant-card.js` for HACS. The same build also writes the preview bundle to `dist/`.

The card must be validated in a real Home Assistant Lovelace dashboard because its editor depends on Home Assistant frontend components and its data path depends on Home Assistant authentication.

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
music_assistant_url: http://10.1.0.123:8095
layout: two-column
show_search: true
show_queue: true
click_action: play
```

The `player` value must be the Music Assistant `media_player` entity or a supported synchronized group. The card authenticates to Music Assistant through Home Assistant OAuth; it does not ask for or store a Music Assistant password or token in YAML. The visual editor allows an incomplete new-card configuration while it is being filled in.

## Known limitations

The native Music Assistant API exposes queue retrieval, clearing, playback, enqueue behavior, favorites, playlists, and speaker controls, but not generic queue-item removal or reordering. Favorite removal is enabled only when Music Assistant supplies a reliable library item identity; the card never guesses identifiers from playback URIs.

## Home Assistant configuration

Install the repository through HACS as a dashboard frontend resource, then add the card:

```yaml
type: custom:music-assistant-card
player: media_player.living_room
music_assistant_url: http://10.1.0.123:8095
layout: two-column
show_search: true
show_queue: true
click_action: play
```

The `player` value is required and may refer to a Music Assistant player or a supported synchronized group exposed by Home Assistant. `music_assistant_url` defaults to the configured Music Assistant server when omitted. The card uses Home Assistant OAuth and keeps the resulting session token in runtime memory only.
