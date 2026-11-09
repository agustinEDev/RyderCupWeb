import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * El puerto por el que el transporte pide a la interfaz lo que no puede hacer él
 * (traducir, avisar, Sentry, la página para volver, si una ruta es pública).
 *
 * | Caso                                             | Esperado                                   |
 * |--------------------------------------------------|--------------------------------------------|
 * | sin registrar, se usa                            | lanza «no hay interfaz … registrada»       |
 * | sin registrar, un cierre forzado                 | el mismo error, en voz alta                |
 * | sin registrar, cada cierre (y la marca «propia») | lanza antes de empezar: ni «cerrándose», ni limpia, ni redirige |
 * | sin registrar, un error de la API que se traduce | el mismo error, no un texto vacío          |
 * | se registra a medias                             | lanza y dice qué falta                     |
 * | se registra entera                               | `interfaz()` la devuelve                   |
 * | la composition root la registra                  | trae todo lo que hace falta                |
 * | un motivo heredado del prototipo (toString…)     | avisa como sesión terminada                |
 * | main.jsx                                         | la carga antes que la aplicación           |
 */
const SIN_INTERFAZ = /No hay interfaz del transporte registrada: falta importar composition\/interfazDelTransporte/;

const COMPLETA = () =>
  Object.fromEntries(
    [
      'avisaASentryDelCierre',
      'olvidaElUsuarioDeSentry',
      'avisaAlUsuarioDelCierre',
      'ultimaCuentaDeEstaPestana',
      'redirigeAlLogin',
      'sinSesionEnRutaPublica',
      'traduce',
      'informaDelError',
      'llevaAAceptarLosTerminos',
      'silenciaElAviso',
    ].map((nombre) => [nombre, vi.fn()])
  );

describe('la interfaz del transporte', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('sin registrar, usarla lanza', async () => {
    const { interfaz } = await import('./interfazDelTransporte');

    expect(() => interfaz()).toThrow(SIN_INTERFAZ);
  });

  it('sin registrar, un cierre forzado falla en voz alta', async () => {
    const { alCerrarLaSesion, handleDeviceRevocationLogout } = await import('./deviceRevocationLogout');
    alCerrarLaSesion(() => {});
    vi.stubGlobal('localStorage', { getItem: vi.fn(() => null), setItem: vi.fn(), removeItem: vi.fn() });

    expect(() => handleDeviceRevocationLogout(null)).toThrow(SIN_INTERFAZ);
  });

  it.each([
    ['dispositivo revocado', null, 'handleDeviceRevocationLogout'],
    ['dispositivo revocado, marca «propia»', 'propia', 'handleDeviceRevocationLogout'],
    ['sesión caducada', null, 'handleSessionExpiredLogout'],
    ['CSRF', null, 'handleCsrfLogout'],
  ])('sin registrar, %s falla ANTES de empezar el cierre: la carga no queda «cerrándose» ni se redirige', async (_caso, marca, cierre) => {
    vi.useFakeTimers();
    try {
      vi.stubGlobal('localStorage', { getItem: vi.fn(() => marca), setItem: vi.fn(), removeItem: vi.fn() });
      vi.stubGlobal('location', { href: '', pathname: '/competitions/7', search: '', hash: '' });
      const cierres = { ...(await import('./deviceRevocationLogout')), ...(await import('./csrfLogout')) };
      cierres.alCerrarLaSesion(() => {});
      const { seEstaCerrandoLaSesion } = await import('../../utils/cierreDeEstaCarga');

      expect(() => cierres[cierre](null)).toThrow(SIN_INTERFAZ);
      vi.advanceTimersByTime(1000);

      expect(seEstaCerrandoLaSesion()).toBe(false);
      expect(localStorage.removeItem).not.toHaveBeenCalled();
      expect(globalThis.location.href).toBe('');
    } finally {
      vi.useRealTimers();
    }
  });

  it('sin registrar, un 429 de la API no sale con un texto vacío: lanza', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 429, statusText: 'Too Many', json: async () => ({}) })));
    const { apiRequest } = await import('./api');

    await expect(apiRequest('/api/v1/x')).rejects.toThrow(SIN_INTERFAZ);
  });

  it('registrada a medias, dice qué le falta', async () => {
    const { registraLaInterfazDelTransporte } = await import('./interfazDelTransporte');
    const aMedias = COMPLETA();
    delete aMedias.traduce;
    delete aMedias.redirigeAlLogin;

    expect(() => registraLaInterfazDelTransporte(aMedias)).toThrow(
      'La interfaz del transporte no trae: redirigeAlLogin, traduce'
    );
  });

  it('registrada entera, es la que se usa', async () => {
    const { registraLaInterfazDelTransporte, interfaz } = await import('./interfazDelTransporte');
    const completa = COMPLETA();

    registraLaInterfazDelTransporte(completa);

    expect(interfaz()).toBe(completa);
  });

  it.each([['toString'], ['constructor'], ['__proto__'], ['ended']])(
    'un motivo que no es suyo (%s) avisa como sesión terminada',
    async (motivo) => {
      const toast = { error: vi.fn() };
      vi.doMock('../../utils/toast', () => ({ default: toast }));
      vi.doMock('i18next', () => ({ default: { t: (clave, { ns } = {}) => `${ns}:${clave}` } }));
      await import('../../composition/interfazDelTransporte');
      const { interfaz } = await import('./interfazDelTransporte');

      interfaz().avisaAlUsuarioDelCierre(motivo);

      expect(toast.error).toHaveBeenCalledWith('auth:errors.sessionEnded', { duration: 8000, icon: 'ℹ️', delCierre: true });
      vi.doUnmock('../../utils/toast');
      vi.doUnmock('i18next');
    }
  );

  it('la composition root la registra con todo', async () => {
    await import('../../composition/interfazDelTransporte');
    const { interfaz } = await import('./interfazDelTransporte');

    expect(Object.keys(interfaz()).sort()).toEqual(Object.keys(COMPLETA()).sort());
  });

  it('main.jsx la carga antes que la aplicación (y que nada que llame a la API)', () => {
    const lineas = readFileSync(resolve(globalThis.process.cwd(), 'src/main.jsx'), 'utf8').split('\n');
    const cableado = lineas.indexOf("import './composition/interfazDelTransporte';");
    const app = lineas.findIndex((linea) => linea.startsWith('import App '));

    expect(cableado).toBeGreaterThan(-1);
    expect(cableado).toBeLessThan(app);
  });
});
