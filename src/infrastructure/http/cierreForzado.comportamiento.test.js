import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Lo que ve y lo que queda de cada cierre de sesión forzado, fijado caso a caso:
 * el aviso a Sentry, la limpieza, el usuario de Sentry, la marca, el aviso al
 * usuario (texto, icono, duración, `delCierre`), el retraso y el destino de la
 * redirección y la página guardada para volver. Se escribió ANTES de sacar los
 * efectos de interfaz de la infraestructura: tiene que seguir igual después.
 *
 * | Caso                                   | Sentry          | Aviso al usuario                 | Redirección       |
 * |----------------------------------------|-----------------|----------------------------------|-------------------|
 * | dispositivo revocado, con cuenta       | device_revoked  | auth:errors.deviceRevoked 🔒     | /login a 500 ms   |
 * | dispositivo revocado, sin cuenta       | device_revoked  | auth:errors.deviceRevoked 🔒     | /login a 500 ms   |
 * | sesión caducada (SESSION_ENDED)        | session_expired | auth:errors.sessionExpired ⏱️    | /login a 500 ms   |
 * | sesión caducada, sin cuenta            | session_expired | ninguno                          | /login a 500 ms   |
 * | refresco rechazado (otro código)       | refresh_rejected| auth:errors.sessionEnded ℹ️      | /login a 500 ms   |
 * | revocó su propio dispositivo («propia»)| ninguno         | ninguno                          | /login sin espera, sin guardar |
 * | CSRF sin recuperar                     | csrf_unrecovered| ninguno                          | /login sin espera |
 */

const efectos = vi.hoisted(() => []);
vi.mock('../../utils/toast', () => ({
  default: { error: vi.fn((texto, opciones) => efectos.push(['toast', texto, opciones])) },
}));
vi.mock('i18next', () => ({ default: { t: vi.fn((clave, { ns } = {}) => `${ns}:${clave}`) } }));
vi.mock('../../utils/sentryHelpers', () => ({
  clearUserContext: vi.fn(() => efectos.push(['sentry:olvidaUsuario'])),
  captureError: vi.fn((titulo, { tags }) => efectos.push(['sentry:aviso', tags['logout.reason']])),
}));

const cargaUnaPaginaNueva = async ({ cuenta }) => {
  vi.resetModules();
  // Como en la app, lo que la composition root registra antes de nada; las
  // limpiezas de la cuenta, una sola de prueba que se ve en la lista
  const interfaz = '../../composition/interfazDelTransporte';
  try {
    await import(/* @vite-ignore */ interfaz);
  } catch {
    // Antes de la inversión no existe: la infraestructura lo hacía sola
  }
  const registro = await import('./deviceRevocationLogout');
  registro.alCerrarLaSesion(() => efectos.push(['limpieza']));
  const { handleCsrfLogout } = await import('./csrfLogout');
  const vuelta = await import('../../utils/vueltaTrasEntrar');
  vuelta.olvidaLaCuentaDeEstaPestana();
  if (cuenta) vuelta.anotaLaCuentaDeEstaPestana('u-1');
  return { ...registro, handleCsrfLogout };
};

const almacenConMarca = (marca = null) => {
  const datos = marca ? { device_revocation_handled: marca } : {};
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((k) => datos[k] ?? null),
    setItem: vi.fn((k, v) => {
      datos[k] = String(v);
      efectos.push(['marca', k, String(v)]);
    }),
    removeItem: vi.fn((k) => {
      delete datos[k];
      efectos.push(['borra', k]);
    }),
  });
};

describe('cierre de sesión forzado: lo que pasa en cada caso', () => {
  beforeEach(() => {
    efectos.length = 0;
    vi.useFakeTimers();
    globalThis.sessionStorage.clear();
    delete globalThis.window.location;
    globalThis.window.location = { href: '', pathname: '/competitions/7', search: '?tab=2', hash: '', origin: 'http://localhost' };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const AVISO = { duration: 8000, delCierre: true };

  it.each([
    ['dispositivo revocado, con cuenta', 'revocado', true, null, 'device_revoked', ['auth:errors.deviceRevoked', '🔒']],
    ['dispositivo revocado, sin cuenta', 'revocado', false, null, 'device_revoked', ['auth:errors.deviceRevoked', '🔒']],
    ['sesión caducada', 'caducada', true, { error_code: 'SESSION_ENDED' }, 'session_expired', ['auth:errors.sessionExpired', '⏱️']],
    ['sesión caducada, sin cuenta', 'caducada', false, { error_code: 'SESSION_ENDED' }, 'session_expired', null],
    ['refresco rechazado', 'caducada', true, { error_code: 'REFRESH_TOKEN_REVOKED' }, 'refresh_rejected', ['auth:errors.sessionEnded', 'ℹ️']],
  ])('%s', async (_caso, tipo, cuenta, datos, motivo, aviso) => {
    almacenConMarca();
    const cierre = await cargaUnaPaginaNueva({ cuenta });

    if (tipo === 'revocado') cierre.handleDeviceRevocationLogout(datos);
    else cierre.handleSessionExpiredLogout(datos);

    const esperado = [
      ['sentry:aviso', motivo],
      ['borra', 'user'],
      ['borra', 'access_token'],
      ['limpieza'],
      ['sentry:olvidaUsuario'],
      ['marca', 'device_revocation_handled', 'forzado'],
    ];
    if (aviso) esperado.push(['toast', aviso[0], { ...AVISO, icon: aviso[1] }]);
    expect(efectos).toEqual(esperado);

    // La redirección espera 500 ms (para leer el aviso), y guarda la página
    vi.advanceTimersByTime(499);
    expect(globalThis.window.location.href).toBe('');
    vi.advanceTimersByTime(1);
    expect(globalThis.window.location.href).toBe('/login');
    expect(globalThis.sessionStorage.getItem('vuelta_tras_entrar')).toBe('/competitions/7?tab=2');
  });

  it('revocó su propio dispositivo: limpia, sin aviso ni página guardada, y sale sin esperar', async () => {
    almacenConMarca('propia');
    globalThis.sessionStorage.setItem('vuelta_tras_entrar', '/otra');
    const cierre = await cargaUnaPaginaNueva({ cuenta: true });

    cierre.handleDeviceRevocationLogout({ detail: 'Dispositivo revocado' });

    expect(efectos).toEqual([['borra', 'user'], ['borra', 'access_token'], ['limpieza'], ['sentry:olvidaUsuario']]);
    expect(globalThis.window.location.href).toBe('/login');
    expect(globalThis.sessionStorage.getItem('vuelta_tras_entrar')).toBeNull();
  });

  it('CSRF sin recuperar: avisa a Sentry, limpia, sin aviso al usuario, y sale sin esperar guardando la página', async () => {
    almacenConMarca();
    const cierre = await cargaUnaPaginaNueva({ cuenta: true });

    cierre.handleCsrfLogout({ detail: 'x' }, { metodo: 'POST', endpoint: '/api/v1/x', estado: 403 });

    expect(efectos).toEqual([
      ['sentry:aviso', 'csrf_unrecovered'],
      ['borra', 'user'],
      ['borra', 'access_token'],
      ['limpieza'],
      ['sentry:olvidaUsuario'],
    ]);
    expect(globalThis.window.location.href).toBe('/login');
    expect(globalThis.sessionStorage.getItem('vuelta_tras_entrar')).toBe('/competitions/7?tab=2');
  });

  it('un segundo cierre en la misma carga no hace nada', async () => {
    almacenConMarca();
    const cierre = await cargaUnaPaginaNueva({ cuenta: true });

    cierre.handleDeviceRevocationLogout(null);
    const tras = efectos.length;
    cierre.handleSessionExpiredLogout({ error_code: 'SESSION_ENDED' });
    cierre.handleCsrfLogout();

    expect(efectos).toHaveLength(tras);
  });
});
