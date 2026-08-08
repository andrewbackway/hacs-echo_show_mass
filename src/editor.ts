import type { HomeAssistant, MusicAssistantCardConfig } from './home-assistant';
import { DEFAULT_MUSIC_ASSISTANT_INGRESS_PATH } from './music-assistant/ingress';

const EDITOR_TAG = 'music-assistant-card-editor';

type HassControl = HTMLElement & {
  hass?: HomeAssistant;
  value?: string;
  checked?: boolean;
  includeDomains?: string[];
  label?: string;
};

export class MusicAssistantCardEditor extends HTMLElement {
  private _hass?: HomeAssistant;
  private config: MusicAssistantCardConfig = {
    type: 'custom:music-assistant-card',
    player: '',
    ingress_path: DEFAULT_MUSIC_ASSISTANT_INGRESS_PATH,
    layout: 'two-column',
    show_search: true,
    show_queue: true,
    click_action: 'play',
  };

  setConfig(config: MusicAssistantCardConfig): void {
    const nextConfig = { ...this.config, ...config };
    if (typeof nextConfig.config_entry_id !== 'string' || !nextConfig.config_entry_id.trim()) delete nextConfig.config_entry_id;
    if (typeof nextConfig.ingress_path !== 'string') nextConfig.ingress_path = DEFAULT_MUSIC_ASSISTANT_INGRESS_PATH;
    this.config = nextConfig;
    this.render();
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    this.render();
  }

  private render(): void {
    this.innerHTML = `
      <style>
        :host { display: block; color: var(--primary-text-color); }
        .editor { display: grid; gap: 16px; padding: 4px 0; }
        .field { display: grid; gap: 6px; }
        .hint { margin: -2px 0 0; color: var(--secondary-text-color); font-size: 12px; line-height: 1.4; }
        ha-entity-picker, ha-textfield, ha-select { display: block; width: 100%; }
        .switches { display: grid; gap: 4px; }
        ha-switch { --mdc-typography-body1-font-size: 14px; }
      </style>
      <form class="editor" aria-label="Music Assistant card settings">
        <div class="field">
          <ha-entity-picker id="player" label="Player entity"></ha-entity-picker>
          <p class="hint">Choose a Music Assistant player or synchronized group from Home Assistant.</p>
        </div>
        <div class="field">
          <ha-textfield id="ingress-path" label="Music Assistant ingress path"></ha-textfield>
          <p class="hint">Use the configured path, or leave blank to discover the installed add-on automatically.</p>
        </div>
        <div class="field">
          <ha-select id="action" label="When a song is selected">
            <ha-list-item value="play">Play now</ha-list-item>
            <ha-list-item value="queue">Add to queue</ha-list-item>
          </ha-select>
        </div>
        <div class="switches" aria-label="Show in card">
          <ha-switch id="show-search">Global search</ha-switch>
          <ha-switch id="show-queue">Playback queue</ha-switch>
        </div>
      </form>`;

    const player = this.getControl('player');
    player.hass = this._hass;
    player.value = this.config.player;
    player.includeDomains = ['media_player'];
    player.label = 'Player entity';
    this.listenValue(player, 'player');

    const ingressPath = this.getControl('ingress-path');
    ingressPath.value = this.config.ingress_path ?? DEFAULT_MUSIC_ASSISTANT_INGRESS_PATH;
    ingressPath.label = 'Music Assistant ingress path';
    this.listenValue(ingressPath, 'ingress_path');

    const action = this.getControl('action');
    action.value = this.config.click_action ?? 'play';
    this.listenValue(action, 'click_action');

    const showSearch = this.getControl('show-search');
    showSearch.checked = this.config.show_search !== false;
    this.listenChecked(showSearch, 'show_search');

    const showQueue = this.getControl('show-queue');
    showQueue.checked = this.config.show_queue !== false;
    this.listenChecked(showQueue, 'show_queue');
  }

  private getControl(id: string): HassControl {
    return this.querySelector<HassControl>(`#${id}`) as HassControl;
  }

  private listenValue(control: HassControl, name: keyof MusicAssistantCardConfig): void {
    const updateValue = (event: Event): void => {
      const detailValue = (event as CustomEvent<{ value?: string }>).detail?.value;
      const value = typeof detailValue === 'string' ? detailValue : (event.currentTarget as HassControl).value;
      if (typeof value === 'string') this.updateConfig(name, value);
    };
    control.addEventListener('value-changed', updateValue);
    control.addEventListener('selected', updateValue);
  }

  private listenChecked(control: HassControl, name: keyof MusicAssistantCardConfig): void {
    control.addEventListener('change', () => this.updateConfig(name, Boolean(control.checked)));
  }

  private updateConfig(name: keyof MusicAssistantCardConfig, value: string | boolean): void {
    this.config = { ...this.config, [name]: value } as MusicAssistantCardConfig;
    this.dispatchEvent(new CustomEvent('config-changed', { bubbles: true, composed: true, detail: { config: this.config } }));
  }
}

if (!customElements.get(EDITOR_TAG)) customElements.define(EDITOR_TAG, MusicAssistantCardEditor);
