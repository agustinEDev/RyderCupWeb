import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * El cierre por CSRF sigue los caminos del cierre forzado (tabla aprobada por Agustín el
 * 8 nov 2026, punto 3a):
 *
 *   S1 un solo cierre por carga, venga de donde venga: un segundo CSRF, o un CSRF tras
 *      un dispositivo revocado (o al revés), no hace nada
 *   S2 aviso a Sentry → limpia la cuenta (también el usuario de Sentry) → redirección
 *      en `finally`: si una limpieza falla, se llega igual al login
 *   S3 la misma limpieza que el dispositivo revocado
 *   y la página guardada va con la cuenta que estaba dentro (3b)
 *   y `seEstaCerrandoLaSesion` lo dice para quien pinta un fallo (3c)
 */
const orden = vi.hoisted(() => []);
const sentryHelpers = vi.hoisted(() => ({ clearUserContext: vi.fn(() => orden.push('sentry fuera')) }));
vi.mock('./sentryHelpers', () => sentryHelpers);
const aviso = vi.hoisted(() => ({ avisa: vi.fn((datos) => orden.push(`aviso ${datos.motivo}`)) }));
vi.mock('./avisoDeCierreForzado', async (original) => ({
  ...(await original()),
  avisaDelCierreForzado: aviso.avisa,
}));
const cuenta = vi.hoisted(() => ({ olvida: vi.fn(() => orden.push('partidas fuera')) }));
vi.mock('../services/loUltimoConocido', async (original) => ({
  ...(await original()),
  olvidaLoDeEstaCuenta: cuenta.olvida,
}));
vi.mock('../services/novedadesDeActividad', () => ({ olvidaLasNovedades: vi.fn() }));
vi.mock('i18next', () => ({ default: { t: vi.fn((k) => k) } }));
const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn(), info: vi.fn(), dismiss: vi.fn() }));
vi.mock('./toast', () => ({ default: toast }));

const { handleCsrfLogout } = await import('./csrfLogout');
const { anotaLaCuentaDeEstaPestana, olvidaLaCuentaDeEstaPestana } = await import('./vueltaTrasEntrar');
const {
  handleDeviceRevocationLogout,
  olvidaElCierreDeEstaCarga,
  seEstaCerrandoLaSesion,
} = await import('./deviceRevocationLogout');

describe('el cierre por CSRF, con los caminos del cierre forzado', () => {
  let almacen;
  let idas;

  beforeEach(() => {
    vi.useFakeTimers();
    orden.length = 0;
    vi.clearAllMocks();
    olvidaElCierreDeEstaCarga();
    olvidaLaCuentaDeEstaPestana();
    sessionStorage.clear();
    almacen = { user: JSON.stringify({ id: 'u-7' }), access_token: 'x' };
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((k) => almacen[k] ?? null),
      setItem: vi.fn((k, v) => {
        almacen[k] = String(v);
      }),
      removeItem: vi.fn((k) => {
        delete almacen[k];
      }),
    });
    idas = [];
    vi.stubGlobal('location', {
      pathname: '/competitions/7',
      search: '',
      hash: '',
      origin: 'http://localhost:3000',
      set href(v) {
        idas.push(v);
      },
      get href() {
        return idas.at(-1) ?? '';
      },
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('S1: un segundo CSRF en la misma carga no hace nada', () => {
    handleCsrfLogout({ detail: 'CSRF token missing' });
    handleCsrfLogout({ detail: 'CSRF token missing' });
    vi.runAllTimers();

    expect(aviso.avisa).toHaveBeenCalledTimes(1);
    expect(idas).toEqual(['/login']);
  });

  it('S1: un CSRF tras un dispositivo revocado no hace nada', () => {
    handleDeviceRevocationLogout({ detail: 'Dispositivo revocado' });
    handleCsrfLogout({ detail: 'CSRF token missing' });
    vi.runAllTimers();

    expect(aviso.avisa).toHaveBeenCalledTimes(1);
    expect(aviso.avisa.mock.calls[0][0].motivo).not.toBe('csrf_unrecovered');
    expect(idas).toEqual(['/login']);
  });

  it('S1: un dispositivo revocado tras un CSRF no hace nada (ni toast)', () => {
    handleCsrfLogout({ detail: 'CSRF token missing' });
    handleDeviceRevocationLogout({ detail: 'Dispositivo revocado' });
    vi.runAllTimers();

    expect(aviso.avisa).toHaveBeenCalledTimes(1);
    expect(toast.error).not.toHaveBeenCalled();
    expect(idas).toEqual(['/login']);
  });

  it('S2: avisa a Sentry antes de limpiar, y quita el usuario de Sentry', () => {
    handleCsrfLogout({ detail: 'CSRF token missing' });

    expect(orden[0]).toMatch(/^aviso /);
    expect(orden).toContain('sentry fuera');
    expect(orden.indexOf('sentry fuera')).toBeGreaterThan(0);
  });

  it('S2: si una limpieza falla, se llega igual al login y el fallo no sale (la cola espera el error de CSRF)', () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => {});
    cuenta.olvida.mockImplementationOnce(() => {
      throw new Error('almacenamiento roto');
    });

    expect(() => handleCsrfLogout({ detail: 'CSRF token missing' })).not.toThrow();
    vi.runAllTimers();

    expect(idas).toEqual(['/login']);
    expect(consola).toHaveBeenCalledWith('[CSRF] Logout cleanup failed:', expect.any(Error));
    consola.mockRestore();
  });

  it('S3: limpia lo mismo que el dispositivo revocado', () => {
    handleCsrfLogout({ detail: 'CSRF token missing' });

    expect(almacen.user).toBeUndefined();
    expect(almacen.access_token).toBeUndefined();
    expect(cuenta.olvida).toHaveBeenCalledTimes(1);
    expect(sentryHelpers.clearUserContext).toHaveBeenCalledTimes(1);
  });

  it('S3: sigue sin toast y sin marca de revocación, como antes', () => {
    handleCsrfLogout({ detail: 'CSRF token missing' });

    expect(toast.error).not.toHaveBeenCalled();
    expect(almacen.device_revocation_handled).toBeUndefined();
  });

  it('3b: guarda la página con la cuenta que estaba dentro, leída antes de limpiar', () => {
    handleCsrfLogout({ detail: 'CSRF token missing' });

    expect(sessionStorage.getItem('vuelta_tras_entrar')).toBe('/competitions/7');
    expect(sessionStorage.getItem('vuelta_tras_entrar_cuenta')).toBe('u-7');
  });

  it('3b: el dispositivo revocado también la guarda con la cuenta', () => {
    handleDeviceRevocationLogout({ detail: 'Dispositivo revocado' });

    expect(sessionStorage.getItem('vuelta_tras_entrar_cuenta')).toBe('u-7');
  });

  it.each([
    ['CSRF', () => handleCsrfLogout({ detail: 'CSRF token missing' })],
    ['dispositivo revocado', () => handleDeviceRevocationLogout({ detail: 'Dispositivo revocado' })],
  ])('3b: con dos pestañas, la segunda (%s) guarda con SU cuenta aunque la primera ya limpiara', (_n, cierra) => {
    anotaLaCuentaDeEstaPestana('u-7');
    // La otra pestaña ya cerró: el usuario guardado no está
    delete almacen.user;
    almacen.device_revocation_handled = 'forzado';

    cierra();

    expect(sessionStorage.getItem('vuelta_tras_entrar')).toBe('/competitions/7');
    expect(sessionStorage.getItem('vuelta_tras_entrar_cuenta')).toBe('u-7');
  });

  it('3c: seEstaCerrandoLaSesion, falso al cargar y cierto tras un CSRF', () => {
    expect(seEstaCerrandoLaSesion()).toBe(false);

    handleCsrfLogout({ detail: 'CSRF token missing' });

    expect(seEstaCerrandoLaSesion()).toBe(true);
  });

  it('3c: y cierto tras un dispositivo revocado', () => {
    handleDeviceRevocationLogout({ detail: 'Dispositivo revocado' });

    expect(seEstaCerrandoLaSesion()).toBe(true);
  });
});
