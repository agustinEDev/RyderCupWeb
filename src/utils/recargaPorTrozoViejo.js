/**
 * Cuando una pantalla diferida no carga porque la página sigue con un build
 * viejo, recargar una vez (Agustín, 24 oct 2026; Sentry RYDERCUP-FRONTEND-23).
 *
 * Pasa en la aplicación instalada: entra un service worker nuevo con la
 * aplicación en segundo plano, la recarga de `serviceWorkerRegistration.js` no
 * llega a dispararse y la página sigue con el build viejo. Sus trozos diferidos
 * ya no están en la caché, y sin cobertura no cargan. Recargar trae el build
 * nuevo, que sí está entero en la caché: funciona también sin conexión. Lo
 * anotado sin conexión no se pierde, porque la cola vive en el móvil.
 *
 * - Solo si la página es de un build viejo: la marca `app-build` de la página
 *   no es la del `index.html` que guarda el service worker. Se mira al
 *   arrancar, al volver a primer plano y al cambiar de service worker, porque
 *   el aviso de Vite hay que contestarlo en el acto. Un fallo de red con el
 *   build al día sigue su camino: `lazyWithRetry` reintenta a los 1,5 s.
 * - Solo con un service worker controlando: sin él, recargar sin red dejaría
 *   la página de error del navegador.
 * - Una sola recarga: como mucho una cada 30 s, y apunta también la de
 *   `LazyLoadErrorBoundary` para que esa no haga otra. Si vuelve a fallar, el
 *   error sale como siempre y la pantalla dice que no se pudo cargar.
 *
 * Evitado el error, el `import()` acaba sin módulo y React lanza otro antes de
 * que la recarga se lleve la página: `recargandoPorTrozoViejo()` deja a las
 * barreras de error y a Sentry no tomarlo por un fallo. Se apaga sola si la
 * recarga no llega.
 */
import { apuntarLaRecarga, recienRecargada, ESPERA_ENTRE_RECARGAS_MS } from './recargaDeLaBarrera';

export { ESPERA_ENTRE_RECARGAS_MS };
export const OLVIDAR_LA_RECARGA_MS = 10_000;

const CLAVE = 'rcf-recarga-por-trozo-viejo';
const MARCA = /<meta\s+name="app-build"\s+content="([^"]*)"/i;

let recargando = false;

/** Si la página se está recargando por un trozo viejo: lo que falle ya no cuenta. */
export const recargandoPorTrozoViejo = () => recargando;

/** La marca del build de un HTML, o null si no la trae. */
export const marcaDelBuild = (html) => MARCA.exec(html ?? '')?.[1] ?? null;

/** La última recarga, o null si no hay ninguna apuntada (o no se puede leer). */
const leer = (almacen) => {
  try {
    const guardada = almacen.getItem(CLAVE);
    return guardada === null ? null : Number(guardada);
  } catch {
    return null;
  }
};

const apuntar = (almacen, instante) => {
  try {
    almacen.setItem(CLAVE, String(instante));
  } catch {
    // Sin almacenamiento (navegación privada) se recarga igual
  }
  // La de `LazyLoadErrorBoundary`, con la misma hora: no recarga otra vez
  apuntarLaRecarga(almacen, instante);
};

export function instalarRecargaPorTrozoViejo({
  ventana = globalThis.window,
  documento = globalThis.document,
  almacen = globalThis.sessionStorage,
  cachesApi = globalThis.caches,
  ahora = Date.now,
  programar = globalThis.setTimeout,
} = {}) {
  const buildQueCorre = documento?.querySelector?.('meta[name="app-build"]')?.getAttribute('content') ?? null;
  let esViejo = false;

  const comprobar = async () => {
    if (!buildQueCorre || !cachesApi?.match) return;
    try {
      const guardado = await cachesApi.match('/index.html', { ignoreSearch: true });
      const marca = guardado ? marcaDelBuild(await guardado.text()) : null;
      esViejo = marca !== null && marca !== buildQueCorre;
    } catch {
      // Sin caché que leer no se sabe: se deja como estaba
    }
  };

  ventana.addEventListener('vite:preloadError', (evento) => {
    if (!esViejo || !ventana.navigator?.serviceWorker?.controller) return;
    const instante = ahora();
    if (recienRecargada(leer(almacen), instante)) return;
    apuntar(almacen, instante);
    recargando = true;
    // Si la recarga no llega (la aplicación se fue a segundo plano), lo que
    // falle después vuelve a contar
    programar(() => {
      recargando = false;
    }, OLVIDAR_LA_RECARGA_MS);
    evento.preventDefault();
    ventana.location.reload();
  });

  documento?.addEventListener?.('visibilitychange', () => {
    if (documento.visibilityState === 'visible') comprobar();
  });
  ventana.navigator?.serviceWorker?.addEventListener?.('controllerchange', comprobar);
  return comprobar();
}

/**
 * El eco del `import()` cancelado: lo que React lanza al quedarse sin módulo.
 * Solo eso se calla mientras se recarga, no cualquier error.
 */
export const esElEcoDeLaRecarga = (error) => {
  const mensaje = String(error?.message ?? error ?? '');
  return (
    recargando &&
    (/default/.test(mensaje) ||
      /Importing a module script failed/.test(mensaje) ||
      /dynamically imported module/.test(mensaje))
  );
};
