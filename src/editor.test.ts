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
    editor.setConfig({ type: 'custom:music-assistant-card', player: 'media_player.living_room' });
    editor.hass = createHass();

    expect(editor.querySelector('ha-entity-picker')).toBeTruthy();
    expect(editor.querySelector('#players')).toBeTruthy();
    expect(editor.querySelector('ha-select')).toBeTruthy();
    expect(editor.querySelectorAll('ha-list-item')).toHaveLength(4);
    expect(editor.querySelector('ha-switch')).toBeTruthy();
    expect(editor.querySelector('select')).toBeNull();
    expect((editor.querySelector('#player') as HTMLElement & { includeDomains?: string[] }).includeDomains).toEqual(['media_player']);
    expect((editor.querySelector('ha-entity-picker') as HTMLElement & { hass?: HomeAssistant }).hass).toBeTruthy();
  });

  it('emits normalized config changes from platform control events', () => {
    const editor = new MusicAssistantCardEditor();
    editor.setConfig({ type: 'custom:music-assistant-card', player: 'media_player.living_room' });
    const changes: CustomEvent[] = [];
    editor.addEventListener('config-changed', (event) => changes.push(event as CustomEvent));

    const queueSwitch = editor.querySelector('#show-queue') as HTMLElement & { checked?: boolean };
    queueSwitch.checked = false;
    queueSwitch.dispatchEvent(new Event('change', { bubbles: true }));

    expect(changes).toHaveLength(1);
    expect(changes[0].detail.config.show_queue).toBe(false);
    expect(changes[0].detail.config).not.toHaveProperty('ingress_path');
  });

  it('persists the selected click action from ha-select', () => {
    const editor = new MusicAssistantCardEditor();
    editor.setConfig({ type: 'custom:music-assistant-card', player: 'media_player.living_room' });
    const changes: CustomEvent[] = [];
    editor.addEventListener('config-changed', (event) => changes.push(event as CustomEvent));

    const action = editor.querySelector('#action') as HTMLElement & { value?: string };
    action.value = 'queue';
    action.dispatchEvent(new Event('selected', { bubbles: true }));

    expect(changes).toHaveLength(1);
    expect(changes[0].detail.config.click_action).toBe('queue');
  });

  it('persists the click action when Home Assistant emits only an option click', () => {
    const editor = new MusicAssistantCardEditor();
    editor.setConfig({ type: 'custom:music-assistant-card', player: 'media_player.living_room' });
    const changes: CustomEvent[] = [];
    editor.addEventListener('config-changed', (event) => changes.push(event as CustomEvent));

    const option = editor.querySelector('ha-list-item[value="queue"]') as HTMLElement;
    option.dispatchEvent(new Event('click', { bubbles: true, composed: true }));

    expect(changes).toHaveLength(1);
    expect(changes[0].detail.config.click_action).toBe('queue');
  });

  it('defaults the player to blank and selection action to play now', () => {
    const editor = new MusicAssistantCardEditor();
    editor.setConfig({ type: 'custom:music-assistant-card', player: '' });

    expect((editor.querySelector('#player') as HTMLElement & { value?: string }).value).toBe('');
    expect((editor.querySelector('#action') as HTMLElement & { value?: string }).value).toBe('play');
    expect((editor.querySelector('#player-list') as HTMLElement & { value?: string }).value).toBe('all');
  });

  it('persists the selected player visibility mode', () => {
    const editor = new MusicAssistantCardEditor();
    editor.setConfig({ type: 'custom:music-assistant-card', player: '' });
    const changes: CustomEvent[] = [];
    editor.addEventListener('config-changed', (event) => changes.push(event as CustomEvent));

    const playerList = editor.querySelector('#player-list') as HTMLElement & { value?: string };
    playerList.value = 'selected';
    playerList.dispatchEvent(new Event('selected', { bubbles: true }));

    expect(changes).toHaveLength(1);
    expect(changes[0].detail.config.player_list).toBe('selected');
  });
});
