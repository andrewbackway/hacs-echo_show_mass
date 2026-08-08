export interface HomeAssistant {
  callWS?<T>(message: Record<string, unknown>): Promise<T>;
  callService: <T = unknown>(
    domain: string,
    service: string,
    serviceData?: Record<string, unknown>,
    target?: Record<string, unknown>,
    notifyOnError?: boolean,
    returnResponse?: boolean,
  ) => Promise<{ response?: T }>;
  states: Record<string, HassEntity>;
  locale?: {
    language?: string;
  };
}

export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
}

export interface LovelaceCardConfig {
  type: string;
  [key: string]: unknown;
}

export interface MusicAssistantCardConfig extends LovelaceCardConfig {
  player: string;
  config_entry_id?: string;
  layout?: 'two-column';
  show_search?: boolean;
  show_queue?: boolean;
  click_action?: 'play' | 'queue';
}

export interface LovelaceCard {
  setConfig(config: LovelaceCardConfig): void;
  set hass(hass: HomeAssistant);
  getCardSize(): number;
}
