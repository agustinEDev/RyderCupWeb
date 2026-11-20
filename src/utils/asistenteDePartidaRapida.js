import { MatchFormat } from '../domain/value_objects/MatchFormat';
import { Team } from '../domain/value_objects/Team';

/**
 * Las reglas sin interfaz del asistente de partida rápida: cuántos jugadores
 * caben por formato, el bando contrario, el tope de anotadores y la clave con
 * la que se elige una barra (color + género). Qué formatos van por equipos lo
 * dice el dominio: `isTeamMatchFormat`.
 *
 * Vivían en `components/quick_match/createQuickMatchModalConstants.js` (que las
 * reexporta); salieron de ahí el 9 nov 2026 porque utils/borradorParaRepetir y
 * utils/barraPorDefecto las necesitan y utils no importa de components.
 */

// Mirrors backend MatchFormat.players_per_team() * 2 (SINGLES 1v1, FOURBALL/FOURSOMES 2v2)
export const FORMAT_CAPACITY = {
  [MatchFormat.SINGLES]: 2,
  [MatchFormat.FOURBALL]: 4,
  [MatchFormat.FOURSOMES]: 4,
};

// En un formato por equipos solo hay dos bandos, A y B, y el contrario es
// SIEMPRE la otra letra. Preguntar por "el que no es el mío" contaba como rival
// a un registrado sin equipo, que no está en ninguno de los dos.
export const oppositeTeam = (team) => (team === Team.A ? Team.B : Team.A);

// Mirrors backend MAX_SCORERS (quick_match domain entity)
export const MAX_SCORERS = 4;

export const NO_TEE_KEY = '';
export const teeKey = (category, gender) =>
  category ? `${category}|${gender ?? ''}` : NO_TEE_KEY;
export const parseTeeKey = (key) => {
  if (!key) return { color: null, teeGender: null };
  const [category, gender] = key.split('|');
  return { color: category, teeGender: gender || null };
};
