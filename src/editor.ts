import type { MusicAssistantCardConfig } from './home-assistant';

const EDITOR_TAG = 'music-assistant-card-editor';

export class MusicAssistantCardEditor extends HTMLElement {
  private _hass?: { states: Record<string, { entity_id: string; attributes: Record<string, unknown> }> };
  private config: MusicAssistantCardConfig = {
    type: 'custom:music-assistant-card', player: 'media_player.living_room', config_entry_id: '',
    layout: 'two-column', show_search: true, show_queue: true, click_action: 'play',
  };

  setConfig(config: MusicAssistantCardConfig): void {
    this.config = { ...this.config, ...config };
    this.render();
  }

  set hass(hass: { states: Record<string, { entity_id: string; attributes: Record<string, unknown> }> }) {
    this._hass = hass;
    this.render();
  }

  private render(): void {
    const players = Object.values(this._hass?.states ?? {})
      .filter((state) => state.entity_id.startsWith('media_player.'))
      .sort((left, right) => left.entity_id.localeCompare(right.entity_id));
    const configuredPlayerAvailable = players.some((state) => state.entity_id === this.config.player);
    const playerOptions = [
      ...(!configuredPlayerAvailable && this.config.player ? [{ entity_id: this.config.player, name: 'Configured entity' }] : []),
      ...players.map((state) => ({ entity_id: state.entity_id, name: String(state.attributes.friendly_name ?? state.entity_id) })),
    ];
    this.innerHTML = `
      <style>
        :host { display: block; color: var(--primary-text-color, #202526); font-family: var(--paper-font-body1_-_font-family, sans-serif); }
        .editor { display: grid; gap: 16px; padding: 4px 0; }
        .field { display: grid; gap: 6px; }
        label, legend { color: var(--primary-text-color, #202526); font-size: 14px; font-weight: 600; }
        input, select { width: 100%; min-height: 40px; box-sizing: border-box; padding: 8px 10px; border: 1px solid var(--divider-color, #c7cdce); border-radius: 6px; background: var(--card-background-color, #fff); color: inherit; font: inherit; }
        input:focus, select:focus { border-color: var(--primary-color, #1976d2); outline: 2px solid color-mix(in srgb, var(--primary-color, #1976d2) 25%, transparent); }
        fieldset { display: grid; gap: 10px; padding: 0; border: 0; }
        .check { display: flex; align-items: center; gap: 9px; font-weight: 400; }
        .check input { width: 18px; min-height: 18px; accent-color: var(--primary-color, #1976d2); }
        .hint { margin: -2px 0 0; color: var(--secondary-text-color, #667174); font-size: 12px; line-height: 1.4; }
      </style>
      <form class="editor" aria-label="Music Assistant card settings">
        <div class="field"><label for="player">Player entity</label><select id="player" name="player" required>${playerOptions.length === 0 ? `<option value="${escapeHtml(this.config.player)}">${escapeHtml(this.config.player)} (enter in YAML)</option>` : playerOptions.map((player) => `<option value="${escapeHtml(player.entity_id)}" ${player.entity_id === this.config.player ? 'selected' : ''}>${escapeHtml(player.name)} · ${escapeHtml(player.entity_id)}</option>`).join('')}</select><p class="hint">Choose a Music Assistant player or synchronized group from Home Assistant.</p></div>
        <div class="field"><label for="entry">Music Assistant config entry ID</label><input id="entry" name="config_entry_id" value="${escapeHtml(this.config.config_entry_id)}" placeholder="01JEXNDHT21V0BHJXM7A5SZANV" required><p class="hint">Used for authenticated Music Assistant search requests.</p></div>
        <div class="field"><label for="action">When a song is selected</label><select id="action" name="click_action"><option value="play" ${this.config.click_action === 'play' ? 'selected' : ''}>Play now</option><option value="queue" ${this.config.click_action === 'queue' ? 'selected' : ''}>Add to queue</option></select></div>
        <fieldset><legend>Show in card</legend><label class="check"><input type="checkbox" name="show_search" ${this.config.show_search !== false ? 'checked' : ''}> Global search</label><label class="check"><input type="checkbox" name="show_queue" ${this.config.show_queue !== false ? 'checked' : ''}> Playback queue</label></fieldset>
      </form>`;
    this.querySelector('form')?.addEventListener('input', (event) => this.updateConfig(event));
    this.querySelector('form')?.addEventListener('change', (event) => this.updateConfig(event));
  }

  private updateConfig(event: Event): void {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    if (!target.name) return;
    const value = target instanceof HTMLInputElement && target.type === 'checkbox' ? target.checked : target.value;
    this.config = { ...this.config, [target.name]: value } as MusicAssistantCardConfig;
    this.dispatchEvent(new CustomEvent('config-changed', { bubbles: true, composed: true, detail: { config: this.config } }));
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character);
}

if (!customElements.get(EDITOR_TAG)) customElements.define(EDITOR_TAG, MusicAssistantCardEditor);