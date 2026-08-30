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
 * y entonces el aviso miente y el fallo de verdad no sale a la luz. No hay
 * forma barata de separarlos: `fetch` no marca los suyos, y los mensajes
 * cambian con cada navegador. Queda a sabiendas, con la consola como red: en
 * los sitios que usan esto, el error entero se sigue registrando ahí.
 */
export const esFalloDeRed = (err) =>
  err instanceof TypeError || globalThis.navigator?.onLine === false;

/**
 * Lo que se le enseña a quien está mirando.
 *
 * Tres casos y no dos, que es donde estuvo el error al escribir esto: forzar
 * siempre el texto genérico se llevaba por delante lo que dice el servidor
 * —«ese jugador ya es participante», «el hándicap se sale de rango»— y dejaba
 * al jugador sin saber qué cambiar. Una respuesta CON estado trae el motivo y
 * ese motivo se enseña; lo que no tiene estado es un fallo del código o el
 * aviso crudo del service worker, y eso no se le cuenta a nadie.
 *
 * @param {Error} err
 * @param {{sinConexion: string, generico: string}} textos ya traducidos
 */
export const mensajeDeError = (err, { sinConexion, generico }) => {
  if (esFalloDeRed(err)) return sinConexion;
  if (err?.status && err?.message) return err.message;
  return generico;
};
