import { oppositeTeam } from './createQuickMatchModalConstants';

/**
 * Los anotadores al volver al paso 3 después de cambiar los jugadores (tabla
 * aprobada por Agustín el 4 nov 2026). Antes se volvía a «solo tú» en
 * silencio, y al repetir una partida con alguien que ya no estaba se perdían
 * también los que seguían.
 *
 * Se conserva lo elegido con quien juega ahora: quien se fue deja de anotar y
 * quien entra no anota (lo de por defecto). En foursomes no se elige a
 * personas sino parejas, y se conserva esa elección: la que hizo quien crea,
 * no lo que la app dejó puesto porque enfrente no había registrados (revisor).
 * Con otra modalidad u otro formato de match play cambia la forma de anotar:
 * los de por defecto.
 *
 * @param {Object} opciones
 * @param {{jugadores: Array, modo: string, formato: string}|null} opciones.antes
 *   Con qué se eligieron los anotadores, o `null` si aún no se eligieron
 * @param {{jugadores: Array, modo: string, formato: string}} opciones.ahora
 * @param {string[]} opciones.anotadores Los elegidos (participantId)
 * @param {string} opciones.yo El participantId de quien crea la partida
 * @param {'BOTH'|'MINE'|null} [opciones.parejas] En foursomes, lo que eligió
 *   quien crea (o se copió al repetir); `null` si no eligió
 * @returns {string[]|null} Los anotadores, o `null` para los de por defecto
 */
export const anotadoresAlVolver = ({ antes, ahora, anotadores, yo, parejas = null }) => {
  if (antes && formaDeAnotar(antes) !== formaDeAnotar(ahora)) return null;

  const registrados = ahora.jugadores.filter((p) => !p.isGuest);

  if (ahora.modo === 'MATCH_PLAY' && ahora.formato === 'FOURSOMES') {
    if (!parejas) return null;
    const miEquipo = ahora.jugadores.find((p) => p.participantId === yo)?.team ?? null;
    const deEquipo = (team) => registrados.filter((p) => (p.team ?? null) === team);
    const enfrente = parejas === 'BOTH' ? deEquipo(oppositeTeam(miEquipo)) : [];
    return [...deEquipo(miEquipo), ...enfrente].map((p) => p.participantId);
  }

  if (!antes) return null;
  const siguen = new Set(registrados.map((p) => p.participantId));
  return [yo, ...anotadores.filter((id) => id !== yo && siguen.has(id))];
};

// En stroke play da igual el formato; en match play, foursomes anota por parejas
const formaDeAnotar = ({ modo, formato }) => `${modo}:${modo === 'MATCH_PLAY' ? formato : ''}`;
