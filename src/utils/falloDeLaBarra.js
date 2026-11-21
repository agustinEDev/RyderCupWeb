// Los rechazos del servidor con su propio texto (RyderCupAm#912 y barras por
// campo)
const CON_SU_TEXTO = new Set([
  'TEE_NOT_AVAILABLE',
  'TEE_CHANGE_CLOSED',
  'ENROLLMENT_NOT_APPROVED',
  'PENDING_GAME_NOT_RECALCULABLE',
  'COURSE_NOT_IN_COMPETITION',
  // La general en un campo con partidos pendientes que no la tiene
  'TEE_NOT_ON_PENDING_COURSE',
]);
// Los que hablan de lo pendiente: un «partido» en una Ryder, una «partida»
// en stroke play (tabla del 21 nov 2026, D)
const DE_LO_PENDIENTE = new Set([
  'PENDING_GAME_NOT_RECALCULABLE',
  'TEE_NOT_ON_PENDING_COURSE',
  'cantRemove',
]);

/**
 * La clave del texto de un fallo al guardar una barra: por su código, nunca
 * el texto del servidor, que es técnico y en inglés. Con el espacio de nombres
 * delante: sale en la ficha y en las invitaciones.
 *
 * El texto depende también de la acción (RyderCupAm #917): `TEE_NOT_AVAILABLE`
 * al QUITAR una barra (null) es que la que quedaría no vale para algo
 * pendiente en ese campo; al fijarla, que el campo no la tiene (la de un
 * campo para un género, del organizador, con su texto: no habla de un
 * jugador).
 *
 * Lo que habla de lo pendiente sale con «partida» en stroke play
 * (`conEquipos: false`); sin decirlo, con «partido», el de la Ryder.
 *
 * @param {Error & {status?: number, errorCode?: string|null}} error
 * @param {{ delCampo?: boolean, quitando?: boolean, conEquipos?: boolean }} [contexto]
 * @returns {string}
 */
export const claveDelFalloDeLaBarra = (
  error,
  { delCampo = false, quitando = false, conEquipos = true } = {},
) => {
  const deLosFallos = (clave) =>
    !conEquipos && DE_LO_PENDIENTE.has(clave)
      ? `competitions:tees.errorsStrokePlay.${clave}`
      : `competitions:tees.errors.${clave}`;
  if (quitando && error?.errorCode === 'TEE_NOT_AVAILABLE')
    return deLosFallos('cantRemove');
  if (delCampo && error?.errorCode === 'TEE_NOT_AVAILABLE')
    return 'competitions:tees.courses.errors.TEE_NOT_AVAILABLE';
  if (CON_SU_TEXTO.has(error?.errorCode)) return deLosFallos(error.errorCode);
  if (error?.status === 403) return 'competitions:tees.errors.FORBIDDEN';
  return 'competitions:tees.errors.generic';
};
