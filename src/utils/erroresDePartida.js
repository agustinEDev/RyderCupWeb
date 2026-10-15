/**
 * Los errores del servidor al anotar o corregir una partida de stroke play
 * (FE #824, PR 7; RyderCupAm#535), con su texto en `scoring.partida.errors`.
 * El `message` del error trae el `detail` del backend, que no está traducido:
 * solo se usa si llega un código que no está aquí.
 */
export const CODIGOS_DE_PARTIDA = [
  'NOT_GROUP_PLAYER',
  'NOT_YOUR_MARKED_PLAYER',
  'GROUP_WITHOUT_MARKER',
  'GROUP_NOT_SCORING',
  'GROUP_NOT_STARTED',
  'SCORECARD_ALREADY_SUBMITTED',
  'SCORING_NOT_OPEN_YET',
  'PICKED_UP_NOT_ALLOWED',
  'INVALID_HOLE',
  'SCORECARD_NOT_READY',
  'NOT_ORGANIZER',
  // Reabrir a un no presentado con la partida ya completa (QA 3, 12 oct 2026)
  'GROUP_FULL',
  // «Validar lo anotado» a quien tiene marcador (revisor)
  'PLAYER_HAS_MARKER',
  // Reabrir una tarjeta que ya estaba abierta, y dar por no presentado a
  // quien ya jugó (RyderCupAm#553)
  'SCORECARD_ALREADY_OPEN',
  'PLAYER_HAS_STROKES',
];

/**
 * @param {Function} t - El de `useTranslation('scoring')`
 * @param {Error} error
 * @returns {string}
 */
export const mensajeDeErrorDePartida = (t, error) => {
  const codigo = error?.errorCode;
  if (codigo === 'SCORECARD_NOT_READY' && Array.isArray(error.data?.holes) && error.data.holes.length > 0) {
    return t('partida.errors.SCORECARD_NOT_READY_holes', { count: error.data.holes.length, hoyos: error.data.holes.join(', ') });
  }
  if (CODIGOS_DE_PARTIDA.includes(codigo)) return t(`partida.errors.${codigo}`);
  return error?.message || t('partida.errors.generic');
};
