import { html, nothing, type TemplateResult } from 'lit-html';
import { repeat } from 'lit-html/directives/repeat.js';
import type { HassEntity } from '../../home-assistant';
import type { SpeakerState } from '../card.types';

function playerName(player: HassEntity): string {
  const name = player.attributes.friendly_name;
  return typeof name === 'string' && name.trim() ? name.trim() : player.entity_id;
}

function playerIcon(player: HassEntity): string {
  const icon = player.attributes.icon;
  return typeof icon === 'string' && icon.trim() ? icon.trim() : 'mdi:speaker';
}

function supportsGrouping(player: HassEntity): boolean {
  const features = player.attributes.supported_features;
  return typeof features === 'number'
    ? (features & 512) !== 0
    : Array.isArray(features) && features.includes('grouping');
}

export function renderSpeakerSheet(
  speakerState: SpeakerState,
  currentId: string | undefined,
): TemplateResult | typeof nothing {
  if (!speakerState.players && !speakerState.loading && !speakerState.error) return nothing;
  if (speakerState.loading)
    return html`<section class="speaker-sheet" aria-label="Speakers">
      <p class="state">Loading speakers...</p>
    </section>`;
  if (speakerState.error)
    return html`<section class="speaker-sheet" aria-label="Speakers">
      <p class="state error">${speakerState.error}</p>
    </section>`;
  const selectedIds = new Set(speakerState.selectedPlayerIds ?? (currentId ? [currentId] : []));
  const players = (speakerState.players ?? []).sort((left, right) =>
    playerName(left).localeCompare(playerName(right), undefined, { sensitivity: 'base' }),
  );
  return html`<section class="speaker-sheet" aria-label="Players">
    <div class="speaker-list">
      ${repeat(
        players,
        (player) => player.entity_id,
        (player) => {
        const selected = selectedIds.has(player.entity_id);
        return html`<div class="speaker-row${selected ? ' selected' : ''}">
          <button
            class="control speaker-select"
            data-speaker-id="${player.entity_id}"
            type="button"
            aria-pressed="${selected}"
          >
            <span class="speaker-icon" aria-hidden="true"><ha-icon icon="${playerIcon(player)}"></ha-icon></span
            ><span class="media-copy"
              ><span class="media-title">${playerName(player)}</span
              ><span class="media-meta"
                >${player.entity_id === currentId ? 'Current player' : selected ? 'Selected' : 'Available'}</span
              ></span
            ></button
          >${
            player.entity_id !== currentId && supportsGrouping(player)
              ? html`<span class="row-actions"
                  ><button
                    class="control row-action"
                    data-speaker-action="transfer"
                    data-speaker-target="${player.entity_id}"
                    type="button"
                    aria-label="Transfer playback"
                    title="Transfer playback"
                  >
                    <ha-icon icon="mdi:transfer"></ha-icon></button
                ></span>`
              : nothing
          }
        </div>`;
        },
      )}
    </div>
    <div class="speaker-actions">
      <span class="panel-copy">Select players for playback</span
      ><button class="control primary" data-speaker-action="apply" type="button">Apply</button>
    </div>
  </section>`;
}
