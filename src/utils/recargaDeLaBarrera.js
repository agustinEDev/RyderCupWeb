/**
 * La marca de «ya recargué» de `LazyLoadErrorBoundary` y de
 * `recargaPorTrozoViejo` (revisor en el Kind y /code-review, 24-25 oct 2026).
 *
 * Se apunta al recargar y se borra cuando una pantalla carga bien
 * (`lazyWithRetry`): tras la recarga, si la pantalla vuelve a fallar, sale el
 * aviso, tarde lo que tarde el fallo; si carga, la siguiente actualización
 * vuelve a poder recargar sola. Antes `App` la borraba al montar, antes de que
 * el trozo volviera a fallar, y una pantalla que fallaba siempre recargaba sin
 * fin. Borrarla al cambiar de página llegaba tarde (React Router navega en
 * transición), y una marca de 30 s volvía al bucle con poca señal.
 *
 * Sin almacenamiento no se puede apuntar, y recargar sin apuntarlo podría no
 * acabar nunca: no se recarga y sale el aviso, con su botón (Agustín).
 */
export const CLAVE_DE_LA_BARRERA = 'lazy_load_error_reloaded';
// Si la recarga no llega (la aplicación se fue a segundo plano), el aviso en
// vez de una pantalla en blanco para siempre
export const ESPERA_A_LA_RECARGA_MS = 10_000;

/** Si ya se recargó y aún no ha cargado ninguna pantalla; `null` si no se puede leer. */
export const yaRecargo = (almacen = globalThis.sessionStorage) => {
  try {
    return almacen.getItem(CLAVE_DE_LA_BARRERA) !== null;
  } catch {
    return null;
  }
};

/** Apunta la recarga; `false` si no se pudo. */
export const apuntarLaRecarga = (almacen = globalThis.sessionStorage) => {
  try {
    almacen.setItem(CLAVE_DE_LA_BARRERA, 'true');
    return true;
  } catch {
    return false;
  }
};

/** La olvida: una pantalla cargó bien, o el botón del aviso recarga a mano. */
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
