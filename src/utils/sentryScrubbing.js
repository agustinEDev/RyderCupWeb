/**
 * Los ganchos de Sentry que tapan los secretos de las URLs (FE #385), en un
 * solo sitio para las dos inicializaciones: `main.jsx` e
 * `infrastructure/sentry.ts`.
 *
 * En vez de una lista de claves donde mirar, se pasa `scrubUrl` por todo el
 * texto de lo que sale. La lista se quedaba corta cada vez que Sentry cambiaba
 * de forma: el 30 sep 2026 se escapaban `url.path`, las migas de navegacion
 * (`from`/`to`), el `Referer` y la lista `urls` de Replay. `scrubUrl` solo
 * cambia lo que reconoce como secreto, asi que recorrerlo todo es seguro.
 *
 * Sin dependencias pesadas a proposito: lo usa codigo del primer chunk.
 */
import { scrubUrl } from './scrubUrl';

/**
 * Replay solo pasa a `beforeAddRecordingEvent` sus eventos «custom» (migas,
 * navegaciones): el meta, con el href de la pagina, no pasa nunca. Por eso el
 * secreto se quita de la barra en cuanto la pagina lo lee
 * (utils/stripSecretsFromAddressBar.js).
 */
const RECORDING_CUSTOM = 5;

/**
 * Claves en las que no se entra:
 * - `sdkProcessingMetadata`: el estado interno del SDK (las Scope, y con ellas
 *   el cliente, Replay y todas las migas). Recorrerlo en cada transaccion era
 *   medio SDK en el hilo principal, y no sale en el evento;
 * - `arguments`: los objetos que la app paso a `console.*`, los suyos, no una
 *   copia. Esas migas no salen (`beforeBreadcrumb`), pero no se tocan nunca.
 */
const SKIP_KEYS = new Set(['sdkProcessingMetadata', 'arguments']);

/** Solo objetos simples y listas: lo que Sentry manda. Una clase es de alguien. */
const isPlain = (value) => {
  if (Array.isArray(value)) return true;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

/**
 * Tapa, en su sitio, los secretos de todo el texto de un valor.
 *
 * @param {unknown} value Texto, objeto simple o lista; lo demas pasa tal cual
 * @param {WeakSet<object>} [visto] Para no dar vueltas en un objeto circular
 * @returns {unknown} El texto tapado, o el mismo objeto tapado en su sitio
 */
export const scrubDeep = (value, visto = new WeakSet()) => {
  if (typeof value === 'string') return scrubUrl(value);
  if (!value || typeof value !== 'object' || visto.has(value) || !isPlain(value)) return value;
  visto.add(value);

  for (const key of Object.keys(value)) {
    if (SKIP_KEYS.has(key)) continue;
    try {
      const actual = value[key];
      const tapado = scrubDeep(actual, visto);
      if (tapado !== actual) value[key] = tapado;
    } catch {
      // Un getter que lanza o un objeto congelado: se sigue con lo demas antes
      // que perder el evento entero
    }
  }
  return value;
};

const scrubAll = (item) => scrubDeep(item);

/**
 * Las migas de consola no salen hacia Sentry, en ningún entorno (25 oct 2026).
 * La app escribe en la consola datos personales y mensajes de la API, y el
 * filtro de `infrastructure/sentry.ts` que las quitaba en producción no se
 * registraba nunca: la inicialización que cuenta es la de `main.jsx`, que usa
 * este gancho. Lo que haga falta para depurar se manda a propósito con
 * `captureError`. Las demás migas (navegación, clics, red) salen tapadas.
 */
const scrubBreadcrumb = (breadcrumb) => {
  if (breadcrumb?.category === 'console') return null;
  return scrubDeep(breadcrumb);
};

export const sentryScrubbing = {
  beforeBreadcrumb: scrubBreadcrumb,
  beforeSend: scrubAll,
  beforeSendTransaction: scrubAll,
  beforeSendSpan: scrubAll,
  // El evento de Replay no pasa por beforeSend: se registra con
  // `addEventProcessor`, que corre tambien despues de HttpContext (el Referer)
  eventProcessor: scrubAll,
  // La grabacion guarda sus propias URLs (migas de clic, navegaciones). Aqui
  // solo llegan los eventos «custom»; se comprueba igual para no recorrer
  // nunca una foto del DOM, que puede ser enorme
  beforeAddRecordingEvent(event) {
    if (event?.type === RECORDING_CUSTOM) scrubDeep(event.data);
    return event;
  },
};
