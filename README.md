# Echo Show Music Assistant Card

A touch-friendly Lovelace card for controlling [Music Assistant](https://www.music-assistant.io/) from Home Assistant. It is designed for an Echo Show in landscape orientation, while remaining usable on smaller dashboard displays.

## 1. Overview

Use the card to see what is playing, control playback and volume, browse your Music Assistant library, search across your music, manage the active queue, and select or group speakers. Media selections can play immediately or be added to the queue.

The card uses your authenticated Home Assistant dashboard session. It does not require a Music Assistant URL, ingress token, or Music Assistant credentials in the card YAML.

<p align="center">
  <img src="public/Echo%20Show%203.png" alt="Echo Show 3 running the Music Assistant card" width="31%" />
  <img src="public/Echo%20Show%205%20(1).png" alt="Echo Show 5 running the Music Assistant card" width="31%" />
  <img src="public/Echo%20Show%205%20(2).png" alt="Echo Show 5 showing the Music Assistant card" width="31%" />
</p>

## 2. Install With HACS

Before installing the card, make sure Home Assistant and the Music Assistant integration are installed and that you have a Music Assistant `media_player` entity or synchronized group to use as the primary player.

Until this repository is listed in the default HACS store, add it as a custom dashboard repository:

[![Add to HACS](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=andrewbackway&repository=hacs-echo_show_mass&category=plugin)

1. In Home Assistant, open **HACS**.
2. Open the menu, then select **Custom repositories**.
3. Add `https://github.com/andrewbackway/hacs-echo_show_mass`.
4. Choose **Dashboard** as the repository type.
5. Open **Echo Show Music Assistant Card** and select **Download**.
6. Restart Home Assistant if HACS asks you to.

HACS normally registers the Lovelace resource. If it does not, add this JavaScript module in **Settings > Dashboards > Resources**:

```yaml
url: /hacsfiles/hacs-echo_show_mass/music-assistant-card.js
type: module
```

Reload the dashboard after installation or an update. Do not add a duplicate resource if one already exists.

### Required: `mass_queue`

Install [`droans/mass_queue`](https://github.com/droans/mass_queue) through HACS and configure it to connect to Music Assistant. This card uses its `mass_queue.get_queue_items` service to display and interact with the complete playback queue; Home Assistant's built-in queue action does not supply enough queue detail.

After installation, confirm that `mass_queue.get_queue_items` is available in Developer Tools before using the card. The card requests up to 1,000 queue items for the configured primary player and refreshes the queue when playback changes.

## 3. Configuration

Add the card from the dashboard's **Add card** dialog and use the visual editor, or create a manual card with the required `player` field:

```yaml
type: custom:music-assistant-card
player: media_player.living_room
```

For Music Assistant library categories, Favorites, and full-text search, add the Music Assistant config entry ID. Find it in the Music Assistant integration's configuration entry, then use it with any optional settings you need:

```yaml
type: custom:music-assistant-card
player: media_player.living_room
music_assistant_config_entry_id: 0123456789abcdef0123456789abcdef
click_action: queue
players:
  - media_player.living_room
  - media_player.kitchen
```

| Setting | Required | Description |
| --- | --- | --- |
| `player` | Yes | A Music Assistant `media_player` entity or synchronized group. This is the player controlled by the card. |
| `music_assistant_config_entry_id` | For library and search | The Music Assistant integration config entry ID. Without it, playback controls still work, but library categories, Favorites, and full-text search cannot load. |
| `click_action` | No | `play` (default) replaces the current queue when a media item is selected. `queue` adds the selected item to the queue. Individual media rows also provide explicit play and queue actions. |
| `players` | No | A YAML list that limits the speaker picker to selected `media_player` entities. The primary `player` remains available even if it is not listed. Omit it to show all media players. |

The card includes the music library, search, and queue controls by default. Older options such as `layout`, `show_search`, `show_queue`, and `search_categories` are not part of the visual editor and should not be used in new configurations.

## 4. Build And Deployment

### Local development

Install the Node.js dependencies, then run the checks and build:

```sh
npm ci
npm run check
npm run lint
npm test
npm run build
```

`npm run format` applies Prettier; `npm run format:check` verifies formatting without changing files. The build writes the HACS artifact to the repository root as `music-assistant-card.js` and also produces the preview artifact in `dist/music-assistant-card.js`.

Validate the completed build in a real Home Assistant Lovelace dashboard, where Home Assistant components and authenticated Music Assistant requests are available.

### Publish a release

Update the version in `package.json`, run the checks above, and use the GitHub CLI to publish a tagged release. Replace `x.x.x` with the new semantic version:

```powershell
$version = "2.0.0"

git add package.json src music-assistant-card.js dist/music-assistant-card.js
git commit -m "Release Music Assistant card v$version"
git push origin main
git tag -a "v$version" -m "Release Music Assistant card v$version"
git push origin "v$version"
gh release create "v$version" --title "v$version" --generate-notes
```

HACS installs the tagged repository version and serves the root-level `music-assistant-card.js` file. Publish a new tag and GitHub release for every user-facing card update.
