import type { MusicAssistantAuthTransport } from './auth';
import type { MusicAssistantTransport } from './api';

export type MusicAssistantCommandTransport = MusicAssistantTransport & MusicAssistantAuthTransport;

let messageSequence = 0;

export function createMusicAssistantHttpTransport(baseUrl: string, token?: string): MusicAssistantCommandTransport {
  const apiUrl = `${baseUrl.replace(/\/$/, '')}/api`;

  return {
    async command<T>(command: string, args: Record<string, unknown> = {}): Promise<T> {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message_id: `music-assistant-card-${Date.now()}-${messageSequence++}`,
          command,
          args,
        }),
      });

      const payload = await response.json() as { error?: string; value?: T } & T;
      if (!response.ok || payload.error) throw new Error(payload.error ?? `Music Assistant request failed (${response.status}).`);
      return payload.value === undefined ? payload : payload.value;
    },
  };
}