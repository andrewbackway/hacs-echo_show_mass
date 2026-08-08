# Music Assistant Card Architecture

The card uses the native Music Assistant HTTP command API through the installed Home Assistant add-on's ingress route.

## Runtime boundary

1. The authenticated Home Assistant frontend discovers installed add-ons through the Supervisor WebSocket API.
2. The card identifies the Music Assistant add-on from returned metadata and reads its active ingress route.
3. The route remains in card instance memory only.
4. Native browse, search, queue, playback, speaker, favorite, and playlist commands use same-origin `POST <ingress path>/api` requests with the Home Assistant session.

The card does not require a server URL, add-on slug, ingress route, ingress token, or Music Assistant credential in YAML. It does not call a container host or alternate port, and it does not fall back to a direct cross-origin request when discovery fails.

## Validation

Run `npm run check`, `npm test`, and `npm run build`. Validate the card from both internal and external Home Assistant dashboard URLs. Browser requests must stay on the dashboard origin, and the generated artifact must contain no direct Music Assistant host or credential.

## Scope

Playback-first controls, native browsing/search, queue management, speaker transfer/grouping, favorites, editable playlists, and playlist shuffle remain in scope. WebSocket event streaming and broader queue editing are separate follow-up work.
