import { oppositeTeam } from './createQuickMatchModalConstants';

/**
 * Los anotadores al volver al paso 3 después de cambiar los jugadores (tabla
 * aprobada por Agustín el 4 nov 2026). Antes se volvía a «solo tú» en
 * silencio, y al repetir una partida con alguien que ya no estaba se perdían
 * también los que seguían.
 *
 * Se conserva lo elegido con quien juega ahora: quien se fue deja de anotar y
 * quien entra no anota (lo de por defecto). En foursomes no se elige a
 * personas sino parejas, así que se conserva esa elección. Con otra modalidad
 * u otro formato de match play cambia la forma de anotar: los de por defecto.
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
  if (formaDeAnotar(antes) !== formaDeAnotar(ahora)) return null;

  const registrados = ahora.jugadores.filter((p) => !p.isGuest);

  if (ahora.modo === 'MATCH_PLAY' && ahora.formato === 'FOURSOMES') {
    const equipoDe = (jugadores) => jugadores.find((p) => p.participantId === yo)?.team ?? null;
    const enfrenteAntes = oppositeTeam(equipoDe(antes.jugadores));
    const anotabaEnfrente = antes.jugadores.some(
      (p) => (p.team ?? null) === enfrenteAntes && anotadores.includes(p.participantId)
    );
    const miEquipo = equipoDe(ahora.jugadores);
    const deEquipo = (team) => registrados.filter((p) => (p.team ?? null) === team);
    const enfrente = anotabaEnfrente ? deEquipo(oppositeTeam(miEquipo)) : [];
    return [...deEquipo(miEquipo), ...enfrente].map((p) => p.participantId);
  }

  const siguen = new Set(registrados.map((p) => p.participantId));
  return [yo, ...anotadores.filter((id) => id !== yo && siguen.has(id))];
};

// En stroke play da igual el formato; en match play, foursomes anota por parejas
const formaDeAnotar = ({ modo, formato }) => `${modo}:${modo === 'MATCH_PLAY' ? formato : ''}`;
