import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Lo que ve y lo que queda de cada cierre de sesión forzado, fijado caso a caso:
 * el aviso a Sentry, la limpieza, el usuario de Sentry, la marca, el aviso al
 * usuario (texto, icono, duración, `delCierre`), el retraso y el destino de la
 * redirección y la página guardada para volver. Se escribió ANTES de sacar los
 * efectos de interfaz de la infraestructura (composition/interfazDelTransporte) y
 * pasó igual antes y después.
 *
 * Desde el 9 nov 2026 el aviso se enseña en /login y no en la página de partida,
 * que se recarga a los 500 ms y no dejaba leerlo: se guarda su motivo en
 * sessionStorage y /login lo enseña igual (mismo texto, icono, 8 s, `delCierre`).
 * Sin sessionStorage, se enseña en la página de partida, como antes. Los 500 ms
 * solo eran para leer ese aviso: ahora se espera solo en ese caso; si se guardó
 * (o no hay aviso), se sale a /login al momento (10 nov 2026).
 *
 * | Caso                                   | Sentry          | Aviso al usuario (en /login)     | Redirección       |
 * |----------------------------------------|-----------------|----------------------------------|-------------------|
 * | dispositivo revocado, con cuenta       | device_revoked  | auth:errors.deviceRevoked 🔒     | /login al momento |
 * | dispositivo revocado, sin cuenta       | device_revoked  | auth:errors.deviceRevoked 🔒     | /login al momento |
 * | sesión caducada (SESSION_ENDED)        | session_expired | auth:errors.sessionExpired ⏱️    | /login al momento |
 * | sesión caducada, sin cuenta            | session_expired | ninguno                          | /login al momento |
 * | refresco rechazado (otro código)       | refresh_rejected| auth:errors.sessionEnded ℹ️      | /login al momento |
 * | sin sessionStorage para el aviso       | (el del caso)   | en la página de partida          | /login a 500 ms   |
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
  // Como en la app, la respuesta de la interfaz registrada antes de nada; las
  // limpiezas de la cuenta, una sola de prueba que se ve en la lista
  await import('../../composition/interfazDelTransporte');
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
    // En la página de partida, ningún aviso: se guarda para /login
    expect(efectos).toEqual(esperado);

    // /login enseña el MISMO aviso, una vez
    const { tomaElAvisoDelCierre, muestraElAvisoDelCierre } = await import('../../utils/avisoTrasElCierre');
    const i18next = (await import('i18next')).default;
    const guardado = tomaElAvisoDelCierre();
    if (aviso) {
      muestraElAvisoDelCierre(guardado, i18next.t);
      expect(efectos.at(-1)).toEqual(['toast', aviso[0], { ...AVISO, icon: aviso[1] }]);
    } else {
      expect(guardado).toBeNull();
    }
    expect(tomaElAvisoDelCierre()).toBeNull();

    // El aviso se lee en /login: se sale al momento, guardando la página
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
    const { tomaElAvisoDelCierre } = await import('../../utils/avisoTrasElCierre');
    expect(tomaElAvisoDelCierre()).toBeNull();
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
    const { tomaElAvisoDelCierre } = await import('../../utils/avisoTrasElCierre');
    expect(tomaElAvisoDelCierre()).toBeNull();
  });

  it('sin sessionStorage para el aviso, se enseña en la página de partida, como antes', async () => {
    almacenConMarca();
    // Un sessionStorage que no deja guardar el aviso (lo demás, sí)
    const datos = new Map();
    vi.stubGlobal('sessionStorage', {
      getItem: (k) => (datos.has(k) ? datos.get(k) : null),
      setItem: (k, v) => {
        if (k === 'rydercup-aviso-del-cierre') throw new Error('bloqueado');
        datos.set(k, String(v));
      },
      removeItem: (k) => datos.delete(k),
      clear: () => datos.clear(),
    });
    const cierre = await cargaUnaPaginaNueva({ cuenta: true });

    cierre.handleDeviceRevocationLogout(null);

    expect(efectos.at(-1)).toEqual(['toast', 'auth:errors.deviceRevoked', { ...AVISO, icon: '🔒' }]);
    // Aquí sí se espera 500 ms: el aviso sale en esta página y hay que leerlo
    vi.advanceTimersByTime(499);
    expect(globalThis.window.location.href).toBe('');
    vi.advanceTimersByTime(1);
    expect(globalThis.window.location.href).toBe('/login');
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
