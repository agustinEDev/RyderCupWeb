/**
 * Registro del service worker, con la parte que el registro por defecto no trae:
 * enterarse de que hay una versión nueva y recargar para usarla.
 *
 * El service worker que genera Workbox ya lleva `skipWaiting` y `clientsClaim`,
 * así que en cuanto se instala uno nuevo toma el control y **empieza a servir
 * los ficheros nuevos**. Pero la página que está abierta sigue ejecutando el
 * paquete viejo que ya tenía cargado, y sus trozos diferidos llevan un hash que
 * ya no existe: la siguiente pantalla que intente abrir falla.
 *
 * En el navegador el problema se disimula porque cada recarga dispara `load` y
 * vuelve a registrar. **En la aplicación instalada no**: cerrarla no mata la
 * instancia, al volver se reanuda sin pasar por `load`, y puede quedarse
 * indefinidamente con la versión antigua. Desinstalarla era la única salida.
 *
 * De ahí las dos piezas de aquí: preguntar por versiones nuevas cada vez que la
 * aplicación vuelve a primer plano, y recargar cuando el nuevo toma el mando.
 */

/** Evita registrar dos veces si el módulo se importa más de una vez. */
let yaRegistrado = false;

export function registerServiceWorker() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  if (yaRegistrado) return;
  yaRegistrado = true;

  // Sin controlador al arrancar, esta es la primera visita: el `controllerchange`
  // que viene después es el de la instalación inicial, no el de una versión
  // nueva, y recargar ahí solo haría parpadear la pantalla sin motivo
  const habiaControlador = Boolean(navigator.serviceWorker.controller);
  let recargando = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!habiaControlador || recargando) return;

    // La guarda importa: `controllerchange` puede llegar más de una vez, y dos
    // recargas encadenadas dejan la aplicación dando vueltas
    recargando = true;
    window.location.reload();
  });

  const registrar = async () => {
    try {
      const registro = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

      // Volver a la aplicación es el único momento fiable para preguntar en una
      // instalada, que puede pasar días sin recargarse
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          registro.update().catch(() => {
            // Sin conexión no hay nada que comprobar, y no es un error que
            // merezca ruido: se reintenta la próxima vez que vuelva
          });
        }
      });

      return registro;
    } catch {
      // Un fallo al registrar deja la aplicación sin funcionar sin conexión,
      // pero no debe impedir que arranque
      return null;
    }
  };

  // `load` ya puede haber pasado cuando este módulo se ejecuta, y entonces el
  // oyente no se dispararía nunca
  if (document.readyState === 'complete') {
    registrar();
  } else {
    window.addEventListener('load', registrar, { once: true });
  }
}

export default registerServiceWorker;
