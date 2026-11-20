/**
 * Cómo se juega una partida rápida en el asistente: partido (uno contra uno o
 * por parejas) o juego libre (cada uno su tarjeta, stableford o medal).
 *
 * Es estado de la interfaz: el backend no lo manda; lo deduce de si la partida
 * lleva `match_format`.
 *
 * @readonly
 * @enum {string}
 */
export const QuickMatchMode = Object.freeze({
  MATCH_PLAY: 'MATCH_PLAY',
  FREE_PLAY: 'FREE_PLAY',
});
