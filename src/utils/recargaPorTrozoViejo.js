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
 * - Una sola recarga: apunta en la nota de `LazyLoadErrorBoundary`
 *   (`recargaDeLaBarrera`) la versión a la que va y la página. Si esa versión
 *   vuelve a fallar en esa página, el error sale como siempre y la pantalla
 *   dice que no se pudo cargar. Sin almacenamiento no se puede apuntar: no
 *   recarga, como la barrera (si la recarga no cambiara de versión, no
 *   acabaría nunca).
 *
 * Evitado el error, el `import()` acaba sin módulo y React lanza otro antes de
 * que la recarga se lleve la página: `recargandoPorTrozoViejo()` deja a las
 * barreras de error y a Sentry no tomarlo por un fallo. Se apaga sola si la
 * recarga no llega.
 */
import { apuntarLaRecarga, buildDeLaPagina, puedeRecargar } from './recargaDeLaBarrera';

export const OLVIDAR_LA_RECARGA_MS = 10_000;

const MARCA = /<meta\s+name="app-build"\s+content="([^"]*)"/i;

let recargando = false;

/** Si la página se está recargando por un trozo viejo: lo que falle ya no cuenta. */
export const recargandoPorTrozoViejo = () => recargando;

/** La marca del build de un HTML, o null si no la trae. */
export const marcaDelBuild = (html) => MARCA.exec(html ?? '')?.[1] ?? null;

export function instalarRecargaPorTrozoViejo({
  ventana = globalThis.window,
  documento = globalThis.document,
  almacen,
  cachesApi = globalThis.caches,
  programar = globalThis.setTimeout,
} = {}) {
  // Sin la marca (en desarrollo) no se sabe si es vieja: no hace nada
  const buildQueCorre = buildDeLaPagina(documento) || null;
  let esViejo = false;
  // La versión que guarda el service worker: a la que lleva la recarga
  let buildNuevo = null;

  const comprobar = async () => {
    if (!buildQueCorre || !cachesApi?.match) return;
    try {
      const guardado = await cachesApi.match('/index.html', { ignoreSearch: true });
      const marca = guardado ? marcaDelBuild(await guardado.text()) : null;
      esViejo = marca !== null && marca !== buildQueCorre;
      buildNuevo = marca;
    } catch {
      // Sin caché que leer no se sabe: se deja como estaba
    }
  };

  ventana.addEventListener('vite:preloadError', (evento) => {
    if (!esViejo || !ventana.navigator?.serviceWorker?.controller) return;
    // Ya recargó a esa versión en esta página: el error sigue su camino
    const nota = { build: buildNuevo, ruta: ventana.location?.pathname ?? '', almacen };
    if (puedeRecargar(nota) !== true || !apuntarLaRecarga(nota)) return;
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
