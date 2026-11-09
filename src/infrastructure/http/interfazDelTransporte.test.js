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
 * | sin registrar, cada cierre (y la marca «propia») | falla cerrado: borra user, access_token y las limpiezas, y lanza; ni «cerrándose» ni redirige |
 * | se registra dos veces                            | la segunda lanza                           |
 * | lo registrado                                    | queda congelado                            |
 * | los tests reinician el registro                  | se puede registrar otra                    |
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
  ])('sin registrar, %s falla cerrado: borra lo de la cuenta y lanza, sin dejar la carga «cerrándose» ni redirigir', async (_caso, marca, cierre) => {
    vi.useFakeTimers();
    try {
      vi.stubGlobal('localStorage', { getItem: vi.fn(() => marca), setItem: vi.fn(), removeItem: vi.fn() });
      vi.stubGlobal('location', { href: '', pathname: '/competitions/7', search: '', hash: '' });
      const cierres = { ...(await import('./deviceRevocationLogout')), ...(await import('./csrfLogout')) };
      const limpieza = vi.fn();
      cierres.alCerrarLaSesion(limpieza);
      const { seEstaCerrandoLaSesion } = await import('../../utils/cierreDeEstaCarga');

      expect(() => cierres[cierre](null)).toThrow(SIN_INTERFAZ);
      vi.advanceTimersByTime(1000);

      // Lo que no depende de la interfaz se borra igual: los datos de la cuenta no
      // se quedan en el dispositivo por un registro que falta (decidido el 9 nov 2026)
      expect(localStorage.removeItem).toHaveBeenCalledWith('user');
      expect(localStorage.removeItem).toHaveBeenCalledWith('access_token');
      expect(limpieza).toHaveBeenCalledTimes(1);
      // Y nada más: ni la carga marcada, ni la marca del cierre, ni la redirección
      expect(seEstaCerrandoLaSesion()).toBe(false);
      expect(localStorage.setItem).not.toHaveBeenCalled();
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

  it('se registra una sola vez: la segunda lanza y sigue la primera', async () => {
    const { registraLaInterfazDelTransporte, interfaz } = await import('./interfazDelTransporte');
    const primera = COMPLETA();
    registraLaInterfazDelTransporte(primera);

    expect(() => registraLaInterfazDelTransporte(COMPLETA())).toThrow(
      'La interfaz del transporte ya está registrada'
    );
    expect(interfaz()).toBe(primera);
  });

  it('lo registrado queda congelado: no se le cambia una pieza después', async () => {
    const { registraLaInterfazDelTransporte, interfaz } = await import('./interfazDelTransporte');
    registraLaInterfazDelTransporte(COMPLETA());
    const original = interfaz().redirigeAlLogin;

    expect(Object.isFrozen(interfaz())).toBe(true);
    expect(() => {
      interfaz().redirigeAlLogin = () => {};
    }).toThrow(TypeError);
    expect(interfaz().redirigeAlLogin).toBe(original);
  });

  it('una carga nueva del módulo (vi.resetModules) empieza sin registrar', async () => {
    const primera = await import('./interfazDelTransporte');
    primera.registraLaInterfazDelTransporte(COMPLETA());
    vi.resetModules();
    const { registraLaInterfazDelTransporte, interfaz } = await import('./interfazDelTransporte');
    expect(() => interfaz()).toThrow(SIN_INTERFAZ);
    const otra = COMPLETA();

    registraLaInterfazDelTransporte(otra);

    expect(interfaz()).toBe(otra);
  });

  it('sin registrar, el fallo de un refresco no sale de trataElFalloDelRefresco: borra lo de la cuenta y lo anota', async () => {
    vi.stubGlobal('localStorage', { getItem: vi.fn(() => null), setItem: vi.fn(), removeItem: vi.fn() });
    const consola = vi.spyOn(globalThis.console, 'error').mockImplementation(() => {});
    vi.spyOn(globalThis.console, 'log').mockImplementation(() => {});
    const { alCerrarLaSesion } = await import('./deviceRevocationLogout');
    const limpieza = vi.fn();
    alCerrarLaSesion(limpieza);
    const { trataElFalloDelRefresco } = await import('./tokenRefreshInterceptor');
    const revocado = Object.assign(new Error('refresh failed'), {
      response: { status: 401, url: '/api/v1/auth/refresh-token' },
      errorData: { detail: 'Dispositivo revocado. Por favor, inicia sesión nuevamente.' },
    });

    expect(() => trataElFalloDelRefresco(revocado)).not.toThrow();

    expect(localStorage.removeItem).toHaveBeenCalledWith('user');
    expect(limpieza).toHaveBeenCalledTimes(1);
    expect(consola).toHaveBeenCalledWith(
      '[TokenRefresh] Forced logout failed:',
      expect.objectContaining({ message: expect.stringMatching(SIN_INTERFAZ) })
    );
    consola.mockRestore();
  });

  it('sin registrar y con una limpieza que falla, el error dice que falta la interfaz y trae el de la limpieza como causa', async () => {
    vi.stubGlobal('localStorage', { getItem: vi.fn(() => null), setItem: vi.fn(), removeItem: vi.fn() });
    const { alCerrarLaSesion, handleDeviceRevocationLogout } = await import('./deviceRevocationLogout');
    const fallo = new Error('almacén lleno');
    alCerrarLaSesion(() => {
      throw fallo;
    });

    let lanzado;
    try {
      handleDeviceRevocationLogout(null);
    } catch (error) {
      lanzado = error;
    }

    expect(lanzado?.message).toMatch(SIN_INTERFAZ);
    expect(lanzado?.cause).toBe(fallo);
  });

  it('sin interfaz se borra lo mismo que en un cierre forzado normal (sin Sentry)', async () => {
    const pasos = (borrados, limpiezas) => [...borrados, `limpiezas:${limpiezas}`];
    const almacen = () => {
      const borrados = [];
      vi.stubGlobal('localStorage', { getItem: vi.fn(() => null), setItem: vi.fn(), removeItem: vi.fn((k) => borrados.push(k)) });
      return borrados;
    };

    // Con la interfaz: limpiaLaCuenta, la del cierre forzado
    const conInterfaz = almacen();
    const normal = await import('./deviceRevocationLogout');
    const enNormal = vi.fn();
    normal.alCerrarLaSesion(enNormal);
    (await import('./interfazDelTransporte')).registraLaInterfazDelTransporte(COMPLETA());
    normal.limpiaLaCuenta();

    // Sin la interfaz: lo que borra antes de lanzar
    vi.resetModules();
    const sinInterfaz = almacen();
    const cerrado = await import('./deviceRevocationLogout');
    const enCerrado = vi.fn();
    cerrado.alCerrarLaSesion(enCerrado);
    expect(() => cerrado.handleDeviceRevocationLogout(null)).toThrow(SIN_INTERFAZ);

    expect(pasos(sinInterfaz, enCerrado.mock.calls.length)).toEqual(pasos(conInterfaz, enNormal.mock.calls.length));
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
