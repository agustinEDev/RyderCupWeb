import { captureError } from '../utils/sentryHelpers';

/**
 * Si la aplicación está llegando al servidor o no.
 *
 * `navigator.onLine` no sirve para esto: dice si hay una interfaz de red
 * levantada, no si los datos llegan. En un campo de golf con dos rayas de
 * cobertura vale `true` mientras ninguna petición completa, así que la
 * aplicación se creía conectada, no avisaba de nada y no guardaba nada para
 * después (FE #514).
 *
 * Aquí la respuesta la dan las peticiones reales: si una vuelve —con el estado
 * que sea, incluso un error del servidor— hay conexión; si ninguna llega, no la
 * hay. El navegador se sigue escuchando, porque cuando él dice que no hay red
 * acierta siempre; es al revés cuando se equivoca.
 *
 * **Y una petición que no llega casi nunca falla: se queda colgada.** Esperar a
 * que rechace es cubrir el caso raro —la interfaz caída, que `navigator.onLine`
 * ya sabía— y no el de verdad. Así que también se mide el tiempo: una petición
 * que no ha vuelto en unos segundos cuenta como que no hay conexión, sin
 * cancelarla. Cancelar una escritura sería peor: pudo haber llegado al
 * servidor y no habría forma de saberlo.
 */

// Lo que se espera a una petición antes de darla por no llegada. Es el mismo
// plazo que usa el arranque para no quedarse esperando a `/current-user`
const PLAZO_SIN_RESPUESTA_MS = 5000;

// Se arranca creyendo que hay conexión: sin ninguna petición hecha todavía,
// avisar de que no la hay sería adivinar, y el aviso saldría en cada arranque.
// La excepción es el único caso en que el navegador acierta seguro: si dice que
// NO hay red, no la hay —abrir la pantalla en modo avión, por ejemplo—
let llegaAlServidor = globalThis.navigator?.onLine !== false;

const oyentes = new Set();

// Cuándo llegó la última respuesta, para no culpar a la red de una petición
// que simplemente tarda mientras otras van y vienen
let ultimaRespuesta = 0;

// Los plazos en marcha, para poder pararlos al reiniciar el módulo en pruebas
const temporizadores = new Set();

const ahora = () => globalThis.performance?.now?.() ?? 0;

const avisa = () => {
  // Sobre una copia: un oyente que se apunte durante el aviso entraría en este
  // mismo recorrido, y el de la pantalla de anotación vacía la cola de hoyos.
  // Llamarlo dos veces mandaría el mismo hoyo dos veces
  for (const oyente of [...oyentes]) {
    // Cada uno por su cuenta: si uno falla —la cola llena, un JSON roto— no
    // puede dejar sin avisar a los demás. Y avisar ocurre dentro de la
    // petición, así que su excepción llegaría a sustituir a la respuesta del
    // servidor: quien pidió recibiría un error habiendo contestado el servidor
    try {
      oyente();
    } catch (error) {
      // Aislado para que uno no deje sin avisar a los demás ni sustituya la
      // respuesta del servidor. Pero NO se traga: el oyente de la pantalla de
      // anotación es quien vacía la cola de hoyos, y un fallo suyo son golpes
      // sin enviar. Como el valor ya está escrito, no habrá otro aviso para
      // esta misma transición, así que si se queda en la consola no lo ve nadie
      captureError(error, { tags: { modulo: 'estadoDeConexion' } });
    }
  }
};

const cambiaA = (valor) => {
  if (llegaAlServidor === valor) return;
  llegaAlServidor = valor;
  avisa();
};

/** Una petición volvió: hay conexión, aunque la respuesta sea un error. */
export const apuntaRespuestaDelServidor = () => {
  ultimaRespuesta = ahora();
  cambiaA(true);
};

/** Una petición no llegó a completarse: no hay conexión. */
export const apuntaFalloDeRed = () => cambiaA(false);

/**
 * Vigila una petición en curso.
 *
 * Si no ha vuelto dentro del plazo, se da por que no hay conexión —sin tocar la
 * petición, que sigue su camino—. Devuelve la función que hay que llamar
 * cuando la petición termine, haya ido bien o mal.
 */
export const vigilaUnaPeticion = () => {
  let temporizador = null;
  let vigilando = true;

  const arma = () => {
    temporizador = setTimeout(() => {
      // El temporizador ya se ha disparado: fuera del conjunto. Si no, una
      // petición que cuelga para siempre —el caso que da nombre a esto— dejaba
      // su rastro ahí de por vida
      temporizadores.delete(temporizador);
      if (!vigilando) return;

      // Solo cuenta como falta de cobertura si no ha llegado nada hace poco.
      // Una petición legítimamente lenta —subir una foto del carrete por datos,
      // o despertar una instancia dormida— tardaba más del plazo y declaraba
      // sin conexión a toda la aplicación aunque el resto fuera bien
      if (ahora() - ultimaRespuesta < PLAZO_SIN_RESPUESTA_MS) {
        // Y se vuelve a mirar: rendirse aquí dejaba sin detectar la caída de
        // después. Bastaba una respuesta reciente para que esta petición, que
        // ya no va a volver, no dijera nunca nada
        arma();
        return;
      }

      cambiaA(false);
    }, PLAZO_SIN_RESPUESTA_MS);

    temporizadores.add(temporizador);
  };

  arma();

  return () => {
    vigilando = false;
    clearTimeout(temporizador);
    temporizadores.delete(temporizador);
  };
};

export const hayConexion = () => llegaAlServidor;

export const seSuscribeALaConexion = (oyente) => {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
};

/** Solo para los tests: cuántos plazos siguen vivos. */
export const plazosVivos = () =>
  (import.meta.env?.MODE === 'test' ? temporizadores.size : 0);

/**
 * Solo para los tests: devuelve el módulo a su estado de arranque.
 *
 * Da de baja a todos los oyentes, y `useSyncExternalStore` solo se vuelve a
 * apuntar al montar de nuevo, así que llamarla con la aplicación en marcha
 * dejaría el aviso congelado en lo que estuviera enseñando. No hay motivo para
 * llamarla fuera de una prueba, y aquí se asegura que no se pueda.
 */
export const olvidaElEstadoDeConexion = () => {
  if (import.meta.env?.MODE !== 'test') return;
  // También los plazos en marcha: uno superviviente dispararía un «sin
  // conexión» diferido sobre el estado ya reiniciado
  for (const t of temporizadores) clearTimeout(t);
  temporizadores.clear();
  ultimaRespuesta = 0;
  // Y los del navegador: sin esto, cada reinicio dejaba un par más vivo sobre
  // `globalThis`, atado a una instancia del módulo ya muerta
  globalThis.removeEventListener?.('offline', seCayoLaRed);
  globalThis.removeEventListener?.('online', volvioLaRed);
  llegaAlServidor = globalThis.navigator?.onLine !== false;
  oyentes.clear();
};

// Los dos eventos del navegador se escuchan, pero no valen lo mismo.
//
// `offline` es de fiar: si dice que no hay red, no la hay.
//
// `online` no lo es —engancharse a un portal cautivo también lo emite—, y aun
// así se hace caso: es una de las formas de volver a intentarlo, y si se
// equivoca la corrección llega sola, porque la primera petición que no complete
// devuelve el estado a «sin conexión». Quitarlo dejaría la recuperación
// dependiendo solo del sondeo.
const seCayoLaRed = () => cambiaA(false);
const volvioLaRed = () => cambiaA(true);

if (typeof globalThis.addEventListener === 'function') {
  globalThis.addEventListener('offline', seCayoLaRed);
  globalThis.addEventListener('online', volvioLaRed);
}
