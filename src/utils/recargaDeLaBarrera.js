/**
 * La nota de «ya recargué» de `LazyLoadErrorBoundary` y de
 * `recargaPorTrozoViejo` (revisiones del 24-25 oct 2026).
 *
 * Guarda la versión con la que se recargó (el `app-build` de la página) y las
 * páginas donde se hizo. Se puede recargar si la versión es otra, o si es la
 * misma en una página donde aún no se recargó. No se borra nunca: cada recarga
 * tiene que cambiar de versión o de página, así que no puede haber bucle, y
 * tras un despliegue la versión ya es otra.
 *
 * Antes era un `'true'` y todo dependía de cuándo borrarlo: al montar (antes
 * de que el trozo volviera a fallar: bucle), al cambiar de página (llegaba
 * tarde, React Router navega en transición), a los 30 s (con poca señal volvía
 * el bucle) o al cargar una pantalla (la borraba otra, no la que falló).
 *
 * Sin almacenamiento no se puede apuntar: la barrera no recarga y sale el
 * aviso, con su botón (Agustín).
 */
export const CLAVE_DE_LA_BARRERA = 'lazy_load_error_reloaded';
// Si la recarga no llega (la aplicación se fue a segundo plano), el aviso en
// vez de una pantalla en blanco para siempre
export const ESPERA_A_LA_RECARGA_MS = 10_000;

/** La versión de la página, o '' sin ella (en desarrollo). */
export const buildDeLaPagina = (documento = globalThis.document) =>
  documento?.querySelector?.('meta[name="app-build"]')?.getAttribute('content') ?? '';

const rutaDeLaPagina = () => globalThis.location?.pathname ?? '';

/** La nota guardada, o null. La `'true'` de antes, o algo ilegible, no cuenta. */
const leer = (almacen) => {
  const guardada = almacen.getItem(CLAVE_DE_LA_BARRERA);
  try {
    const nota = JSON.parse(guardada);
    return typeof nota?.build === 'string' && Array.isArray(nota.rutas) ? nota : null;
  } catch {
    return null;
  }
};

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
    const nota = leer(almacen);
    return nota === null || nota.build !== build || !nota.rutas.includes(ruta);
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
    const nota = leer(almacen);
    const rutas = nota?.build === build ? nota.rutas.filter((r) => r !== ruta) : [];
    almacen.setItem(CLAVE_DE_LA_BARRERA, JSON.stringify({ build, rutas: [...rutas, ruta] }));
    return true;
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
