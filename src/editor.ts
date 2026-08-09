import type { HomeAssistant, MusicAssistantCardConfig } from './home-assistant';

const EDITOR_TAG = 'music-assistant-card-editor';

type HassControl = HTMLElement & {
  hass?: HomeAssistant;
  value?: string | string[];
  checked?: boolean;
  includeDomains?: string[];
  multiple?: boolean;
  label?: string;
  type?: string;
};

export class MusicAssistantCardEditor extends HTMLElement {
  private _hass?: HomeAssistant;
  private config: MusicAssistantCardConfig = {
    type: 'custom:music-assistant-card',
    player: '',
    music_assistant_config_entry_id: '',
    players: [],
    layout: 'two-column',
    show_search: true,
    show_queue: true,
    click_action: 'play',
  };

  setConfig(config: MusicAssistantCardConfig): void {
    const nextConfig = { ...this.config, ...config };
    if (!Array.isArray(nextConfig.players)) nextConfig.players = [];
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
        ha-entity-picker, ha-input, ha-textfield, ha-select { display: block; width: 100%; }
        .switches { display: grid; gap: 4px; }
        ha-switch { --mdc-typography-body1-font-size: 14px; }
      </style>
      <form class="editor" aria-label="Music Assistant card settings">
        <div class="field">
          <ha-entity-picker id="player" label="Player entity"></ha-entity-picker>
          <p class="hint">Choose a Music Assistant player or synchronized group from Home Assistant.</p>
        </div>
        <div class="field">
          <ha-textfield id="config-entry-id" label="Music Assistant config entry ID"></ha-textfield>
          <p class="hint">Required for Favorites and category library loading. Find it in the Music Assistant integration entry.</p>
        </div>
        <div class="field">
          <ha-entity-picker id="players" label="Permitted Players"></ha-entity-picker>
          <p class="hint">Optional. Leave blank to permit all players. The primary player is always included.</p>
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

    const configEntryId = this.getControl('config-entry-id');
    configEntryId.value = this.config.music_assistant_config_entry_id ?? '';
    configEntryId.label = 'Music Assistant config entry ID';
    this.listenValue(configEntryId, 'music_assistant_config_entry_id');

    const players = this.getControl('players');
    players.hass = this._hass;
    players.value = this.config.players ?? [];
    players.includeDomains = ['media_player'];
    players.multiple = true;
    players.label = 'Permitted Players';
    this.listenValue(players, 'players');

    const action = this.getControl('action');
    action.value = this.config.click_action ?? 'play';
    this.listenSelect(action, 'click_action');

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
      const value = getEventValue<string | string[]>(event) ?? (event.currentTarget as HassControl).value;
      if (name === 'players') {
        this.updateConfig(name, Array.isArray(value) ? value : value ? [value] : []);
      } else if (typeof value === 'string' || Array.isArray(value)) {
        this.updateConfig(name, value);
      }
    };
    control.addEventListener('value-changed', updateValue);
    control.addEventListener('selected', updateValue);
  }

  private listenSelect(control: HassControl, name: keyof MusicAssistantCardConfig): void {
    let lastValue = control.value;
    const applyValue = (value: unknown): void => {
      if (typeof value !== 'string' || value === lastValue) return;
      lastValue = value;
      this.updateConfig(name, value);
    };
    const updateValue = (event: Event): void => {
      const detailValue = getEventValue<string>(event);
      applyValue(typeof detailValue === 'string' ? detailValue : (event.currentTarget as HassControl).value);
    };
    control.addEventListener('value-changed', updateValue);
    control.addEventListener('selected', updateValue);
    control.querySelectorAll<HTMLElement>('[value]').forEach((option) => {
      option.addEventListener('click', () => applyValue(option.getAttribute('value')));
    });
  }

  private listenChecked(control: HassControl, name: keyof MusicAssistantCardConfig): void {
    control.addEventListener('change', () => this.updateConfig(name, Boolean(control.checked)));
  }

  private updateConfig(name: keyof MusicAssistantCardConfig, value: string | string[] | boolean): void {
    this.config = { ...this.config, [name]: value } as MusicAssistantCardConfig;
    this.dispatchEvent(
      new CustomEvent('config-changed', { bubbles: true, composed: true, detail: { config: this.config } }),
    );
  }
}

if (!customElements.get(EDITOR_TAG)) customElements.define(EDITOR_TAG, MusicAssistantCardEditor);

function getEventValue<T>(event: Event): T | undefined {
  return (event as CustomEvent<{ value?: T }>).detail?.value;
}
