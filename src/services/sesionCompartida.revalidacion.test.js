import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Volver a preguntar por la sesión al volver a la aplicación o al volver la red
 * (hotfix 2.50.1). La instalada vive días abierta, y sin esto quien tuviera los
 * Términos pendientes nunca llegaba a la pantalla de aceptarlos. Se retiró una
 * vez (FE #505) por echar a gente sin cobertura —eso lo cerró FE #514— y por
 * borrar lo escrito en el perfil; aquí se vigila que no vuelva.
 *
 *   #   caso                                              | qué pasa
 *   ----|---------------------------------------------------|-----------------------------------
 *   1   vuelve al frente, ahora con Términos pendientes   | se publica el usuario nuevo
 *   2   la misma respuesta                                | nadie se entera: ni aviso ni objeto nuevo
 *   3   sin red                                           | nada cambia, ni reintentos
 *   4   el servidor responde mal (500, 401)               | nada cambia
 *   5   antes de 60 s desde la última respuesta           | no pregunta; pasados, sí
 *   5b  recién entrado o recién aceptados (se siembra)    | cuenta como respuesta: no pregunta
 *   6   sin sesión (nada sabido, o resuelta sin usuario)  | no pregunta
 *   7   la pestaña se oculta                              | no pregunta
 *   8   vuelve la red                                     | pregunta
 *   9   se cierra la sesión a media pregunta              | la respuesta no manda
 *   10  la copia vieja del dispositivo, sin el campo      | al volver la red se confirma con lo del servidor
 *   11  ya hay una consulta en vuelo o un reintento       | no abre otra
 *   12  mientras pregunta                                 | ni `cargando` ni `refrescando`: sin pantalla de espera
 *   13  la página se va                                   | no pregunta
 *   14  se deja de vigilar                                | no pregunta
 */
const respuestas = [];
const peticiones = [];
const RECUERDO = 'rydercup-sesion-conocida';

vi.mock('../utils/tokenRefreshInterceptor', () => ({
  fetchWithTokenRefresh: (url) => {
    peticiones.push(url);
    const siguiente = respuestas.shift() ?? { ok: true, status: 200, json: async () => ({ id: 'u-1' }) };
    return typeof siguiente === 'function' ? siguiente() : Promise.resolve(siguiente);
  },
}));
vi.mock('../utils/deviceRevocationLogout', () => ({ clearDeviceRevocationFlag: vi.fn() }));

const {
  consultaLaSesion,
  loQueHaySobreLaSesion,
  suscribeALaSesion,
  olvidaLaSesion,
  laPaginaSeVa,
  anotaLaSesion,
  reiniciaLaSesionCompartida,
  vigilaLaVueltaALaAplicacion,
  MINIMO_ENTRE_REVALIDACIONES_MS,
} = await import('./sesionCompartida');

const ok = (cuerpo) => ({ ok: true, status: 200, json: async () => cuerpo });
const ACEPTADOS = { id: 'u-1', terms_accepted: true };
const PENDIENTES = { id: 'u-1', terms_accepted: false };

let ahora = 1_000_000;
const pasa = (ms) => { ahora += ms; };
const fingeVisibilidad = (estado) =>
  Object.defineProperty(globalThis.document, 'visibilityState', { value: estado, configurable: true });
const vuelveAlFrente = () => {
  fingeVisibilidad('visible');
  globalThis.document.dispatchEvent(new globalThis.Event('visibilitychange'));
};
const vuelveLaRed = () => globalThis.dispatchEvent(new globalThis.Event('online'));
/** Lo que haya pendiente de promesas, resuelto. */
const asienta = () => new Promise((r) => setTimeout(r, 0));

let dejaDeVigilar = () => {};

describe('la sesión se vuelve a preguntar al volver a la aplicación', () => {
  beforeEach(async () => {
    vi.spyOn(Date, 'now').mockImplementation(() => ahora);
    reiniciaLaSesionCompartida();
    peticiones.length = 0;
    respuestas.length = 0;
    try { localStorage.removeItem(RECUERDO); } catch { /* sin almacenamiento */ }
    fingeVisibilidad('visible');
    dejaDeVigilar = vigilaLaVueltaALaAplicacion();
  });

  afterEach(() => {
    dejaDeVigilar();
    vi.restoreAllMocks();
    fingeVisibilidad('visible');
  });

  /** Una sesión confirmada por el servidor, y el reloj pasado el mínimo. */
  const conSesion = async (usuario = ACEPTADOS) => {
    respuestas.push(ok(usuario));
    await consultaLaSesion();
    peticiones.length = 0;
    pasa(MINIMO_ENTRE_REVALIDACIONES_MS + 1);
  };

  it('1: al volver al frente con los Términos ya pendientes, se publica', async () => {
    await conSesion();
    respuestas.push(ok(PENDIENTES));

    vuelveAlFrente();
    await asienta();

    expect(peticiones).toHaveLength(1);
    expect(loQueHaySobreLaSesion().user).toEqual(PENDIENTES);
    expect(JSON.parse(localStorage.getItem(RECUERDO))).toMatchObject({ terms_accepted: false });
  });

  it('2: con la misma respuesta nadie se entera (ni aviso ni objeto nuevo)', async () => {
    // Un objeto nuevo re-sincroniza el formulario del perfil y borra lo escrito
    await conSesion();
    const antes = loQueHaySobreLaSesion();
    const oyente = vi.fn();
    const baja = suscribeALaSesion(oyente);
    respuestas.push(ok({ ...ACEPTADOS }));

    vuelveAlFrente();
    await asienta();
    baja();

    expect(peticiones).toHaveLength(1);
    expect(oyente).not.toHaveBeenCalled();
    expect(loQueHaySobreLaSesion()).toBe(antes);
  });

  it('3: sin red nada cambia, ni se programan reintentos', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      await conSesion();
      const antes = loQueHaySobreLaSesion();
      respuestas.push(() => Promise.reject(new TypeError('Failed to fetch')));
      vi.spyOn(console, 'error').mockImplementation(() => {});

      vuelveAlFrente();
      await vi.advanceTimersByTimeAsync(60_000);

      expect(peticiones).toHaveLength(1);
      expect(loQueHaySobreLaSesion()).toBe(antes);
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([500, 401, 404])('4: con un %s nada cambia', async (status) => {
    // La sesión muerta de verdad la cierra el interceptor, no esto
    await conSesion();
    const antes = loQueHaySobreLaSesion();
    respuestas.push({ ok: false, status, json: async () => ({}) });

    vuelveAlFrente();
    await asienta();

    expect(peticiones).toHaveLength(1);
    expect(loQueHaySobreLaSesion()).toBe(antes);
    expect(localStorage.getItem(RECUERDO)).not.toBeNull();
  });

  it('5: no pregunta antes del minuto desde la última respuesta; pasado, sí', async () => {
    respuestas.push(ok(ACEPTADOS));
    await consultaLaSesion();
    peticiones.length = 0;

    pasa(MINIMO_ENTRE_REVALIDACIONES_MS - 1);
    vuelveAlFrente();
    vuelveLaRed();
    await asienta();
    expect(peticiones).toHaveLength(0);

    pasa(1);
    vuelveAlFrente();
    vuelveLaRed();
    await asienta();
    expect(peticiones).toHaveLength(1);

    // Y la propia comprobación cuenta: otra seguida no sale
    vuelveAlFrente();
    await asienta();
    expect(peticiones).toHaveLength(1);
  });

  it('5b: recién sembrada la sesión (entrar, aceptar los Términos) no vuelve a preguntar', async () => {
    await conSesion();
    anotaLaSesion({ ...ACEPTADOS });

    vuelveAlFrente();
    await asienta();

    expect(peticiones).toHaveLength(0);
  });

  it('6: sin sesión no pregunta', async () => {
    vuelveAlFrente();
    await asienta();
    expect(peticiones).toHaveLength(0);

    respuestas.push({ ok: false, status: 401, json: async () => ({}) });
    await consultaLaSesion();
    peticiones.length = 0;
    pasa(MINIMO_ENTRE_REVALIDACIONES_MS + 1);

    vuelveAlFrente();
    await asienta();
    expect(peticiones).toHaveLength(0);
  });

  it('7: al ocultarse la pestaña no pregunta', async () => {
    await conSesion();

    fingeVisibilidad('hidden');
    globalThis.document.dispatchEvent(new globalThis.Event('visibilitychange'));
    await asienta();

    expect(peticiones).toHaveLength(0);
  });

  it('8: al volver la red pregunta', async () => {
    await conSesion();
    respuestas.push(ok(PENDIENTES));

    vuelveLaRed();
    await asienta();

    expect(loQueHaySobreLaSesion().user).toEqual(PENDIENTES);
  });

  it('9: si se cierra la sesión a media pregunta, la respuesta no manda', async () => {
    await conSesion();
    let entrega;
    respuestas.push(() => new Promise((r) => { entrega = r; }));

    vuelveAlFrente();
    olvidaLaSesion();
    entrega(ok(PENDIENTES));
    await asienta();

    expect(loQueHaySobreLaSesion().user).toBeNull();
    expect(localStorage.getItem(RECUERDO)).toBeNull();
  });

  it('10: la copia vieja del dispositivo (sin el campo) se confirma al volver la red', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      // La escribió una versión anterior: sin `terms_accepted`
      localStorage.setItem(RECUERDO, JSON.stringify({ id: 'u-1' }));
      // Se arranca sin red y se agotan los reintentos
      for (let i = 0; i < 5; i += 1) respuestas.push(() => Promise.reject(new TypeError('Failed to fetch')));
      consultaLaSesion();
      await vi.advanceTimersByTimeAsync(60_000);
      // Lo de la copia, con el error de no poder preguntar
      expect(loQueHaySobreLaSesion().user).toMatchObject({ id: 'u-1' });
      expect(loQueHaySobreLaSesion().error).not.toBeNull();
      peticiones.length = 0;
      respuestas.length = 0;
      pasa(MINIMO_ENTRE_REVALIDACIONES_MS + 1);
      respuestas.push(ok(PENDIENTES));

      vuelveLaRed();
      await vi.advanceTimersByTimeAsync(0);

      expect(peticiones).toHaveLength(1);
      expect(loQueHaySobreLaSesion()).toMatchObject({ user: PENDIENTES, sinConfirmar: false, error: null });
    } finally {
      vi.useRealTimers();
    }
  });

  it('10b: misma persona y mismo contenido, pero sin confirmar: también se confirma', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      localStorage.setItem(RECUERDO, JSON.stringify({ id: 'u-1', is_admin: false }));
      for (let i = 0; i < 5; i += 1) respuestas.push(() => Promise.reject(new TypeError('Failed to fetch')));
      consultaLaSesion();
      await vi.advanceTimersByTimeAsync(60_000);
      respuestas.length = 0;
      pasa(MINIMO_ENTRE_REVALIDACIONES_MS + 1);
      respuestas.push(ok({ id: 'u-1', is_admin: false }));

      vuelveLaRed();
      await vi.advanceTimersByTimeAsync(0);

      expect(loQueHaySobreLaSesion()).toMatchObject({ sinConfirmar: false, error: null });
    } finally {
      vi.useRealTimers();
    }
  });

  it('11: con una consulta en vuelo no abre otra', async () => {
    await conSesion();
    let entrega;
    respuestas.push(() => new Promise((r) => { entrega = r; }));
    const enVuelo = consultaLaSesion({ forzar: true });

    vuelveAlFrente();
    await asienta();
    expect(peticiones).toHaveLength(1);

    entrega(ok(ACEPTADOS));
    await enVuelo;
  });

  it('11b: con un reintento programado no abre otra', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      await conSesion();
      respuestas.push(() => Promise.reject(new TypeError('Failed to fetch')));
      await consultaLaSesion({ forzar: true });
      peticiones.length = 0;
      pasa(MINIMO_ENTRE_REVALIDACIONES_MS + 1);

      vuelveAlFrente();
      await vi.advanceTimersByTimeAsync(0);

      expect(peticiones).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('12: mientras pregunta no hay pantalla de espera', async () => {
    await conSesion();
    const antes = loQueHaySobreLaSesion();
    let entrega;
    respuestas.push(() => new Promise((r) => { entrega = r; }));

    vuelveAlFrente();
    await asienta();

    expect(peticiones).toHaveLength(1);
    expect(loQueHaySobreLaSesion()).toBe(antes);
    expect(loQueHaySobreLaSesion()).toMatchObject({ cargando: false, refrescando: false });
    entrega(ok(ACEPTADOS));
    await asienta();
  });

  it('13: con la página yéndose no pregunta', async () => {
    await conSesion();
    laPaginaSeVa();

    vuelveAlFrente();
    await asienta();

    expect(peticiones).toHaveLength(0);
  });

  it('14: tras dejar de vigilar no pregunta', async () => {
    await conSesion();
    dejaDeVigilar();

    vuelveAlFrente();
    vuelveLaRed();
    await asienta();

    expect(peticiones).toHaveLength(0);
  });
});
