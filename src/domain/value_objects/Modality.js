/**
 * La modalidad de juego: match play (hoyo a hoyo contra un rival) o stroke
 * play (golpes de toda la vuelta).
 *
 * Los valores son los del backend, con la misma grafía (shared/domain/value_objects/modality.py).
 *
 * @readonly
 * @enum {string}
 */
export const Modality = Object.freeze({
  MATCH_PLAY: 'MATCH_PLAY',
  STROKE_PLAY: 'STROKE_PLAY',
});
