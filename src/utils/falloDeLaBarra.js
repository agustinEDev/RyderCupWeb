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

/**
 * La clave del texto de un fallo al guardar una barra: por su código, nunca
 * el texto del servidor, que es técnico y en inglés. Con el espacio de nombres
 * delante: sale en la ficha y en las invitaciones.
 *
 * La barra de un campo para un género (organizador) tiene su propio texto
 * para `TEE_NOT_AVAILABLE`: no habla de un jugador.
 *
 * @param {Error & {status?: number, errorCode?: string|null}} error
 * @param {{ delCampo?: boolean }} [contexto]
 * @returns {string}
 */
export const claveDelFalloDeLaBarra = (error, { delCampo = false } = {}) => {
  if (delCampo && error?.errorCode === 'TEE_NOT_AVAILABLE')
    return 'competitions:tees.courses.errors.TEE_NOT_AVAILABLE';
  if (CON_SU_TEXTO.has(error?.errorCode))
    return `competitions:tees.errors.${error.errorCode}`;
  if (error?.status === 403) return 'competitions:tees.errors.FORBIDDEN';
  return 'competitions:tees.errors.generic';
};
