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

      const body = await response.text();
      let payload: unknown = body;
      try {
        payload = body ? JSON.parse(body) : undefined;
      } catch {
      }

      const record = payload !== null && typeof payload === 'object'
        ? payload as { error?: unknown; value?: T }
        : undefined;
      const errorMessage = typeof record?.error === 'string'
        ? record.error
        : typeof payload === 'string' && payload.trim()
          ? payload.trim()
          : `Music Assistant request failed (${response.status}).`;
      if (!response.ok || record?.error) throw new Error(errorMessage);
      return record && 'value' in record ? record.value as T : payload as T;
    },
  };
}