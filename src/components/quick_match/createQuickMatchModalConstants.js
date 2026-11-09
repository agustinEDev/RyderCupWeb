// Shared constants and pure helpers for CreateQuickMatchModal and its wizard steps
// (CourseStep, ParticipantsStep, ScorersStep, SummaryStep).

// Las reglas sin interfaz (cupos, equipos, claves de barra) viven en
// `utils/asistenteDePartidaRapida` desde el 9 nov 2026: también las usan
// utils/borradorParaRepetir y utils/barraPorDefecto, y utils no importa de
// components. Se reexportan aquí para que los pasos sigan importando de un sitio
export {
  FORMAT_CAPACITY,
  TEAM_FORMATS,
  oppositeTeam,
  MAX_SCORERS,
  NO_TEE_KEY,
  teeKey,
  parseTeeKey,
} from '../../utils/asistenteDePartidaRapida';

export const FORMAT_LABEL_KEY = {
  SINGLES: 'formatSingles',
  FOURBALL: 'formatFourball',
  FOURSOMES: 'formatFoursomes',
};
// Mirrors backend MAX_FREE_PLAY_PLAYERS (quick_match domain entity)
export const FREE_PLAY_CAPACITY = 4;
export const SCORING_FORMAT_LABEL_KEY = {
  MEDAL: 'formatMedal',
  STABLEFORD: 'formatStableford',
};

// Mirrors backend WHS allowance defaults (quick_match domain entity get_effective_allowance()).
// La regla vive en el dominio, que también la usa
export {
  DEFAULT_ALLOWANCE_BY_MATCH_FORMAT,
  DEFAULT_FREE_PLAY_ALLOWANCE,
} from '../../domain/services/defaultAllowance';
// Curated quick-pick values instead of the full 50-100 (step 5) WHS range:
// match play only ever really uses its three format defaults, and free play
// (stroke play) conventionally sits at 90/95/100.
export const MATCH_PLAY_ALLOWANCE_OPTIONS = [50, 90, 100];
export const FREE_PLAY_ALLOWANCE_OPTIONS = [90, 95, 100];

// Estilos por color real de las barras. Antes se adivinaba el color leyendo la
// primera palabra del identificador libre; ahora la salida trae su color, así
// que se usa directamente. PINK se anade porque hay campos federados con barras
// rosas, y OTHER no tiene color propio: cae en el estilo neutro.
export const TEE_COLOR_STYLES = {
  white: { dot: 'bg-white border border-gray-400', selected: 'border-gray-500 bg-gray-50 text-gray-700' },
  yellow: { dot: 'bg-yellow-400', selected: 'border-yellow-500 bg-yellow-50 text-yellow-700' },
  gold: { dot: 'bg-yellow-500', selected: 'border-yellow-600 bg-yellow-50 text-yellow-700' },
  blue: { dot: 'bg-blue-500', selected: 'border-blue-500 bg-blue-50 text-blue-700' },
  red: { dot: 'bg-red-500', selected: 'border-red-500 bg-red-50 text-red-700' },
  green: { dot: 'bg-green-500', selected: 'border-green-500 bg-green-50 text-green-700' },
  black: { dot: 'bg-black', selected: 'border-gray-800 bg-gray-100 text-gray-900' },
  orange: { dot: 'bg-orange-500', selected: 'border-orange-500 bg-orange-50 text-orange-700' },
  silver: { dot: 'bg-gray-300 border border-gray-400', selected: 'border-gray-400 bg-gray-50 text-gray-700' },
  purple: { dot: 'bg-purple-500', selected: 'border-purple-500 bg-purple-50 text-purple-700' },
  bronze: { dot: 'bg-amber-700', selected: 'border-amber-700 bg-amber-50 text-amber-800' },
  pink: { dot: 'bg-pink-400', selected: 'border-pink-400 bg-pink-50 text-pink-700' },
};

export const resolveTeeColor = (color) => TEE_COLOR_STYLES[color?.toLowerCase()] ?? null;

export const initialGuestForm = { firstName: '', lastName: '', handicap: '' };

/**
 * La forma de anotar: en match play el formato cambia quién puede anotar
 * (foursomes va por parejas); en stroke play da igual Stableford o Medal.
 *
 * Si al volver al paso 3 hay que ajustar los anotadores (4 nov 2026): con los
 * mismos jugadores (y su equipo) y la misma forma de anotar se dejan tal cual;
 * si algo cambió, se ajustan (`anotadoresAlVolver`; en foursomes, la pareja
 * elegida).
 */
export const formaDeAnotar = (modo, formatoDeJuego) =>
  `${modo}:${modo === 'MATCH_PLAY' ? formatoDeJuego : ''}`;

export const firmaDeLosAnotadores = (jugadores, modo, formatoDeJuego) =>
  `${formaDeAnotar(modo, formatoDeJuego)}|` +
  jugadores.map((p) => `${p.participantId}:${p.team ?? ''}`).join('|');
