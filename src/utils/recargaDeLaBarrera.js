/**
 * La nota de «ya recargué» de `LazyLoadErrorBoundary` y de
 * `recargaPorTrozoViejo` (revisiones del 24-25 oct 2026).
 *
 * Guarda los pares versión (el `app-build` de la página) y página donde se
 * recargó, los 20 últimos. Se puede recargar si el par aún no está. Un par no
 * pisa a otro: cada recarga suma uno nuevo, así que no puede haber bucle,
 * tampoco entre la barrera y `recargaPorTrozoViejo`, que apuntan versiones
 * distintas para la misma página. Tras un despliegue la versión ya es otra y
 * se puede volver a recargar. Pasar de 20 pide que el usuario vaya a páginas
 * nuevas: nunca es una recarga sola.
 *
 * Antes era un `'true'` y todo dependía de cuándo borrarlo: al montar (antes
 * de que el trozo volviera a fallar: bucle), al cambiar de página (llegaba
 * tarde, React Router navega en transición), a los 30 s (con poca señal volvía
 * el bucle) o al cargar una pantalla (la borraba otra, no la que falló).
 *
 * Sin almacenamiento no se puede apuntar: no se recarga y sale el aviso, con
 * su botón (Agustín).
 */
export const CLAVE_DE_LA_BARRERA = 'lazy_load_error_reloaded';
// Si la recarga no llega (la aplicación se fue a segundo plano), el aviso en
// vez de una pantalla en blanco para siempre
export const ESPERA_A_LA_RECARGA_MS = 10_000;
// Basta con los últimos: cada uno es una recarga de verdad
const PARES_QUE_SE_GUARDAN = 20;

/** La versión de la página, o '' sin ella (en desarrollo). */
export const buildDeLaPagina = (documento = globalThis.document) =>
  documento?.querySelector?.('meta[name="app-build"]')?.getAttribute('content') ?? '';

const rutaDeLaPagina = () => globalThis.location?.pathname ?? '';

/** Los pares guardados. La `'true'` de antes, o algo ilegible, no cuenta. */
const leer = (almacen) => {
  const guardada = almacen.getItem(CLAVE_DE_LA_BARRERA);
  try {
    const recargas = JSON.parse(guardada)?.recargas;
    return Array.isArray(recargas) ? recargas.filter((par) => Array.isArray(par) && par.length === 2) : [];
  } catch {
    return [];
  }
};

const esElPar = (build, ruta) => ([b, r]) => b === build && r === ruta;

/**
 * Si se puede recargar con esta versión en esta página: `true`, `false` si ya
 * se hizo, o `null` si no se puede leer el almacenamiento.
 */
export const puedeRecargar = ({
  build = buildDeLaPagina(),
  ruta = rutaDeLaPagina(),
  almacen = globalThis.sessionStorage,
} = {}) => {
  try {
    return !leer(almacen).some(esElPar(build, ruta));
  } catch {
    return null;
  }
};

/** Apunta la recarga; `false` si no se pudo. */
export const apuntarLaRecarga = ({
  build = buildDeLaPagina(),
  ruta = rutaDeLaPagina(),
  almacen = globalThis.sessionStorage,
} = {}) => {
  try {
    const recargas = leer(almacen).filter((par) => !esElPar(build, ruta)(par));
    recargas.push([build, ruta]);
    almacen.setItem(CLAVE_DE_LA_BARRERA, JSON.stringify({ recargas: recargas.slice(-PARES_QUE_SE_GUARDAN) }));
    // Releída: un almacén que acepta la nota sin guardarla traería el bucle
    return leer(almacen).some(esElPar(build, ruta));
  } catch {
    return false;
  }
};

/** La olvida: el botón del aviso recarga a mano y la siguiente vuelve a contar. */
export const olvidarLaRecarga = (almacen = globalThis.sessionStorage) => {
  try {
    almacen.removeItem(CLAVE_DE_LA_BARRERA);
  } catch {
    // Sin almacenamiento no hay nada que olvidar
  }
};

/**
 * Sin red y sin service worker, recargar deja la página de error del navegador
 * en vez del aviso de la aplicación: entonces no.
 */
export const recargarTraeLaPagina = (navegador = globalThis.navigator) =>
  navegador?.onLine !== false || Boolean(navegador?.serviceWorker?.controller);
