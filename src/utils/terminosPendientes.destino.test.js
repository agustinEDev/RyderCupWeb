import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMemoryRouter } from 'react-router';

/**
 * Con los Términos pendientes, el 403 lleva a aceptarlos y luego se vuelve a la
 * página a la que se IBA, no a la de partida. Con el router de datos, la llamada
 * de una pantalla con `loader` sale ANTES de que cambie la dirección: la página
 * de destino es la navegación en curso del router, no `location`.
 *
 * Pero solo si el 403 es de una petición del destino: una que salió de la página
 * actual (un sondeo) vuelve a la página actual. Sin forma de saber qué código
 * lanzó cada petición, se toma como del destino la que empezó DESPUÉS de iniciarse
 * la navegación, y solo si el destino tiene `loader` (10 nov 2026).
 *
 * | Caso                                                   | Vuelta (`from`)                |
 * |--------------------------------------------------------|--------------------------------|
 * | desde el panel, ir a Torneos (su loader da el 403)     | /competitions                  |
 * | lo mismo con query                                     | /competitions?tab=mias         |
 * | desde una página pública, ir a una protegida           | la protegida (se lleva a aceptar) |
 * | recargar en una página (sin navegación en curso)       | la página recargada, como hoy  |
 * | ir a una ruta que se puede ver con los Términos pendientes | no se lleva a aceptar      |
 * | una llamada de fondo de la página protegida da el 403 mientras se va a una pública o legal | no se lleva a aceptar: se va a leer lo legal |
 * | el destino da el 403 otra vez tras aceptar (desacuerdo)| no se redirige más             |
 * | una petición de la página actual, empezada ANTES de navegar a Torneos, da el 403 | la página actual |
 * | la petición del loader de Torneos (empezada después) da el 403 | /competitions        |
 * | ir a un destino SIN loader y una petición da el 403    | la página actual               |
 * | el router de la app (App.jsx, en un efecto)             | lo fija App.routerDeDatos (R3c) |
 */
const { llevaAAceptarLosTerminos, olvidaLaRedireccionATerminos } = await import('./terminosPendientes');
const { apuntaElRouterDeLaAplicacion } = await import('./navegacionEnCurso');

const enUna = (pathname, search = '') => {
  const assign = vi.fn();
  vi.stubGlobal('location', { pathname, search, hash: '', origin: 'http://localhost', assign });
  return assign;
};

/** Un router con una pantalla cuyo loader hace la llamada que da el 403. */
const routerDesde = (inicio, destinoConLoader) => {
  const router = createMemoryRouter(
    [
      { path: '/', element: null },
      { path: '/dashboard', element: null },
      { path: '/accept-terms', element: null },
      // La petición del loader empieza al llamarlo, después de iniciarse la navegación
      { path: destinoConLoader, element: null, loader: () => (llevaAAceptarLosTerminos({ inicio: globalThis.performance.now() }), null) },
    ],
    { initialEntries: [inicio] }
  );
  apuntaElRouterDeLaAplicacion(router);
  return router;
};

describe('Términos pendientes: volver a la página a la que se iba', () => {
  beforeEach(() => {
    globalThis.sessionStorage.clear();
    olvidaLaRedireccionATerminos();
    apuntaElRouterDeLaAplicacion(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('desde el panel, ir a Torneos: vuelve a Torneos', async () => {
    const assign = enUna('/dashboard');
    const router = routerDesde('/dashboard', '/competitions');

    await router.navigate('/competitions');

    expect(assign).toHaveBeenCalledWith('/accept-terms?from=%2Fcompetitions');
  });

  it('con query, se conserva', async () => {
    const assign = enUna('/dashboard');
    const router = routerDesde('/dashboard', '/competitions');

    await router.navigate('/competitions?tab=mias');

    expect(assign).toHaveBeenCalledWith('/accept-terms?from=%2Fcompetitions%3Ftab%3Dmias');
  });

  it('desde una página pública, ir a una protegida: se lleva a aceptar y vuelve a la protegida', async () => {
    const assign = enUna('/');
    const router = routerDesde('/', '/competitions');

    await router.navigate('/competitions');

    expect(assign).toHaveBeenCalledWith('/accept-terms?from=%2Fcompetitions');
  });

  it('recargar en una página, sin navegación en curso: vuelve a ella, como hoy', () => {
    const assign = enUna('/competitions/7', '?tab=agenda');
    routerDesde('/competitions/7', '/otra');

    llevaAAceptarLosTerminos();

    expect(assign).toHaveBeenCalledWith('/accept-terms?from=%2Fcompetitions%2F7%3Ftab%3Dagenda');
  });

  it('ir a una ruta que se puede ver con los Términos pendientes: no se lleva a aceptar', async () => {
    const assign = enUna('/dashboard');
    const router = routerDesde('/dashboard', '/profile/devices');

    await router.navigate('/profile/devices');

    expect(assign).not.toHaveBeenCalled();
  });

  it.each([['/terms'], ['/privacy'], ['/cookies'], ['/']])(
    'una llamada de fondo de la página protegida da el 403 mientras se va a %s: no lleva a aceptar',
    async (destino) => {
      const assign = enUna('/competitions/7');
      const router = createMemoryRouter(
        [
          { path: '/competitions/7', element: null },
          // La página de destino, pública o legal, tarda en cargar: mientras, sigue en curso
          { path: destino, element: null, loader: () => new Promise((listo) => setTimeout(() => listo(null), 20)) },
        ],
        { initialEntries: ['/competitions/7'] }
      );
      apuntaElRouterDeLaAplicacion(router);

      const navegacion = router.navigate(destino);
      // La llamada de fondo (un sondeo de la página protegida) da el 403 ahora
      llevaAAceptarLosTerminos();
      await navegacion;

      expect(assign).not.toHaveBeenCalled();
    }
  );

  it('una petición de la página actual, empezada antes de navegar a Torneos, vuelve a la página actual', async () => {
    const assign = enUna('/competitions/7');
    const router = createMemoryRouter(
      [
        { path: '/competitions/7', element: null },
        // Torneos tarda en cargar: mientras, la navegación sigue en curso
        { path: '/competitions', element: null, loader: () => new Promise((listo) => setTimeout(() => listo(null), 20)) },
      ],
      { initialEntries: ['/competitions/7'] }
    );
    apuntaElRouterDeLaAplicacion(router);
    // Un sondeo de la página actual sale ahora…
    const inicioDelSondeo = globalThis.performance.now();

    const navegacion = router.navigate('/competitions');
    // …y su 403 llega con Torneos cargando
    llevaAAceptarLosTerminos({ inicio: inicioDelSondeo });
    await navegacion;

    expect(assign).toHaveBeenCalledWith('/accept-terms?from=%2Fcompetitions%2F7');
  });

  it('ir a un destino sin loader: una petición que da el 403 es de la página actual', async () => {
    const assign = enUna('/dashboard');
    let sigue;
    const router = createMemoryRouter(
      [
        { path: '/dashboard', element: null },
        // Sin loader, pero cargando su pantalla (lazy): la navegación sigue en curso
        { path: '/friends', lazy: () => new Promise((listo) => { sigue = () => listo({ element: null }); }) },
      ],
      { initialEntries: ['/dashboard'] }
    );
    apuntaElRouterDeLaAplicacion(router);

    const navegacion = router.navigate('/friends');
    llevaAAceptarLosTerminos({ inicio: globalThis.performance.now() });
    sigue();
    await navegacion;

    expect(assign).toHaveBeenCalledWith('/accept-terms?from=%2Fdashboard');
  });

  it('si el destino vuelve a dar el 403 tras aceptar, es un desacuerdo: no se redirige más', async () => {
    const assign = enUna('/dashboard');
    let router = routerDesde('/dashboard', '/competitions');
    await router.navigate('/competitions');
    // Se recarga la aplicación (lo de la carga se pierde, sessionStorage no) y se repite
    olvidaLaRedireccionATerminos();
    router = routerDesde('/dashboard', '/competitions');

    await router.navigate('/competitions');

    expect(assign).toHaveBeenCalledTimes(1);
  });
});
