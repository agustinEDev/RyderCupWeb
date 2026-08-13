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

/**
 * Los oyentes se instalan una sola vez, y **aparte del registro**: si se atara
 * lo uno a lo otro, un registro fallido —arrancar sin cobertura, sin ir más
 * lejos— dejaría la aplicación sin oyentes y sin forma de reintentar, es decir
 * sin actualizaciones y sin funcionar sin conexión durante toda la sesión.
 */
let oyentesInstalados = false;

/** El registro conseguido, o null mientras no haya ninguno. */
let registro = null;

/** Evita solaparse consigo mismo cuando llegan dos avisos casi a la vez. */
let enCurso = false;

export function registerServiceWorker() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  if (oyentesInstalados) return;
  oyentesInstalados = true;

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

  /**
   * Registra si aún no hay registro, y si lo hay pregunta por una versión nueva.
   *
   * Un fallo deja `registro` en null a propósito, para que el siguiente aviso
   * lo vuelva a intentar en lugar de darse por vencido.
   */
  const registrarOActualizar = async () => {
    if (enCurso) return;
    enCurso = true;

    try {
      if (registro) {
        await registro.update();
      } else {
        registro = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      }
    } catch {
      // Sin conexión no hay nada que comprobar, y un registro fallido no debe
      // impedir que la aplicación arranque: se reintenta al volver o al
      // recuperar la red
    } finally {
      enCurso = false;
    }
  };

  // Volver a la aplicación es el único momento fiable en una instalada, que
  // puede pasar días sin recargarse
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') registrarOActualizar();
  });

  // Y recuperar la red es el otro: es justo cuando un registro que falló por
  // estar sin cobertura puede por fin salir adelante
  window.addEventListener('online', registrarOActualizar);

  // `load` ya puede haber pasado cuando este módulo se ejecuta, y entonces el
  // oyente no se dispararía nunca
  if (document.readyState === 'complete') {
    registrarOActualizar();
  } else {
    window.addEventListener('load', registrarOActualizar, { once: true });
  }
}

export default registerServiceWorker;
