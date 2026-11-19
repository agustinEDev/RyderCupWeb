/**
 * En qué punto está la tarjeta de un jugador en su partida de stroke play.
 *
 * - JUGANDO: se está anotando (o aún no ha empezado)
 * - ENTREGADA: el jugador (o el organizador) la entregó
 * - RETIRADO: lo dejó a medias
 * - NO_PRESENTADO: no se presentó
 *
 * Los valores son los del backend, con la misma grafía
 * (modules/competition/domain/value_objects/estado_de_tarjeta.py, EstadoDeTarjeta).
 */
const CardStatus = Object.freeze({
  JUGANDO: 'JUGANDO',
  ENTREGADA: 'ENTREGADA',
  RETIRADO: 'RETIRADO',
  NO_PRESENTADO: 'NO_PRESENTADO',
});

export default CardStatus;
