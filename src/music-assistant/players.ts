import type { HassEntity } from '../home-assistant';
import type { MusicAssistantPlayer } from './api';

export function resolveMusicAssistantPlayer(
  players: MusicAssistantPlayer[],
  entityId: string,
  entity?: HassEntity,
): MusicAssistantPlayer | undefined {
  const attributes = entity?.attributes ?? {};
  const explicitId = [attributes.music_assistant_player_id, attributes.mass_player_id, attributes.player_id]
    .find((value): value is string => typeof value === 'string' && value.length > 0);
  if (explicitId) return players.find((player) => player.player_id === explicitId);

  const exact = players.find((player) => player.player_id === entityId);
  if (exact) return exact;

  const friendlyName = typeof attributes.friendly_name === 'string' ? normalizeName(attributes.friendly_name) : '';
  if (!friendlyName) return undefined;
  const matches = players.filter((player) => normalizeName(player.name) === friendlyName);
  return matches.length === 1 ? matches[0] : undefined;
}

function normalizeName(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function getEligibleMusicAssistantPlayers(players: MusicAssistantPlayer[]): MusicAssistantPlayer[] {
  return players.filter((player) => player.available !== false && player.enabled !== false && player.hide_in_ui !== true);
}

export function sortMusicAssistantPlayers(players: MusicAssistantPlayer[], activePlayerId?: string): MusicAssistantPlayer[] {
  const activePlayer = players.find((player) => player.player_id === activePlayerId);
  const activeGroup = new Set([
    ...(activePlayer?.group_members ?? []),
    ...(activePlayer?.synced_to ? [activePlayer.synced_to] : []),
    ...(activePlayer ? [activePlayer.player_id] : []),
  ]);
  return [...players].sort((left, right) => {
    const leftActive = activeGroup.has(left.player_id) ? 0 : 1;
    const rightActive = activeGroup.has(right.player_id) ? 0 : 1;
    if (leftActive !== rightActive) return leftActive - rightActive;
    return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
  });
}