// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import type { HomeAssistant } from './home-assistant';
import { MusicAssistantCardEditor } from './editor';

function createHass(): HomeAssistant {
  return {
    states: {
      'media_player.living_room': {
        entity_id: 'media_player.living_room',
        state: 'paused',
        attributes: { friendly_name: 'Living room' },
      },
      'light.living_room': {
        entity_id: 'light.living_room',
        state: 'on',
        attributes: { friendly_name: 'Living room lights' },
      },
    },
    callService: async () => ({}),
  };
}

describe('MusicAssistantCardEditor', () => {
  it('uses Home Assistant controls and configures the entity picker', () => {
    const editor = new MusicAssistantCardEditor();
    editor.setConfig({ type: 'custom:music-assistant-card', player: 'media_player.living_room', config_entry_id: '' });
    editor.hass = createHass();

    expect(editor.querySelector('ha-entity-picker')).toBeTruthy();
    expect(editor.querySelector('ha-select')).toBeTruthy();
    expect(editor.querySelector('ha-switch')).toBeTruthy();
    expect(editor.querySelector('select')).toBeNull();
    expect((editor.querySelector('ha-entity-picker') as HTMLElement & { includeDomains?: string[] }).includeDomains).toEqual(['media_player']);
    expect((editor.querySelector('ha-entity-picker') as HTMLElement & { hass?: HomeAssistant }).hass).toBeTruthy();
  });

  it('emits normalized config changes from platform control events', () => {
    const editor = new MusicAssistantCardEditor();
    editor.setConfig({ type: 'custom:music-assistant-card', player: 'media_player.living_room', config_entry_id: '' });
    const changes: CustomEvent[] = [];
    editor.addEventListener('config-changed', (event) => changes.push(event as CustomEvent));

    const queueSwitch = editor.querySelector('#show-queue') as HTMLElement & { checked?: boolean };
    queueSwitch.checked = false;
    queueSwitch.dispatchEvent(new Event('change', { bubbles: true }));

    expect(changes).toHaveLength(1);
    expect(changes[0].detail.config.show_queue).toBe(false);
  });
});
