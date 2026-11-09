import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * El registro de limpiezas de la cuenta (`alCerrarLaSesion`), SIN el cableado de
 * la composition root: así se ve qué pasa si alguien deja de importarlo.
 *
 * | Caso                                      | Esperado                                           |
 * |-------------------------------------------|----------------------------------------------------|
 * | registro vacío, limpiaLaCuenta            | lanza «no hay limpiezas registradas…»              |
 * | registro vacío, olvidaLoDeLaCuenta        | lanza lo mismo                                     |
 * | registro vacío, dispositivo revocado      | el error sale, pero se llega igual a /login        |
 * | registro vacío, cierre por CSRF           | el error no sale (lo anota), se llega a /login     |
 * | cierre normal (clearAuth)                 | solo las limpiezas que no son de cierre forzado    |
 * | cierre forzado                            | todas, en el orden en que se registraron           |
 * | alCerrarLaSesion                          | no devuelve nada                                   |
 */

vi.mock('i18next', () => ({ default: { t: vi.fn((clave) => clave) } }));
vi.mock('./toast', () => ({ default: { error: vi.fn(), success: vi.fn(), info: vi.fn(), dismiss: vi.fn() } }));
vi.mock('./sentryHelpers', () => ({ clearUserContext: vi.fn() }));

const SIN_REGISTRO = /no hay limpiezas registradas: falta importar composition\/limpiezaAlCerrarLaSesion/i;

/** Una carga de página nueva: el registro del módulo empieza vacío. */
const cargaDeNuevo = async () => {
  vi.resetModules();
  const registro = await import('./deviceRevocationLogout');
  const { handleCsrfLogout } = await import('./csrfLogout');
  const { anotaLaCuentaDeEstaPestana } = await import('./vueltaTrasEntrar');
  anotaLaCuentaDeEstaPestana('u-1');
  return { ...registro, handleCsrfLogout };
};

describe('el registro de limpiezas de la cuenta', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('localStorage', { getItem: vi.fn(() => null), setItem: vi.fn(), removeItem: vi.fn() });
    delete globalThis.window.location;
    globalThis.window.location = { href: '', pathname: '/dashboard', search: '', hash: '' };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('con el registro vacío, limpiaLaCuenta lo dice en vez de no limpiar nada', async () => {
    const { limpiaLaCuenta } = await cargaDeNuevo();

    expect(() => limpiaLaCuenta()).toThrow(SIN_REGISTRO);
  });

  it('con el registro vacío, olvidaLoDeLaCuenta (el cierre normal) también', async () => {
    const { olvidaLoDeLaCuenta } = await cargaDeNuevo();

    expect(() => olvidaLoDeLaCuenta()).toThrow(SIN_REGISTRO);
  });

  it('con el registro vacío, un dispositivo revocado avisa del fallo y sale igual a /login', async () => {
    const { handleDeviceRevocationLogout } = await cargaDeNuevo();

    expect(() => handleDeviceRevocationLogout()).toThrow(SIN_REGISTRO);
    vi.advanceTimersByTime(500);

    expect(globalThis.window.location.href).toBe('/login');
  });

  it('con el registro vacío, el cierre por CSRF lo anota y sale igual a /login', async () => {
    const consola = vi.spyOn(globalThis.console, 'error').mockImplementation(() => {});
    const { handleCsrfLogout } = await cargaDeNuevo();

    expect(() => handleCsrfLogout()).not.toThrow();

    expect(consola).toHaveBeenCalledWith('[CSRF] Logout cleanup failed:', expect.objectContaining({ message: expect.stringMatching(SIN_REGISTRO) }));
    expect(globalThis.window.location.href).toBe('/login');
    consola.mockRestore();
  });

  it('el cierre normal salta las limpiezas que son solo de cierre forzado', async () => {
    const { alCerrarLaSesion, olvidaLoDeLaCuenta } = await cargaDeNuevo();
    const hechas = [];
    alCerrarLaSesion(() => hechas.push('siempre'));
    alCerrarLaSesion(() => hechas.push('forzado'), { soloCierresForzados: true });

    olvidaLoDeLaCuenta();

    expect(hechas).toEqual(['siempre']);
  });

  it('un cierre forzado las hace todas, en el orden en que se registraron', async () => {
    const { alCerrarLaSesion, limpiaLaCuenta } = await cargaDeNuevo();
    const hechas = [];
    alCerrarLaSesion(() => hechas.push('primera'));
    alCerrarLaSesion(() => hechas.push('forzado'), { soloCierresForzados: true });
    alCerrarLaSesion(() => hechas.push('tercera'));

    limpiaLaCuenta();

    expect(hechas).toEqual(['primera', 'forzado', 'tercera']);
  });

  it('registrar la misma limpieza dos veces no la repite, y no devuelve nada', async () => {
    const { alCerrarLaSesion, limpiaLaCuenta } = await cargaDeNuevo();
    const limpieza = vi.fn();

    expect(alCerrarLaSesion(limpieza)).toBeUndefined();
    alCerrarLaSesion(limpieza);
    limpiaLaCuenta();

    expect(limpieza).toHaveBeenCalledTimes(1);
  });
});
