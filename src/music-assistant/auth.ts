export interface MusicAssistantAuthTransport {
  command<T>(command: string, args?: Record<string, unknown>): Promise<T>;
}

export interface MusicAssistantAuthProvider {
  provider_id: string;
  provider_type?: string;
  requires_redirect?: boolean;
}

export interface MusicAssistantOAuthStart {
  providerId: string;
  authorizationUrl: string;
}

export interface MusicAssistantOAuthCallback {
  token?: string;
  error?: string;
  cleanUrl: string;
}

function selectHomeAssistantProvider(providers: MusicAssistantAuthProvider[]): MusicAssistantAuthProvider {
  const provider = providers.find((candidate) => candidate.provider_type === 'homeassistant' && candidate.requires_redirect)
    ?? providers.find((candidate) => candidate.provider_id === 'homeassistant' && candidate.requires_redirect);

  if (!provider) {
    throw new Error('Music Assistant Home Assistant OAuth provider is unavailable');
  }

  return provider;
}

export async function beginMusicAssistantHomeAssistantOAuth(
  transport: MusicAssistantAuthTransport,
  returnUrl?: string,
): Promise<MusicAssistantOAuthStart> {
  const providers = await transport.command<MusicAssistantAuthProvider[]>('auth/providers', {});
  const provider = selectHomeAssistantProvider(providers);
  const response = await transport.command<{ authorization_url?: string }>('auth/authorization_url', {
    provider_id: provider.provider_id,
    ...(returnUrl ? { return_url: returnUrl } : {}),
  });

  if (!response.authorization_url) {
    throw new Error('Music Assistant did not return a Home Assistant OAuth URL');
  }

  return {
    providerId: provider.provider_id,
    authorizationUrl: response.authorization_url,
  };
}

export function parseMusicAssistantOAuthCallback(url: string): MusicAssistantOAuthCallback {
  const callbackUrl = new URL(url);
  const token = callbackUrl.searchParams.get('code') ?? undefined;
  const error = callbackUrl.searchParams.get('error') ?? undefined;

  callbackUrl.searchParams.delete('code');
  callbackUrl.searchParams.delete('state');
  callbackUrl.searchParams.delete('error');
  callbackUrl.searchParams.delete('error_description');

  return {
    ...(token ? { token } : {}),
    ...(error ? { error } : {}),
    cleanUrl: callbackUrl.toString(),
  };
}