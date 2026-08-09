export const cardStyles = `
  /* Host & shell */
  :host { --music-bg: var(--card-background-color, #101416); --music-surface: #171d20; --music-raised: #20282b; --music-line: #2d383b; --music-text: var(--primary-text-color, #f2f6f5); --music-muted: var(--secondary-text-color, #9ba9aa); --music-accent: var(--primary-color, #65d6c7); display: block; color: var(--music-text); font-family: var(--paper-font-body1_-_font-family, 'Segoe UI', sans-serif); }
  .card { min-height: 240px; box-sizing: border-box; padding: 14px; border: 1px solid var(--music-line); border-radius: 12px; background: var(--music-bg); box-shadow: 0 12px 28px rgb(0 0 0 / 24%); }
  .card { --music-card-height: 430px; --music-header-height: 56px; --music-touch-target: 48px; --music-list-row-height: 56px; --music-flyout-width: clamp(360px, 50%, 500px); position: relative; height: min(var(--music-card-height), calc(100dvh - var(--music-dashboard-chrome, 0px))); max-height: calc(100dvh - var(--music-dashboard-chrome, 0px)); overflow: hidden; }

  /* Top menu */
  .top-menu { position: absolute; z-index: 10; inset: 14px 14px auto; display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 14px; min-height: var(--music-header-height); pointer-events: none; }
  .top-menu .player-action { min-width: 0; justify-content: flex-start; text-align: left; pointer-events: auto; }
  .top-menu .menu-actions { display: flex; justify-content: flex-end; gap: 6px; pointer-events: none; }
  .top-menu .menu-action { min-width: var(--music-touch-target); min-height: var(--music-touch-target); pointer-events: auto; }
  .top-menu .menu-label { flex: 1 1 auto; min-width: 0; max-width: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  /* Now playing */
  .primary-view { position: absolute; z-index: 1; inset: 14px; min-height: 0; overflow: hidden; }
  .now-playing-screen { padding-top: var(--music-header-height); }
  .now-playing-screen .playback { display: grid; grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) auto auto; height: 100%; box-sizing: border-box; gap: 12px; margin: 0; padding: 18px 10px 8px; border: 0; background: transparent; }
  .now-playing-layout { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: 28px; min-height: 0; }
  .now-playing-art { width: min(180px, 30vh, 40vw); aspect-ratio: 1; display: grid; place-items: center; overflow: hidden; border-radius: 8px; background: var(--music-raised); color: var(--music-muted); }
  .now-playing-art img { width: 100%; height: 100%; object-fit: cover; }
  .now-playing-art ha-icon { --mdc-icon-size: 42px; }
  .now-playing-details { display: grid; gap: 6px; min-width: 0; width: 100%; max-width: 80%; justify-self: start; text-align: left; }
  .playback-state { color: var(--music-muted); font-size: 13px; text-transform: uppercase; letter-spacing: .08em; }
  .now-playing-title { display: -webkit-box; overflow: hidden; color: var(--music-text); font-size: 28px; font-weight: 650; line-height: 1.12; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow-wrap: anywhere; }
  .now-playing-subtitle { display: -webkit-box; overflow: hidden; color: var(--music-muted); font-size: 21px; line-height: 1.2; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow-wrap: anywhere; }
  .now-playing-controls { justify-content: space-between; margin: 0; }
  .playback-controls { display: flex; align-items: center; gap: 14px; }
  .utility-controls { display: flex; align-items: center; gap: 7px; }
  .utility-controls .repeat-control { margin-left: 14px; }
  .repeat-control.active { border-color: var(--music-accent); color: var(--music-accent); }
  .repeat-control.muted { color: var(--music-muted); opacity: .72; }

  /* Search / browse */
  .search-screen { display: grid; grid-template-rows: auto minmax(0, 1fr); gap: 10px; padding-top: var(--music-header-height); }
  .search-layout { display: grid; grid-template-columns: minmax(160px, .35fr) minmax(0, 1fr); gap: 16px; min-height: 0; }
  .search-navigation, .search-results { min-height: 0; overflow: auto; overscroll-behavior: contain; }
  .search-results { padding-right: 4px; }
  .primary-header, .flyout-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: var(--music-header-height); }

  /* Flyouts (queue / speakers / volume) & confirm dialog */
  .flyout-backdrop { position: absolute; z-index: 20; inset: 0; border: 0; background: rgb(0 0 0 / 38%); cursor: pointer; }
  .flyout { position: absolute; z-index: 30; inset: 0 0 0 auto; display: grid; grid-template-rows: var(--music-header-height) minmax(0, 1fr); width: var(--music-flyout-width); box-sizing: border-box; padding: 14px; border-left: 1px solid var(--music-line); background: var(--music-surface); box-shadow: -12px 0 28px rgb(0 0 0 / 28%); }
  .flyout[data-flyout="volume"] { width: 33.333%; }
  .flyout-body { min-height: 0; overflow: auto; overscroll-behavior: contain; }
  .flyout[data-flyout="queue"] .flyout-body { overflow: hidden; }
  .flyout[data-flyout="queue"] .queue { height: 100%; }
  .flyout[data-flyout="queue"] .queue-list { height: 100%; max-height: none; }
  .confirm-backdrop { position: absolute; z-index: 40; inset: 0; display: grid; place-items: center; padding: 24px; background: rgb(0 0 0 / 52%); }
  .confirm-dialog { display: grid; gap: 14px; width: min(100%, 360px); box-sizing: border-box; padding: 20px; border: 1px solid var(--music-line); border-radius: 8px; background: var(--music-raised); box-shadow: 0 16px 36px rgb(0 0 0 / 35%); }
  .confirm-actions { display: flex; justify-content: flex-end; gap: 8px; }
  .control.danger { border-color: var(--error-color, #ff8f8f); color: var(--error-color, #ff8f8f); }
  .flyout-body .speaker-sheet, .flyout-body .playlist-sheet { display: block; margin: 0; padding: 0; border: 0; background: transparent; }
  .flyout-body .speaker-sheet .panel-header, .flyout-body .playlist-sheet .panel-header { display: none; }
  .volume-flyout-body { display: grid; place-items: center; min-height: 100%; }
  .volume-slider-flyout { width: 40px; height: 80%; justify-self: center; --control-slider-color: var(--music-accent); --control-slider-thickness: 40px; }
  .now-playing-screen .playback > .queue, .now-playing-screen .playback [data-control="shuffle"], .now-playing-screen .playback [data-control="speaker"], .now-playing-screen .playback [data-control="playlist"], .now-playing-screen .playback .volume-control { display: none; }

  /* Lists (queue / speakers / playlists / media browse) */
  .queue-list, .speaker-list, .playlist-list { min-height: 0; overflow: auto; overscroll-behavior: contain; }
  .queue-row, .speaker-row, .playlist-list > .control { min-height: var(--music-list-row-height); }
  .speaker-actions { display: flex; align-items: left; justify-content: space-between; gap: 10px; min-height: var(--music-touch-target); margin-bottom: 8px; }
  .speaker-select { flex: 1; justify-content: flex-start; min-height: var(--music-touch-target); border: 0; background: transparent; text-align: left; }
  .speaker-row .row-action { border: 0; background: transparent; }
  .speaker-actions { position: sticky; bottom: 0; z-index: 1; padding-top: 8px; background: var(--music-surface); }
  h1, h2, p { margin: 0; }
  .columns { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: 20px; }
  .panel { min-height: 0; padding: 4px 0; }
  .panel-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
  .panel-title { color: var(--music-text); font-size: 15px; letter-spacing: .01em; }
  .path { color: var(--music-muted); font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .media-list { display: grid; gap: 3px; }
  .media-row, .back-button { width: 100%; min-height: 50px; box-sizing: border-box; display: flex; align-items: center; gap: 11px; padding: 7px; border: 0; border-radius: 7px; background: transparent; color: inherit; text-align: left; font: inherit; cursor: pointer; transition: background-color 140ms ease, transform 140ms ease; }
  .media-row:hover, .media-row:focus-visible, .back-button:hover, .back-button:focus-visible { background: var(--music-raised); outline: none; }
  .media-row:active, .back-button:active { transform: scale(.99); }
  .media-row:focus-visible, .back-button:focus-visible { box-shadow: 0 0 0 2px var(--music-accent) inset; }
  .thumb { width: 42px; height: 42px; flex: 0 0 42px; display: grid; place-items: center; overflow: hidden; border-radius: 6px; background: var(--music-raised); color: var(--music-muted); font-size: 18px; }
  .thumb img { width: 100%; height: 100%; object-fit: cover; }
  .media-copy { min-width: 0; display: grid; gap: 2px; }
  .media-title { overflow: hidden; color: var(--music-text); font-size: 14px; font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }
  .media-meta, .panel-copy { color: var(--music-muted); font-size: 12px; line-height: 1.4; }
  .media-meta { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .state { padding: 22px 8px; color: var(--music-muted); font-size: 13px; line-height: 1.45; text-align: center; }
  .error { color: var(--error-color, #ff8f8f); }
  .back-button { min-height: 34px; padding-block: 3px; color: var(--music-accent); font-size: 12px; }
  .back-button span:first-child { font-size: 20px; line-height: 1; }

  /* Search input & result groups */
  .search { display: flex; align-items: center; align-self: start; gap: 8px; min-height: 0; height: auto; box-sizing: border-box; margin: 0; padding: 6px 9px; border: 1px solid var(--music-line); border-radius: 7px; background: var(--music-surface); }
  .search:focus-within { border-color: var(--music-accent); box-shadow: 0 0 0 1px var(--music-accent); }
  .search-icon { color: var(--music-muted); font-size: 17px; }
  .search input { width: 100%; min-height: 0; border: 0; outline: 0; background: transparent; color: inherit; font: inherit; font-size: 13px; line-height: 1.4; }
  .search input::placeholder { color: var(--music-muted); }
  .result-group { display: grid; gap: 4px; margin-bottom: 14px; }
  .result-heading { margin: 0 7px 2px; color: var(--music-muted); font-size: 11px; font-weight: 700; letter-spacing: .09em; text-transform: uppercase; }

  /* Playback bar, controls & timeline */
  .playback { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(280px, 1fr); gap: 22px; margin-top: 12px; padding: 14px 16px 12px; border-top: 1px solid var(--music-line); background: var(--music-surface); }
  .now-playing { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .now-playing .thumb { width: 64px; height: 64px; flex-basis: 64px; border-radius: 7px; }
  .controls { display: flex; align-items: center; gap: 7px; margin-top: 11px; }
  .control, .queue-action { min-width: 38px; min-height: 36px; display: inline-flex; align-items: center; justify-content: center; gap: 5px; padding: 6px 9px; border: 1px solid var(--music-line); border-radius: 7px; background: transparent; color: var(--music-text); font: inherit; cursor: pointer; transition: background-color 140ms ease, border-color 140ms ease, transform 140ms ease; }
  .control:hover, .control:focus-visible, .queue-action:hover, .queue-action:focus-visible { background: var(--music-raised); border-color: var(--music-accent); outline: none; }
  .control:focus-visible, .queue-action:focus-visible { box-shadow: 0 0 0 1px var(--music-accent) inset; }
  .control.primary { background: var(--music-accent); border-color: var(--music-accent); color: #102022; }
  .timeline { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 8px; margin-top: 8px; color: var(--music-muted); font-size: 11px; }
  .progress { width: 100%; accent-color: var(--music-accent); }
  .volume-control { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 8px; color: var(--music-muted); font-size: 13px; }
  .volume-slider { width: 28px; height: 72px; writing-mode: vertical-lr; direction: rtl; }

  /* Queue */
  .queue { min-width: 0; }
  .queue-list { max-height: 112px; overflow-y: auto; }
  .queue-row { display: flex; align-items: center; gap: 8px; min-height: 34px; padding: 3px 0 3px 8px; border-bottom: 1px solid var(--music-line); }
  .queue-row.current { border-left: 2px solid var(--music-accent); background: rgb(101 214 199 / 8%); color: var(--music-accent); font-weight: 600; }
  .queue-row .media-copy { flex: 1; }
  .queue-action { min-width: 0; min-height: 30px; padding: 4px 8px; color: var(--music-muted); font-size: 12px; }
  .queue-header-actions { display: flex; gap: 6px; }
  .queue-header-actions .queue-action { min-width: var(--music-touch-target); min-height: var(--music-touch-target); }
  .queue-header-actions .queue-action.active { border-color: var(--music-accent); color: var(--music-accent); }
  .row-actions { display: flex; gap: 4px; margin-left: auto; }
  .row-action { min-width: 30px; min-height: 30px; padding: 4px; }

  /* Speakers & playlists */
  .speaker-sheet { margin-top: 12px; padding: 12px; border-top: 1px solid var(--music-line); background: var(--music-raised); }
  .speaker-list { display: grid; gap: 4px; margin-top: 8px; }
  .speaker-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 7px; border: 1px solid var(--music-line); border-radius: 6px; background: var(--music-surface); color: inherit; text-align: left; }
  .speaker-row.selected { border-color: var(--music-accent); }
  .playlist-sheet { margin-top: 12px; padding: 12px; border-top: 1px solid var(--music-line); background: var(--music-raised); }
  .playlist-list { display: grid; gap: 4px; max-height: 180px; overflow-y: auto; margin-top: 8px; }
  .playlist-create { display: flex; gap: 6px; margin-top: 8px; }
  .playlist-create input { min-width: 0; flex: 1; border: 1px solid var(--music-line); border-radius: 6px; background: var(--music-surface); color: inherit; padding: 7px; font: inherit; }

  /* Shared interaction states & icons */
  .control:active, .queue-action:active { transform: scale(.96); }
  ha-icon { display: block; --mdc-icon-size: 20px; }
  .thumb ha-icon { --mdc-icon-size: 22px; }
  .back-button ha-icon { --mdc-icon-size: 18px; }

  /* Media queries */
  @media (prefers-reduced-motion: reduce) { .media-row, .back-button, .control, .queue-action { transition: none; } }
  @media (max-width: 680px) { .search-layout, .playback { grid-template-columns: 1fr; } .playback { gap: 12px; } .top-menu { grid-template-columns: minmax(0, 1fr) auto; gap: 6px; } .flyout { width: min(100%, 440px); } }
`;
