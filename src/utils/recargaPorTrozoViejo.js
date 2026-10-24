/**
 * Cuando una pantalla diferida no carga, recargar una vez (Agustín, 24 oct
 * 2026; Sentry RYDERCUP-FRONTEND-23).
 *
 * Pasa en la aplicación instalada: entra un service worker nuevo con la
 * aplicación en segundo plano, la recarga de `serviceWorkerRegistration.js` no
 * llega a dispararse y la página sigue con el build viejo. Sus trozos diferidos
 * ya no están en la caché, y sin cobertura no cargan. Recargar trae el build
 * nuevo, que sí está entero en la caché: funciona también sin conexión. Lo
 * anotado sin conexión no se pierde, porque la cola vive en el móvil.
 *
 * - Solo con un service worker controlando: sin él, recargar sin red dejaría
 *   la página de error del navegador.
 * - Como mucho una vez cada 30 s: si vuelve a fallar, el error sale como
 *   siempre y la pantalla dice que no se pudo cargar.
 * - También salta si lo que falla es la hoja de estilos del trozo: Vite avisa
 *   igual, y recargar lo arregla del mismo modo.
 *
 * Evitado el error, el `import()` acaba sin módulo y React lanza otro antes de
 * que la recarga se lleve la página: `recargandoPorTrozoViejo()` deja a las
 * barreras de error y a Sentry no pintarlo ni mandarlo (revisión, 24 oct).
 * `LazyLoadErrorBoundary` tiene su propia recarga, una por sesión, para las
 * pantallas de las rutas: esta la adelanta y cubre también el mapa, que no
 * recarga.
 */
export const ESPERA_ENTRE_RECARGAS_MS = 30_000;

const CLAVE = 'rcf-recarga-por-trozo-viejo';

let recargando = false;

/** Si la página se está recargando por un trozo viejo: lo que falle ya no cuenta. */
export const recargandoPorTrozoViejo = () => recargando;

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
};

export function instalarRecargaPorTrozoViejo({
  ventana = globalThis.window,
  almacen = globalThis.sessionStorage,
  ahora = Date.now,
} = {}) {
  ventana.addEventListener('vite:preloadError', (evento) => {
    if (!ventana.navigator?.serviceWorker?.controller) return;
    const instante = ahora();
    const ultima = leer(almacen);
    if (ultima !== null && instante - ultima < ESPERA_ENTRE_RECARGAS_MS) return;
    apuntar(almacen, instante);
    recargando = true;
    evento.preventDefault();
    ventana.location.reload();
  });
}
