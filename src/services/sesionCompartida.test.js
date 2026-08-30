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

  it('un fallo de red se anota como error, y sigue sin saberse', async () => {
    // `cargando` se queda ARRIBA mientras haya un reintento en camino: para
    // quien mira, esto es «todavia no se sabe», no «no hay sesion». Lo segundo
    // hacia que los guardias mandaran al formulario sin llegar a preguntar
    vi.spyOn(console, 'error').mockImplementation(() => {});
    respuestas.push(() => Promise.reject(new Error('sin red')));

    const leido = await consultaLaSesion();

    expect(leido).toBeNull();
    expect(loQueHaySobreLaSesion().error).toBe('sin red');
    expect(loQueHaySobreLaSesion().cargando).toBe(true);
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

  it('reintenta sola aunque NO vuelva a llamarla nadie', async () => {
    // En un arranque corriente todos los consumidores han preguntado ya y
    // comparten la misma peticion, asi que cuando falla no queda nadie que la
    // rearme. Si el reintento dependiera de que llegue otra llamada, la pagina
    // se quedaba sin sesion hasta recargar
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    respuestas.push(() => Promise.reject(new Error('sin red')), usuario());

    await consultaLaSesion();          // una sola, y nadie mas pregunta
    expect(peticiones).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(ESPERA_TRAS_FALLO_MS + 50);

    expect(peticiones).toHaveLength(2);
    expect(loQueHaySobreLaSesion().user).toEqual({ id: 'u-1' });
    vi.useRealTimers();
  });

  it('con el backend caido no reintenta para siempre', async () => {
    // Cada tres segundos por pestaña abierta, el resto del dia, es peor que
    // rendirse: la espera crece y hay un tope
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    for (let i = 0; i < 10; i += 1) respuestas.push(() => Promise.reject(new Error('sin red')));

    await consultaLaSesion();
    await vi.advanceTimersByTimeAsync(10 * 60 * 1000);

    expect(peticiones.length).toBeLessThanOrEqual(4);
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

/**
 * LA TABLA L — sin señal, la app no te echa (FE #524).
 *
 * Al agotar los reintentos, `cargando` bajaba con el usuario en nulo, y para
 * `ProtectedRoute` eso es «no has entrado»: al formulario de acceso, en mitad
 * del campo, con la sesión intacta. Y ahí ya no se puede anotar, que es justo
 * lo que hace falta cuando no hay cobertura.
 *
 * Así que quien confirma la sesión deja apuntado a quién pertenece, y si luego
 * no hay forma de preguntar, se sigue con eso. El servidor sigue mandando: la
 * primera petición que reciba dirá si vale o no.
 *
 *   caso                             | qué pasa
 *   ---------------------------------|-----------------------------------------
 *   el backend confirma              | se apunta quién eres
 *   sin señal, con eso apuntado      | se sigue con ello: se puede anotar
 *   sin señal, sin nada apuntado     | al formulario: no hay nada que recordar
 *   el backend dice 401              | se borra lo apuntado
 *   se cierra sesión                 | se borra lo apuntado
 *   sin confirmar, no hay privilegios| `is_admin` no se hereda de lo apuntado
 */
describe('sesionCompartida · sin señal no se echa a nadie (FE #524)', () => {
  const RECUERDO = 'rydercup-sesion-conocida';
  const sinRed = () => Promise.reject(new TypeError('Failed to fetch'));

  // Este fichero corre sin navegador, así que el almacenamiento se pone aquí:
  // el módulo lo envuelve en try/catch, y sin esto los tests pasarían por no
  // haber almacenamiento en vez de por lo que dicen comprobar
  beforeEach(() => {
    const guardado = new Map();
    globalThis.localStorage = {
      getItem: (k) => (guardado.has(k) ? guardado.get(k) : null),
      setItem: (k, v) => guardado.set(k, String(v)),
      removeItem: (k) => guardado.delete(k),
    };
    localStorage.removeItem(RECUERDO);
    reiniciaLaSesionCompartida();
    peticiones.length = 0;
    respuestas.length = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // Los reintentos son tres, con espera creciente: al agotarlos es cuando el
  // estado bajaba a «resuelto y sin usuario»
  const agotaLosReintentos = async () => {
    vi.useFakeTimers();
    for (let i = 0; i < 5; i += 1) respuestas.push(sinRed);
    const p = consultaLaSesion();
    await vi.advanceTimersByTimeAsync(60_000);
    await p;
  };

  it('al confirmar la sesión apunta a quién pertenece', async () => {
    respuestas.push({ ok: true, status: 200, json: async () => ({ id: 'u-1', email: 'a@b.c', is_admin: false }) });

    await consultaLaSesion();

    expect(JSON.parse(localStorage.getItem(RECUERDO)).id).toBe('u-1');
  });

  it('sin señal sigue con lo apuntado, en vez de mandar al formulario', async () => {
    localStorage.setItem(RECUERDO, JSON.stringify({ id: 'u-1', email: 'a@b.c', is_admin: false }));

    await agotaLosReintentos();

    const estado = loQueHaySobreLaSesion();
    expect(estado.user?.id).toBe('u-1');
    expect(estado.cargando).toBe(false);
  });

  it('con lo apuntado se pinta al PRIMER fallo, sin esperar los reintentos', async () => {
    // Los reintentos van a 3, 6 y 12 segundos: esperarlos eran 21 segundos de
    // pantalla en blanco antes siquiera de pedir la partida —medido—, y es
    // justo el caso para el que se guarda la sesión (FE #529)
    vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem(RECUERDO, JSON.stringify({ id: 'u-1', email: 'a@b.c', is_admin: false }));
    respuestas.push(() => Promise.reject(new Error('sin red')));

    await consultaLaSesion();

    const estado = loQueHaySobreLaSesion();
    expect(estado.user?.id).toBe('u-1');
    expect(estado.cargando).toBe(false);
    // Y queda dicho que se sigue preguntando por detrás
    expect(estado.refrescando).toBe(true);
  });

  it('y lo que conteste el servidor manda sobre lo apuntado', async () => {
    // Lo apuntado solo tapa el hueco: la primera respuesta que llegue decide
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem(RECUERDO, JSON.stringify({ id: 'u-1', email: 'a@b.c', is_admin: false }));
    respuestas.push(() => Promise.reject(new Error('sin red')), usuario('u-2'));

    await consultaLaSesion();
    expect(loQueHaySobreLaSesion().user?.id).toBe('u-1');

    await vi.advanceTimersByTimeAsync(ESPERA_TRAS_FALLO_MS + 50);

    expect(loQueHaySobreLaSesion().user).toEqual({ id: 'u-2' });
    expect(loQueHaySobreLaSesion().refrescando).toBe(false);
    vi.useRealTimers();
  });

  it('confirmada la sesión, el reintento armado no dispara otra petición', async () => {
    // Desde que el reintento fuerza, uno huérfano abría una petición de más
    // —el abanico que este módulo existe para evitar— y de paso subía la
    // generación, con lo que un refresco en vuelo resolvía a nada
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem(RECUERDO, JSON.stringify({ id: 'u-1', email: 'a@b.c', is_admin: false }));
    respuestas.push(() => Promise.reject(new Error('sin red')), usuario('u-1'));

    await consultaLaSesion();            // falla y arma el reintento
    await consultaLaSesion({ forzar: true }); // vuelve la señal y alguien refresca
    expect(peticiones).toHaveLength(2);

    await vi.advanceTimersByTimeAsync(ESPERA_TRAS_FALLO_MS + 50);

    expect(peticiones).toHaveLength(2);
    vi.useRealTimers();
  });

  it('tras salir, los reintentos vuelven a contarse desde cero', async () => {
    // Un arranque sin cobertura que quemara los cuatro intentos dejaba el
    // contador arriba: el siguiente fallo se pasaba del tope y echaba al
    // formulario a la primera, sin un solo reintento
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await agotaLosReintentos();

    olvidaLaSesion();
    vi.useFakeTimers();
    // La cola es global y `agotaLosReintentos` deja restos: sin vaciarla, el
    // reintento consume una respuesta que no es la de este caso
    respuestas.length = 0;
    peticiones.length = 0;
    respuestas.push(() => Promise.reject(new Error('sin red')), usuario('u-1'));

    await consultaLaSesion();
    expect(peticiones).toHaveLength(1);

    // Lo que hay que ver es que QUEDA reintento: sin reiniciar el contador se
    // pasaba del tope y no se programaba ninguno
    await vi.advanceTimersByTimeAsync(ESPERA_TRAS_FALLO_MS + 50);

    expect(peticiones).toHaveLength(2);
    expect(loQueHaySobreLaSesion().user).toEqual({ id: 'u-1' });
    vi.useRealTimers();
  });

  it('un refresco corriente NO marca la sesión como sin confirmar', async () => {
    // `refrescando` se levanta en cualquier refresco de una sesión ya buena, así
    // que deducir de ahí «sin confirmar» bloqueaba la pantalla entera en cada
    // `refetch` —y durante los reintentos si ese refresco fallaba—
    respuestas.push(usuario('u-1'));
    await consultaLaSesion();
    expect(loQueHaySobreLaSesion().sinConfirmar).toBe(false);

    respuestas.push(usuario('u-1'));
    const enCurso = consultaLaSesion({ forzar: true });
    expect(loQueHaySobreLaSesion().refrescando).toBe(true);
    expect(loQueHaySobreLaSesion().sinConfirmar).toBe(false);

    await enCurso;
    expect(loQueHaySobreLaSesion().sinConfirmar).toBe(false);
  });

  it('lo que sale del apunte sí queda marcado, y deja de estarlo al confirmarse', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem(RECUERDO, JSON.stringify({ id: 'u-1', email: 'a@b.c', is_admin: false }));
    respuestas.length = 0;
    respuestas.push(() => Promise.reject(new Error('sin red')), usuario('u-1'));

    await consultaLaSesion();
    expect(loQueHaySobreLaSesion().sinConfirmar).toBe(true);

    await vi.advanceTimersByTimeAsync(ESPERA_TRAS_FALLO_MS + 50);

    expect(loQueHaySobreLaSesion().sinConfirmar).toBe(false);
    vi.useRealTimers();
  });

  it('sin señal y sin nada apuntado, al formulario como siempre', async () => {
    await agotaLosReintentos();

    const estado = loQueHaySobreLaSesion();
    expect(estado.user).toBeNull();
    expect(estado.cargando).toBe(false);
  });

  it('sin nada apuntado, un tropiezo no se guarda como respuesta', async () => {
    // Con esto por resuelto, quien montara después leería «aquí no hay sesión»
    // y no volvería a preguntar en toda la carga: un corte de red se llevaría
    // por delante la visita entera
    await agotaLosReintentos();
    peticiones.length = 0;
    // El helper deja fallos de sobra en la cola: si no se vacían, esta consulta
    // consumiría uno y el test pasaría por el motivo equivocado
    respuestas.length = 0;

    respuestas.push({ ok: true, status: 200, json: async () => ({ id: 'u-1' }) });
    await consultaLaSesion();

    expect(peticiones).toHaveLength(1);
    expect(loQueHaySobreLaSesion().user?.id).toBe('u-1');
  });

  it('sin confirmar no se heredan privilegios', async () => {
    // Lo apuntado vive en el dispositivo y se puede tocar. El panel lo defiende
    // el backend, pero enseñar sus botones sin poder confirmar nada sobra
    localStorage.setItem(RECUERDO, JSON.stringify({ id: 'u-1', email: 'a@b.c', is_admin: true }));

    await agotaLosReintentos();

    expect(loQueHaySobreLaSesion().user.is_admin).toBe(false);
  });

  it('un 401 borra lo apuntado: esa sesión ya no vale', async () => {
    localStorage.setItem(RECUERDO, JSON.stringify({ id: 'u-1' }));
    respuestas.push({ ok: false, status: 401 });

    await consultaLaSesion();

    expect(localStorage.getItem(RECUERDO)).toBeNull();
  });

  it('cerrar sesión borra lo apuntado', () => {
    localStorage.setItem(RECUERDO, JSON.stringify({ id: 'u-1' }));

    olvidaLaSesion();

    expect(localStorage.getItem(RECUERDO)).toBeNull();
  });
});
