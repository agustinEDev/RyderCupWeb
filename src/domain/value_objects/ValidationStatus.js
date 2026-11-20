/**
 * Cómo va la validación cruzada de un hoyo entre el jugador y su marcador:
 * falta un lado, coinciden o no.
 *
 * El backend la manda en mayúsculas (competition/domain/value_objects/validation_status.py)
 * y en el frontend circula en minúsculas: la vista del partido ya llega así y
 * los mappers pasan a minúsculas la del grupo de salida.
 *
 * @readonly
 * @enum {string}
 */
export const ValidationStatus = Object.freeze({
  PENDING: 'pending',
  MATCH: 'match',
  MISMATCH: 'mismatch',
});
