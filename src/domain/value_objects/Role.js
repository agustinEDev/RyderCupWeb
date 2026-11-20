/**
 * Los roles con los que se protege una ruta o se enseña algo: el
 * administrador es global (`user.is_admin`), creador y jugador salen de la
 * relación con cada competición (Admin > Creator > Player, ADR-009).
 *
 * @readonly
 * @enum {string}
 */
export const Role = Object.freeze({
  ADMIN: 'ADMIN',
  CREATOR: 'CREATOR',
  PLAYER: 'PLAYER',
});
