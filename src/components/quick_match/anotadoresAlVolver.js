import { formaDeAnotar } from './createQuickMatchModalConstants';

/**
 * Los anotadores al volver al paso 3 después de cambiar los jugadores (tabla
 * aprobada por Agustín el 4 nov 2026). Antes se volvía a «solo tú» en
 * silencio, y al repetir una partida con alguien que ya no estaba se perdían
 * también los que seguían.
 *
 * Se conserva lo elegido con quien juega ahora: quien se fue deja de anotar y
 * quien entra no anota (lo de por defecto). Con otra modalidad u otro formato
 * de match play cambia la forma de anotar: los de por defecto. Foursomes no
 * pasa por aquí: se eligen parejas, no personas, y el modal vuelve a aplicar
 * la pareja elegida (`chooseScoringSides`).
 *
 * @param {Object} opciones
 * @param {{jugadores: Array, modo: string, formato: string}|null} opciones.antes
 *   Con qué se eligieron los anotadores, o `null` si aún no se eligieron
 * @param {{jugadores: Array, modo: string, formato: string}} opciones.ahora
 * @param {string[]} opciones.anotadores Los elegidos (participantId)
 * @param {string} opciones.yo El participantId de quien crea la partida
 * @returns {string[]|null} Los anotadores, o `null` para los de por defecto
 */
export const anotadoresAlVolver = ({ antes, ahora, anotadores, yo }) => {
  if (!antes) return null;
  if (formaDeAnotar(antes.modo, antes.formato) !== formaDeAnotar(ahora.modo, ahora.formato)) return null;
  // Los anotadores son siempre registrados: basta con ver quién sigue jugando
  const siguen = new Set(ahora.jugadores.map((p) => p.participantId));
  return [yo, ...anotadores.filter((id) => id !== yo && siguen.has(id))];
};
