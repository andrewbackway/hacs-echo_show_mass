import type { HomeAssistant } from '../home-assistant';

interface MusicAssistantAddonOverview {
  name?: unknown;
  slug?: unknown;
  description?: unknown;
  repository?: unknown;
}

interface AddonListResponse {
  addons?: unknown;
}

const MUSIC_ASSISTANT_NAME = 'music assistant';

function addonList(response: unknown): MusicAssistantAddonOverview[] {
  const candidates = Array.isArray(response) ? response : (response as AddonListResponse | null)?.addons;
  return Array.isArray(candidates) ? candidates.filter(isRecord) as MusicAssistantAddonOverview[] : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizedText(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function isMusicAssistantAddon(addon: MusicAssistantAddonOverview): boolean {
  return normalizedText(addon.name) === MUSIC_ASSISTANT_NAME;
}

function normalizeIngressPath(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const path = value.trim();
  if (!path.startsWith('/') || path.startsWith('//')) return undefined;
  const rawSegments = path.split(/[\\/]/);
  if (rawSegments.includes('..') || rawSegments.includes('.')) return undefined;

  let parsed: URL;
  try {
    parsed = new URL(path, 'http://home-assistant.invalid');
  } catch {
    return undefined;
  }

  if (parsed.origin !== 'http://home-assistant.invalid' || parsed.search || parsed.hash) return undefined;
  const segments = parsed.pathname.split('/');
  if (segments.includes('..') || segments.includes('.')) return undefined;
  return parsed.pathname.replace(/\/+$/, '') || '/';
}

export async function resolveMusicAssistantIngress(hass: HomeAssistant): Promise<string> {
  if (!hass.callWS) throw new Error('Music Assistant add-on discovery is unavailable in this Home Assistant session.');

  let response: unknown;
  try {
    response = await hass.callWS({ type: 'supervisor/api', endpoint: '/addons', method: 'get' });
  } catch {
    throw new Error('Music Assistant add-on discovery was denied by Home Assistant.');
  }

  const candidates = addonList(response).filter(isMusicAssistantAddon);
  if (candidates.length === 0) throw new Error('Music Assistant add-on ingress is unavailable.');

  const validIngresses: string[] = [];
  for (const candidate of candidates) {
    const slug = typeof candidate.slug === 'string' ? candidate.slug.trim() : '';
    if (!slug) continue;

    let info: unknown;
    try {
      info = await hass.callWS({ type: 'supervisor/api', endpoint: `/addons/${encodeURIComponent(slug)}/info`, method: 'get' });
    } catch {
      continue;
    }

    if (!isRecord(info) || info.state !== 'started' || info.ingress !== true) continue;
    const ingressPath = normalizeIngressPath(info.ingress_url);
    if (ingressPath) validIngresses.push(ingressPath);
  }

  const uniqueIngresses = [...new Set(validIngresses)];
  if (uniqueIngresses.length > 1) throw new Error('Multiple Music Assistant add-ons with usable ingress were found.');
  if (uniqueIngresses.length === 0) throw new Error('Music Assistant add-on ingress is unavailable.');
  return uniqueIngresses[0];
}

export function normalizeMusicAssistantIngressPath(value: unknown): string | undefined {
  return normalizeIngressPath(value);
}
