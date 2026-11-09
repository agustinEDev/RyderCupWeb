import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Batería del Kind (9 nov 2026): tras revocar el dispositivo, la copia del usuario
 * para arrancar sin cobertura (`rydercup-sesion-conocida`) se quedaba en el móvil,
 * y abrir la app sin red enseñaba «Bienvenido, <nombre>» con el correo de la
 * cuenta revocada. Aquí, con los módulos de verdad, el cierre forzado la borra.
 */
vi.mock('../utils/toast', () => ({
  default: { error: vi.fn(), success: vi.fn(), info: vi.fn(), dismiss: vi.fn() },
}));
vi.mock('../utils/sentryHelpers', () => ({ clearUserContext: vi.fn() }));
vi.mock('i18next', () => ({ default: { t: vi.fn((clave) => clave) } }));

const almacen = new Map();

describe('cierre forzado y copia para arrancar sin cobertura', () => {
  beforeEach(() => {
    almacen.clear();
    vi.stubGlobal('localStorage', {
      getItem: (clave) => (almacen.has(clave) ? almacen.get(clave) : null),
      setItem: (clave, valor) => almacen.set(clave, String(valor)),
      removeItem: (clave) => almacen.delete(clave),
    });
    delete globalThis.window.location;
    globalThis.window.location = { href: '', pathname: '/dashboard' };
  });
  afterEach(() => vi.unstubAllGlobals());

  it('revocar el dispositivo borra la copia del usuario y lleva al login', async () => {
    almacen.set('rydercup-sesion-conocida', JSON.stringify({ id: 'u-1', email: 'a@b.c' }));
    await import('./limpiezaAlCerrarLaSesion');
    const { handleDeviceRevocationLogout } = await import('../utils/deviceRevocationLogout');

    vi.useFakeTimers();
    try {
      handleDeviceRevocationLogout();
      vi.runAllTimers();
    } finally {
      vi.useRealTimers();
    }

    expect(almacen.has('rydercup-sesion-conocida')).toBe(false);
    expect(globalThis.window.location.href).toBe('/login');
  });
});
