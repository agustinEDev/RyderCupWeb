import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

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

const revocado = { si: false };

vi.mock('../utils/deviceRevocationLogout', () => ({
  isDeviceRevoked: () => revocado.si,
  handleDeviceRevocationLogout: vi.fn(),
  clearDeviceRevocationFlag: vi.fn(),
}));

const {
  consultaLaSesion,
  loQueHaySobreLaSesion,
  suscribeALaSesion,
  olvidaLaSesion,
  reiniciaLaSesionCompartida,
  ESPERA_TRAS_FALLO_MS,
} = await import('./sesionCompartida');

const usuario = (id = 'u-1') => ({ ok: true, status: 200, json: async () => ({ id }) });

describe('la consulta compartida de la sesión', () => {
  beforeEach(() => {
    reiniciaLaSesionCompartida();
    peticiones.length = 0;
    respuestas.length = 0;
    revocado.si = false;
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
    // Y `cargando` ARRIBA: publicar «no se sabe nada» con `cargando` en falso le
    // dice a los guardias «resuelto y sin usuario», y `ProtectedRoute` rebota al
    // formulario en su primer render, justo despues de entrar
    expect(loQueHaySobreLaSesion().cargando).toBe(true);

    await consultaLaSesion();
    expect(peticiones).toHaveLength(2);
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

  it('una respuesta que llega tarde NO resucita una sesión cerrada', async () => {
    // Otra pestaña cierra sesión mientras la consulta esta en vuelo: si la
    // respuesta escribiera, el guardia dejaria entrar a quien acaba de salir
    let resolver;
    respuestas.push(() => new Promise((r) => { resolver = r; }));
    const enCurso = consultaLaSesion();

    olvidaLaSesion();
    resolver(usuario());
    await enCurso;

    expect(loQueHaySobreLaSesion().user).toBeNull();
    expect(loQueHaySobreLaSesion().resuelta).toBe(false);
  });

  it('un tropiezo de red NO se guarda como respuesta', async () => {
    // Guardarlo dejaba al arranque sin cobertura en un ida y vuelta entre el
    // guardia y el formulario, sin que ninguno volviera a preguntar
    vi.spyOn(console, 'error').mockImplementation(() => {});
    respuestas.push(() => Promise.reject(new Error('sin red')), usuario());

    await consultaLaSesion();
    expect(loQueHaySobreLaSesion().resuelta).toBe(false);

    const reintento = await consultaLaSesion({ forzar: true });

    expect(peticiones).toHaveLength(2);
    expect(reintento).toEqual({ id: 'u-1' });
  });

  it('mientras espera para reintentar, sigue siendo «no se sabe»', async () => {
    // Publicarlo como «resuelto y sin usuario» hacia que `ProtectedRoute`
    // mandara al formulario, en su primer render, a alguien con la sesion
    // abierta: la aplicacion decidia que no habia sesion sin llegar a preguntar
    vi.spyOn(console, 'error').mockImplementation(() => {});
    respuestas.push(() => Promise.reject(new Error('sin red')));

    await consultaLaSesion();
    await consultaLaSesion();

    expect(loQueHaySobreLaSesion().cargando).toBe(true);
    expect(loQueHaySobreLaSesion().resuelta).toBe(false);
  });

  it('y reintenta sola al vencer la espera', async () => {
    // Si dependiera de que monte otro componente, un tropiezo de red se llevaria
    // por delante toda la carga de pagina
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    respuestas.push(() => Promise.reject(new Error('sin red')), usuario());

    await consultaLaSesion();
    await consultaLaSesion();          // deja programado el reintento
    expect(peticiones).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(ESPERA_TRAS_FALLO_MS + 50);

    expect(peticiones).toHaveLength(2);
    vi.useRealTimers();
  });

  it('pero tampoco se reintenta a lo loco: hay una espera', async () => {
    // Con el backend caido, cada componente que montara abriria la suya —los
    // guardias redirigen, las pantallas se montan— y saldria una peticion por
    // componente, que es el abanico que esto vino a quitar
    vi.spyOn(console, 'error').mockImplementation(() => {});
    respuestas.push(() => Promise.reject(new Error('sin red')));

    await consultaLaSesion();
    await consultaLaSesion();
    await consultaLaSesion();

    expect(peticiones).toHaveLength(1);
  });

  it('refrescar no levanta `cargando`, que desmontaria media aplicación', async () => {
    // `ProtectedRoute` y `RoleGuard` desmontan a sus hijos mientras eso este en
    // alto: guardar el perfil desmontaria el formulario a media faena
    respuestas.push(usuario(), usuario('u-2'));
    await consultaLaSesion();

    const refresco = consultaLaSesion({ forzar: true });
    expect(loQueHaySobreLaSesion().cargando).toBe(false);
    expect(loQueHaySobreLaSesion().refrescando).toBe(true);

    await refresco;
    expect(loQueHaySobreLaSesion().refrescando).toBe(false);
  });

  it('no queda ninguna revalidación al volver al frente', () => {
    // Se retiro a proposito: pasaba por el interceptor con el access caducado, y
    // un refresco que falla sin respuesta acaba en cierre de sesion con
    // redireccion dura. Volver a la aplicacion con mala cobertura podia echar a
    // alguien de la pantalla de anotacion en mitad de una vuelta
    const fuente = readFileSync(resolve(process.cwd(), 'src/services/sesionCompartida.js'), 'utf8');

    expect(fuente).not.toContain("addEventListener('visibilitychange'");
  });

  it('un refresco publica un objeto NUEVO, aunque sea la misma persona', async () => {
    // Se probo a conservar el de antes cuando el contenido coincidia, para no
    // relanzar los cuatro cargadores del panel. Rompia un contrato escrito en
    // `useEditProfile`: ese formulario se re-sincroniza con `useEffect([user])`,
    // asi que pulsar «Actualizar datos» sobre datos que no han cambiado dejaba
    // en pantalla lo escrito sin guardar como si viniera del servidor
    respuestas.push(usuario('u-1'), usuario('u-1'));
    const primera = await consultaLaSesion();

    const tras = await consultaLaSesion({ forzar: true });

    expect(tras).toEqual(primera);
    expect(tras).not.toBe(primera);
  });

  it('la instantánea es la MISMA mientras no cambie nada', () => {
    // `useSyncExternalStore` compara por identidad: un objeto nuevo en cada
    // lectura dejaria la aplicacion repintando sin parar
    expect(loQueHaySobreLaSesion()).toBe(loQueHaySobreLaSesion());
  });
});
