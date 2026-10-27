/**
 * Lo de un amigo, abierto en lo suyo (release social 2): `?jugador=` marca su
 * tarjeta o su fila. Sin saber de quién, la ruta sin más.
 */
export const conJugador = (ruta, jugador) =>
  jugador ? `${ruta}?jugador=${encodeURIComponent(jugador)}` : ruta;

/** La clasificación de una competición, en la fila de un jugador. */
export const rutaEnSuFila = (competitionId, jugador) =>
  conJugador(`/competitions/${competitionId}/leaderboard`, jugador);
