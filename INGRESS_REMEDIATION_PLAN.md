# Music Assistant Ingress Remediation Plan

## Status

**Planning only. No application code changes are authorized by this document.**

The published `v0.1.2` card incorrectly calls the Music Assistant HTTP API at a configurable absolute origin. A Lovelace card loaded from Home Assistant is browser JavaScript, so this crosses origins whenever the Music Assistant add-on port differs from the Home Assistant origin. The observed browser preflight failure is therefore expected.

The target installation runs Music Assistant as a Home Assistant add-on and has Home Assistant ingress enabled. The corrected design must automatically resolve the add-on's generated ingress path at runtime and make only same-origin relative requests through that path. It must not require a server URL, an add-on slug, an ingress URL, an ingress token, or an MA token in card YAML.

## Verified Home Assistant Discovery Contract

Home Assistant's frontend source uses the following Supervisor WebSocket calls for installed add-ons:

```ts
hass.callWS({
  type: "supervisor/api",
  endpoint: "/addons",
  method: "get",
});

hass.callWS({
  type: "supervisor/api",
  endpoint: `/addons/${slug}/info`,
  method: "get",
});
```

The documented response for `GET /addons/<addon>/info` includes:

- `name`
- `slug`
- `state`
- `ingress`
- `ingress_url`
- `ingress_entry`

`ingress_url` is the generated Home Assistant ingress route. It is the only route the transport may use. Its value is session-scoped operational data and must never be written to YAML, persistent browser storage, source, tests, build artifacts, logs, screenshots, documentation examples, or release notes.

The browser must construct endpoints relative to the current Home Assistant origin:

```text
<ingress_url>/api
<ingress_url>/ws
```

For an ingress URL that begins with `/`, `fetch(`${ingressUrl}/api`)` stays on whichever Home Assistant origin loaded the dashboard: internal hostname, external URL, reverse proxy path, HTTP, or HTTPS. It must never derive a separate host, append an add-on port, or call the container directly.

## Scope and Non-Negotiable Rules

1. Remove the direct MA server URL path from runtime behavior, editor configuration, defaults, README examples, and validation fixtures.
2. Do not expose a manual ingress URL/token configuration field.
3. Do not retain the current browser OAuth redirect/token flow for ingress transport unless live verification proves the ingress proxy still requires a separate MA bearer token. The starting assumption for implementation is that HA ingress session authentication is the boundary.
4. Do not fall back to an absolute URL, a container hostname, or a direct MA WebSocket URL after ingress discovery fails.
5. Do not guess the Music Assistant add-on slug. Discover installed add-ons first.
6. Do not select an add-on by display name alone if more than one candidate exists.
7. Do not log or render `ingress_url`; user-facing errors must describe the condition without including the route.
8. Do not change playback, queue, browse, search, speaker, favorite, or playlist semantics as part of the transport correction.

## Proposed Runtime Design

### 1. Add-on Discovery Adapter

Create a narrow Home Assistant adapter whose only responsibility is resolving a valid Music Assistant ingress base path from `hass.callWS`.

Proposed input:

```ts
resolveMusicAssistantIngress(hass: HomeAssistant): Promise<string>
```

Discovery algorithm:

1. Call `supervisor/api` with `GET /addons`.
2. Consider only installed add-ons.
3. Identify Music Assistant candidates using stable, explicit metadata from the returned overview. The initial candidate test should be based on the known Music Assistant add-on identity only after it has been live-observed from the returned list; it must not assume a literal slug in source.
4. For each candidate, call `supervisor/api` with `GET /addons/<slug>/info`.
5. Select only an add-on that has `ingress === true`, a non-empty `ingress_url`, and a started/usable state.
6. Reject zero matches with a precise setup error: Music Assistant add-on ingress is unavailable.
7. Reject multiple valid matches with a precise ambiguity error rather than choosing by array order.
8. Validate the returned value before using it:
   - it must be a path, not an absolute URL;
   - it must begin with `/`;
   - it must not contain an origin, query string, fragment, or path traversal;
   - normalize exactly one trailing slash.
9. Keep the resulting path in card instance memory only.

The adapter must be unit-tested with the exact WebSocket envelopes above and with valid, unavailable, stopped, malformed, zero-match, and ambiguous-match responses.

### 2. Same-Origin Ingress Transport

Replace `createMusicAssistantHttpTransport(baseUrl, token?)` with a transport built from the discovered relative ingress path.

Required transport properties:

- endpoint URL: `${ingressPath}/api` only;
- `fetch` defaults to same-origin credentials (`credentials: "same-origin"` or the browser default, made explicit in code);
- JSON RPC envelope remains the existing MA `message_id`, `command`, and `args` format;
- no MA `Authorization: Bearer` header;
- no direct-MA host, port, or origin input;
- error handling distinguishes a 401/403 ingress-session failure from an unavailable add-on or MA command error without disclosing the ingress path.

The card must call the discovery adapter before its first MA request, cache the path in memory for the current card instance, and invalidate it when:

- Home Assistant connection/session changes;
- a request returns ingress authorization/not-found failures that indicate the generated route is stale;
- the card disconnects and reconnects.

On invalidation, it may rediscover once and retry only the idempotent request that triggered discovery. It must not automatically replay mutations such as play, add-to-playlist, favorite, transfer, volume, or grouping commands.

### 3. Authentication Model

Remove the current `Connect Music Assistant` browser OAuth UI, `auth/providers` request, authorization URL redirect, callback query parsing, and in-memory MA bearer token from the ingress path.

The revised card state is:

```text
Home Assistant authenticated dashboard session
  -> Supervisor WebSocket authorizes add-on discovery
  -> generated ingress_url
  -> same-origin ingress request
  -> Music Assistant API
```

The Home Assistant session is the only browser credential used by the card. The card must not read, create, store, or display any token.

Before removing the old flow, live validation must prove whether MA's ingress proxy accepts `/api` requests with the dashboard session alone. If it returns a documented MA authorization challenge, stop the implementation and document the exact response; do not recreate the previous token-in-URL design as a fallback.

### 4. Configuration and Documentation

Remove `music_assistant_url` from:

- `MusicAssistantCardConfig`;
- card defaults;
- editor state and form field;
- `setConfig` validation and reset branches;
- tests and fixtures;
- README YAML examples;
- build/release documentation;
- historical status claims that describe direct HTTP access as an approved implementation.

Keep `player` as the configured input. The editor should state that the card automatically connects through the installed Music Assistant add-on's Home Assistant ingress route. It must not show an ingress URL or token.

The legacy `config_entry_id` compatibility field is unrelated to ingress. Decide separately whether it is still required by any remaining legacy code; do not retain it as part of this migration merely because it exists.

### 5. WebSocket Decision

Do not add ingress WebSocket support in the first repair slice. Restore working HTTP RPC over ingress first.

After HTTP ingress is live-verified, test whether `${ingressPath}/ws` proxies the MA WebSocket protocol under the same HA session. If it does, plan a separate event-driven update slice. If it does not, retain the existing limited refresh behavior until a supported HA-side realtime path is identified. Do not create a direct Music Assistant WebSocket connection.

## Required Live Validation Before Release

Run these checks from an actual Lovelace dashboard, using both an internal HA URL and the configured external/reverse-proxy URL where applicable.

1. `supervisor/api` `GET /addons` succeeds for the current dashboard user.
2. Candidate discovery finds exactly one started Music Assistant add-on with `ingress: true` and a non-empty `ingress_url`.
3. `POST <ingress_url>/api` succeeds for a read-only MA command.
4. Browser DevTools shows the request target is the current Home Assistant origin plus ingress path, never a separate add-on origin.
5. Browser DevTools shows no CORS preflight/direct-origin request to the MA add-on port.
6. `players/all`, root `music/browse`, and `music/search` return through ingress.
7. The configured HA `media_player` maps to an MA player and queue through ingress.
8. One harmless mutation, such as a queue add to a disposable test queue, succeeds through ingress.
9. Reload the dashboard and confirm discovery repeats without retaining a route or token in localStorage/sessionStorage/card config.
10. Restart the MA add-on or invalidate the ingress route, then verify one read-only rediscovery/retry succeeds and a mutation is not retried automatically.
11. Test normal user permissions. If `supervisor/api` is admin-only in the target HA release, capture the exact WebSocket error and stop before release; a card-only implementation cannot safely bypass that authorization boundary.
12. Verify the card under both internal and external HA origins without changing YAML.

## Automated Test Matrix

Add focused tests for:

- `/addons` request envelope;
- `/addons/<slug>/info` request envelope;
- valid ingress route resolution;
- add-on absent;
- add-on stopped;
- ingress disabled/null;
- malformed/absolute ingress URL rejection;
- multiple Music Assistant candidates;
- Supervisor permission-denied response;
- transport endpoint is `/<ingress>/api` and has no bearer header;
- stale ingress read request performs one rediscovery and retry;
- stale ingress mutation does not replay;
- card never renders OAuth connect UI or serializes a direct MA URL;
- card configuration migration rejects/ignores obsolete direct URL fields deterministically.

Run:

```sh
npm run check
npm test
npm run build
git diff --check
```

Then confirm the root HACS artifact matches the build and perform the live validation checklist above before creating a replacement release.

## Release Handling

`v0.1.2` is known broken for browser use when it targets a direct MA add-on URL. Do not silently edit that release. After ingress is implemented and live-verified:

1. release a new patch version, `v0.1.3` or later;
2. describe the fix as an ingress transport correction and direct-API CORS removal;
3. state that no server URL or MA token configuration is required;
4. include no ingress route, OAuth code, bearer token, internal host, or external URL in release notes.

## Approval Gate

Implementation may start only after explicit approval. The first implementation action must be the ingress-discovery adapter and its focused tests. No feature work, UI redesign, direct-API fallback, OAuth workaround, or unrelated refactor belongs in this remediation slice.
