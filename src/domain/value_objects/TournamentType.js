/**
 * El tipo de torneo (FE #791, RyderCupAm#251): RYDER_CUP, STABLEFORD o MEDAL.
 *
 * La regla que se repetía en la entidad, la validación, la ficha y el
 * formulario vive aquí una vez: solo una Ryder Cup tiene equipos, reparto y
 * modo de montaje. Sin tipo (una respuesta o un formulario de antes) es una
 * Ryder Cup, que es lo que eran todas.
 */
/**
 * Los valores son los del backend, con la misma grafía (modules/competition/domain/value_objects/tournament_type.py).
 *
 * @readonly
 * @enum {string}
 */
export const TournamentType = Object.freeze({
  RYDER_CUP: 'RYDER_CUP',
  STABLEFORD: 'STABLEFORD',
  MEDAL: 'MEDAL',
});

export const RYDER_CUP = TournamentType.RYDER_CUP;

export const tieneEquipos = (tournamentType) =>
  (tournamentType ?? RYDER_CUP) === RYDER_CUP;
