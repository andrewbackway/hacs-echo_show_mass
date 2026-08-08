import { describe, expect, it, vi } from 'vitest';
import type { HomeAssistant } from '../home-assistant';
import { normalizeMusicAssistantIngressPath, resolveMusicAssistantIngress } from './ingress';

function createHass(callWS: HomeAssistant['callWS']): HomeAssistant {
  return {
    states: {},
    callService: async () => ({}),
    callWS,
  };
}

describe('Music Assistant ingress discovery', () => {
  it('discovers a started Music Assistant add-on and returns its normalized path', async () => {
    const callWS = vi.fn()
      .mockResolvedValueOnce({ addons: [{ name: 'Music Assistant', slug: 'verified-ma' }] })
      .mockResolvedValueOnce({ name: 'Music Assistant', slug: 'verified-ma', state: 'started', ingress: true, ingress_url: '/api/hassio_ingress/secret/' });

    await expect(resolveMusicAssistantIngress(createHass(callWS))).resolves.toBe('/api/hassio_ingress/secret');
    expect(callWS).toHaveBeenNthCalledWith(1, { type: 'supervisor/api', endpoint: '/addons', method: 'get' });
    expect(callWS).toHaveBeenNthCalledWith(2, { type: 'supervisor/api', endpoint: '/addons/verified-ma/info', method: 'get' });
  });

  it('accepts the direct add-on array response envelope', async () => {
    const callWS = vi.fn()
      .mockResolvedValueOnce([{ name: 'Music Assistant', slug: 'ma' }])
      .mockResolvedValueOnce({ state: 'started', ingress: true, ingress_url: '/ingress/ma' });

    await expect(resolveMusicAssistantIngress(createHass(callWS))).resolves.toBe('/ingress/ma');
  });

  it.each([
    ['absolute URL', 'https://ma.example/ingress'],
    ['protocol-relative URL', '//ma.example/ingress'],
    ['query string', '/ingress/ma?token=secret'],
    ['fragment', '/ingress/ma#route'],
    ['path traversal', '/ingress/../ma'],
  ])('rejects an invalid %s', (_label, value) => {
    expect(normalizeMusicAssistantIngressPath(value)).toBeUndefined();
  });

  it('rejects a missing add-on, disabled ingress, and stopped add-on', async () => {
    const missing = vi.fn().mockResolvedValue({ addons: [{ name: 'Other Add-on', slug: 'other' }] });
    await expect(resolveMusicAssistantIngress(createHass(missing))).rejects.toThrow('ingress is unavailable');

    const unusable = vi.fn()
      .mockResolvedValueOnce({ addons: [{ name: 'Music Assistant', slug: 'ma' }] })
      .mockResolvedValueOnce({ state: 'stopped', ingress: false, ingress_url: '/ingress/ma' });
    await expect(resolveMusicAssistantIngress(createHass(unusable))).rejects.toThrow('ingress is unavailable');
  });

  it('rejects ambiguous usable add-ons instead of choosing array order', async () => {
    const callWS = vi.fn()
      .mockResolvedValueOnce({ addons: [{ name: 'Music Assistant', slug: 'ma-one' }, { name: 'Music Assistant', slug: 'ma-two' }] })
      .mockResolvedValueOnce({ state: 'started', ingress: true, ingress_url: '/ingress/one' })
      .mockResolvedValueOnce({ state: 'started', ingress: true, ingress_url: '/ingress/two' });

    await expect(resolveMusicAssistantIngress(createHass(callWS))).rejects.toThrow('Multiple Music Assistant');
  });

  it('reports unavailable discovery when Supervisor access is denied or absent', async () => {
    await expect(resolveMusicAssistantIngress({ states: {}, callService: async () => ({}) })).rejects.toThrow('discovery is unavailable');
    const denied = vi.fn().mockRejectedValue(new Error('not permitted'));
    await expect(resolveMusicAssistantIngress(createHass(denied))).rejects.toThrow('discovery was denied');
  });
});
