import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * La consulta de la sesión vive una sola vez por carga de página (FE #489).
 * Antes cada componente que llamaba a `useAuth` abría la suya, y un arranque
 * pedía `/current-user` cuatro veces antes de que el panel pidiera su primer
 * dato.
 */
const respuestas = [];
const peticiones = [];

vi.mock('../utils/tokenRefreshInterceptor', () => ({
  fetchWithTokenRefresh: (url) => {
    peticiones.push(url);
    const siguiente = respuestas.shift() ?? { ok: true, status: 200, json: async () => ({ id: 'u-1' }) };
    return typeof siguiente === 'function' ? siguiente() : Promise.resolve(siguiente);
  },
}));

vi.mock('../utils/deviceRevocationLogout', () => ({
  isDeviceRevoked: () => false,
  handleDeviceRevocationLogout: vi.fn(),
  clearDeviceRevocationFlag: vi.fn(),
}));

const {
  consultaLaSesion,
  loQueHaySobreLaSesion,
  suscribeALaSesion,
  olvidaLaSesion,
  anotaLaSesion,
  reiniciaLaSesionCompartida,
} = await import('./sesionCompartida');

const usuario = (id = 'u-1') => ({ ok: true, status: 200, json: async () => ({ id }) });

describe('la consulta compartida de la sesión', () => {
  beforeEach(() => {
    reiniciaLaSesionCompartida();
    peticiones.length = 0;
    respuestas.length = 0;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('tres que preguntan a la vez son UNA sola petición', async () => {
    // El caso del arranque: el contexto de Sentry, el guardia de rutas y el
    // panel, montando casi a la vez
    respuestas.push(usuario());

    const [a, b, c] = await Promise.all([consultaLaSesion(), consultaLaSesion(), consultaLaSesion()]);

    expect(peticiones).toHaveLength(1);
    expect(a).toEqual({ id: 'u-1' });
    expect(b).toBe(a);
    expect(c).toBe(a);
  });

  it('quien llega después no toca la red', async () => {
    respuestas.push(usuario());
    await consultaLaSesion();

    const tardio = await consultaLaSesion();

    expect(peticiones).toHaveLength(1);
    expect(tardio).toEqual({ id: 'u-1' });
  });

  it('forzando SÍ se vuelve a preguntar', async () => {
    // Es lo que hace `refetch` tras guardar el hándicap
    respuestas.push(usuario('u-1'), usuario('u-2'));
    await consultaLaSesion();

    const despues = await consultaLaSesion({ forzar: true });

    expect(peticiones).toHaveLength(2);
    expect(despues).toEqual({ id: 'u-2' });
  });

  it('al salir se olvida, y el siguiente vuelve a preguntar', async () => {
    // Sin esto, lo guardado sobreviviria al cierre de sesion y el siguiente
    // componente que montara veria un usuario que ya no esta
    respuestas.push(usuario(), usuario());
    await consultaLaSesion();

    olvidaLaSesion();
    expect(loQueHaySobreLaSesion().user).toBeNull();

    await consultaLaSesion();
    expect(peticiones).toHaveLength(2);
  });

  it('quien acaba de entrar se anota sin gastar una consulta', async () => {
    anotaLaSesion({ id: 'recien-entrado' });

    const leido = await consultaLaSesion();

    expect(peticiones).toHaveLength(0);
    expect(leido).toEqual({ id: 'recien-entrado' });
    expect(loQueHaySobreLaSesion().cargando).toBe(false);
  });

  it('un 401 deja la sesión vacía, sin error', async () => {
    respuestas.push({ ok: false, status: 401, clone: () => ({ json: async () => ({}) }) });

    const leido = await consultaLaSesion();

    expect(leido).toBeNull();
    expect(loQueHaySobreLaSesion()).toMatchObject({ user: null, cargando: false, error: null, resuelta: true });
  });

  it('un fallo de red se cuenta como error y no deja la espera colgada', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    respuestas.push(() => Promise.reject(new Error('sin red')));

    const leido = await consultaLaSesion();

    expect(leido).toBeNull();
    expect(loQueHaySobreLaSesion().cargando).toBe(false);
    expect(loQueHaySobreLaSesion().error).toBe('sin red');
  });

  it('avisa a quien se haya suscrito, y deja de hacerlo al darse de baja', async () => {
    const avisos = [];
    const baja = suscribeALaSesion(() => avisos.push(loQueHaySobreLaSesion().user));
    respuestas.push(usuario());

    await consultaLaSesion();
    const tras = avisos.length;
    baja();
    olvidaLaSesion();

    expect(tras).toBeGreaterThan(0);
    expect(avisos).toHaveLength(tras);
  });

  it('la instantánea es la MISMA mientras no cambie nada', () => {
    // `useSyncExternalStore` compara por identidad: un objeto nuevo en cada
    // lectura dejaria la aplicacion repintando sin parar
    expect(loQueHaySobreLaSesion()).toBe(loQueHaySobreLaSesion());
  });
});
