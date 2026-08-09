# Echo Show Music Assistant Card

A custom Lovelace card for Home Assistant that lets you browse Music Assistant media, search your library, control playback, and manage the playback queue from an Echo Show-friendly interface. It is designed for a 960x480 landscape viewport and adapts to narrower screens.

## Current status

The card uses Home Assistant's authenticated frontend APIs for Music Assistant media-source browsing, search, queue retrieval, playback, and media-player controls. It provides expandable browsing, artwork, grouped search results, explicit play or queue actions, current-track metadata, speaker visibility and grouping, progress and volume controls, and queue viewing. Playlist and favorites actions are intentionally deferred, as is queue-index playback.

## Build

```sh
npm run check
npm run lint
npm test
npm run build
```

`npm run format` applies Prettier to source/config files; `npm run format:check` verifies formatting without writing.

The distributable file is written to the repository root as `music-assistant-card.js` for HACS. The same build also writes the preview bundle to `dist/`.

The card must be validated in a real Home Assistant Lovelace dashboard because its editor depends on Home Assistant frontend components and its data path depends on Home Assistant authentication.

## Project structure

```
src/
  main.ts               # Entry point
  card.ts                # MusicAssistantCard element: lifecycle, data loading, orchestration
  editor.ts               # Lovelace card config editor element
  home-assistant.ts       # Shared HA/card types
  card/
    card.styles.ts        # Card CSS
    card.types.ts         # Shared state-slice types
    card-store.ts          # Minimal state store (getState/setState -> single render)
    request-guard.ts       # Stale-async-response guard used by data loaders
    dom.ts                 # formatDuration/getGroupMembers/toMediaItemFromSearch helpers
    actions.ts              # HA service calls & business logic (playMedia, speaker/queue actions, handleControl)
    events.ts               # Delegated click-event routing
    views/                  # lit-html templates (topmenu, now-playing, search, media-list, queue, speakers, flyout)
  music-assistant/
    media-browser.ts        # media_source/browse_media adapter
    search.ts                # music_assistant.search adapter
    queue.ts                 # music_assistant.get_queue adapter
```

Rendering uses [`lit-html`](https://lit.dev/docs/libraries/standalone-templates/) (not full `lit`/`LitElement`) for templating and DOM diffing; `MusicAssistantCard` remains a plain `HTMLElement` custom element.

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

Publish releases with the GitHub CLI. Make sure the CLI is installed and authenticated first:

```powershell
winget install --id GitHub.cli
```

Close and reopen PowerShell after installation, then authenticate:

```powershell
gh auth login
gh auth status
```

If an already-open PowerShell still reports that `gh` is not recognized, refresh its `PATH` manually:

```powershell
$env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
gh --version
```

Then update the version in `package.json`, run the checks above, and publish the commit and release. Replace `0.1.4` with the next semantic version:

```powershell
$version = "0.3.0

git add package.json src music-assistant-card.js dist/music-assistant-card.js
git commit -m "Release Music Assistant card v$version"
git push origin main
git tag -a "v$version" -m "Release Music Assistant card v$version"
git push origin "v$version"
gh release create "v$version" --title "v$version" --generate-notes
```

On Bash, use `version=0.1.4` and `${version}` instead of the PowerShell `$version` syntax. HACS installs the tagged repository version and uses the root-level dashboard JavaScript. When the card changes, publish a new tag and release rather than asking users to download files manually.

To check an existing release instead of creating it again, run `gh release view "v$version"`.

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
layout: two-column
show_search: true
show_queue: true
click_action: play
```

The `player` value must be a Music Assistant `media_player` entity or synchronized group exposed by Home Assistant. Optionally provide `players` as a YAML list to limit the permitted player picker; leave it blank or omit it to permit all players. The primary `player` is always included. No server URL, ingress token, or Music Assistant credential is required in YAML. The visual editor allows an incomplete new-card configuration while it is being filled in.

## Known limitations

Playlist listing/mutation, favorites, and queue-index playback are currently deferred. Grouping is available only when Home Assistant reports the required media-player capability.

## Home Assistant configuration

Install the repository through HACS as a dashboard frontend resource, then add the card:

```yaml
type: custom:music-assistant-card
player: media_player.living_room
layout: two-column
show_search: true
show_queue: true
click_action: play
players:
  - media_player.living_room
  - media_player.kitchen
```

The `player` value is required and may refer to a Music Assistant player or synchronized group exposed by Home Assistant. The card uses the authenticated dashboard session and does not require Music Assistant add-on ingress or administrator permissions.
