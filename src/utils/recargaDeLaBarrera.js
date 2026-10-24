/**
 * La marca de «ya recargué» de `LazyLoadErrorBoundary`: la hora de la recarga,
 * que solo cuenta 30 s (revisor en el Kind, 24 oct 2026).
 *
 * Era un `'true'` que `App` borraba al montar, antes de que el trozo volviera
 * a fallar: una pantalla que fallaba siempre recargaba sin fin. Borrarla solo
 * al cambiar de página tampoco bastaba: React Router navega en transición y el
 * efecto llegaba tarde. Con la hora no hay que borrarla en ningún sitio: tras
 * la recarga, si vuelve a fallar, sale el aviso; pasado un rato (otro
 * despliegue), vuelve a poder recargar.
 *
 * Sin almacenamiento no se puede apuntar, y recargar sin apuntarlo podría no
 * acabar nunca: entonces no recarga y sale el aviso, con su botón (Agustín).
 */
export const CLAVE_DE_LA_BARRERA = 'lazy_load_error_reloaded';
export const ESPERA_ENTRE_RECARGAS_MS = 30_000;

/** Una recarga apuntada hace menos de 30 s; con el reloj hacia atrás, no cuenta. */
export const recienRecargada = (ultima, instante) =>
  ultima !== null && instante >= ultima && instante - ultima < ESPERA_ENTRE_RECARGAS_MS;

/**
 * Si la barrera puede recargar ahora: `true`, `false` si ya recargó hace poco,
 * o `null` si no se puede leer el almacenamiento.
 */
export const puedeRecargar = (almacen = globalThis.sessionStorage, instante = Date.now()) => {
  try {
    const guardada = almacen.getItem(CLAVE_DE_LA_BARRERA);
    // La `'true'` de antes, o algo ilegible, da NaN: no es una hora y no cuenta
    return !recienRecargada(guardada === null ? null : Number(guardada), instante);
  } catch {
    return null;
  }
};

/** Apunta la recarga; `false` si no se pudo. */
export const apuntarLaRecarga = (almacen = globalThis.sessionStorage, instante = Date.now()) => {
  try {
    almacen.setItem(CLAVE_DE_LA_BARRERA, String(instante));
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
