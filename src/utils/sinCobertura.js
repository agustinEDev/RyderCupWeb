import { esElMotivoDelServidor } from './mensajeDelError';

/**
 * Si lo que ha fallado es la red, y no el servidor ni la petición.
 *
 * `fetch` avisa de que no hubo respuesta con un `TypeError` —también cuando el
 * service worker no puede responder, que es como se ve en la aplicación
 * instalada—; un fallo del código llega como cualquier otro Error y no debe
 * disfrazarse de falta de cobertura. Y el aviso del navegador cuenta como
 * segunda vía: en modo avión no hay ni intento que valga.
 *
 * Vivía dentro de `MyQuickMatchesPage`, y hacía falta en las otras pantallas
 * que se usan en el campo.
 *
 * LO QUE NO DISTINGUE: un `TypeError` de un fallo del código —un mapper que
 * lee una propiedad de `undefined`, por ejemplo— pasa por falta de cobertura,
 * y entonces el aviso miente y el fallo de verdad no sale a la luz. Se queda
 * así porque no todo lo que la usa pasa por `api.js`, que es quien marca los
 * suyos; donde confundirlos cuesta, `esFalloDeRedDeLaApi`. La consola sigue
 * siendo la red: en los sitios que usan esto, el error entero se registra ahí.
 */
export const esFalloDeRed = (err) =>
  err instanceof TypeError || esFalloDeRedDeLaApi(err);

/**
 * La versión estricta, para las llamadas que pasan por `api.js`: solo lo que
 * él marca con `sinConexion: true` —el fallo de `fetch`, su tope vencido y el
 * cuerpo que se corta a medias—, o el navegador sin red. Un `TypeError` del
 * código (leer `.valid` de un cuerpo `null`) no lleva la marca.
 *
 * Se usa donde confundirlos tiene coste: en el enlace de restablecer, decir
 * «sin conexión» a un fallo del código despista. Lo que no pasa por `api.js`
 * necesita `esFalloDeRed`.
 */
export function esFalloDeRedDeLaApi(err) {
  return err?.sinConexion === true || globalThis.navigator?.onLine === false;
}

/**
 * Lo que se le enseña a quien está mirando.
 *
 * Tres casos y no dos, que es donde estuvo el error al escribir esto: forzar
 * siempre el texto genérico se llevaba por delante lo que dice el servidor
 * —«ese jugador ya es participante», «el hándicap se sale de rango»— y dejaba
 * al jugador sin saber qué cambiar. El motivo de un 4xx (no un 401) se
 * enseña; lo demás —un 5xx, lo que `api.js` marcó como técnico, lo que no trae
 * estado porque lo lanzó el propio front— va con el genérico. La regla es
 * `esElMotivoDelServidor`, la misma de `mensajeDelError` (17 nov 2026).
 *
 * @param {Error} err
 * @param {{sinConexion: string, generico: string}} textos ya traducidos
 */
export const mensajeDeError = (err, { sinConexion, generico }) => {
  const motivo = motivoDelError(err);
  if (motivo === 'sinConexion') return sinConexion;
  if (motivo === 'generico') return generico;
  return motivo.delServidor;
};

/**
 * La misma regla, sin textos: `'sinConexion'`, `'generico'` o
 * `{ delServidor: mensaje }`. Para quien guarda el aviso por su clave y lo
 * traduce al pintarlo (el asistente de partida rápida, 4 nov 2026).
 *
 * @param {Error} err
 * @returns {'sinConexion'|'generico'|{delServidor: string}}
 */
export const motivoDelError = (err) => {
  if (esFalloDeRed(err)) return 'sinConexion';
  // Qué texto del servidor se enseña lo decide la misma regla que
  // `mensajeDelError` (re-auditoría Q-FE-06): ni un 5xx —el «Internal Server
  // Error» o el 503 del service worker (FE #710)—, ni un 401, ni lo que
  // `api.js` marcó como técnico, ni JSON, ni un código suelto
  if (esElMotivoDelServidor(err)) return { delServidor: err.message };
  return 'generico';
};
