import type { MusicAssistantTransport } from './api';

export type MusicAssistantCommandTransport = MusicAssistantTransport;

let messageSequence = 0;

export function createMusicAssistantHttpTransport(ingressPath: string): MusicAssistantCommandTransport {
  const apiUrl = `${ingressPath.replace(/\/$/, '')}/api`;

  return {
    async command<T>(command: string, args: Record<string, unknown> = {}): Promise<T> {
      const response = await fetch(apiUrl, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
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