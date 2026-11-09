import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMemoryRouter } from 'react-router';

/**
 * Con los Términos pendientes, el 403 lleva a aceptarlos y luego se vuelve a la
 * página a la que se IBA, no a la de partida. Con el router de datos, la llamada
 * de una pantalla con `loader` sale ANTES de que cambie la dirección: la página
 * de destino es la navegación en curso del router, no `location`.
 *
 * | Caso                                                   | Vuelta (`from`)                |
 * |--------------------------------------------------------|--------------------------------|
 * | desde el panel, ir a Torneos (su loader da el 403)     | /competitions                  |
 * | lo mismo con query                                     | /competitions?tab=mias         |
 * | desde una página pública, ir a una protegida           | la protegida (se lleva a aceptar) |
 * | recargar en una página (sin navegación en curso)       | la página recargada, como hoy  |
 * | ir a una ruta que se puede ver con los Términos pendientes | no se lleva a aceptar      |
 * | el destino da el 403 otra vez tras aceptar (desacuerdo)| no se redirige más             |
 * | el router de la app (creaElRouterDeLaAplicacion)       | se apunta solo                 |
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
      { path: destinoConLoader, element: null, loader: () => (llevaAAceptarLosTerminos(), null) },
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

  it('el router de la aplicación se apunta solo al crearlo', async () => {
    const { creaElRouterDeLaAplicacion } = await import('./routerDeLaAplicacion');
    const { destinoDeLaNavegacion } = await import('./navegacionEnCurso');
    let visto = null;
    const router = creaElRouterDeLaAplicacion([
      { path: '/', element: null },
      { path: '/competitions', element: null, loader: () => ((visto = destinoDeLaNavegacion()), null) },
    ]);

    await router.navigate('/competitions?tab=mias');

    expect(visto).toEqual({ pathname: '/competitions', search: '?tab=mias' });
    router.dispose();
  });
});
