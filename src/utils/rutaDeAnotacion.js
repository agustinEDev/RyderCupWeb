/**
 * Adónde lleva «Anotar» o «Ver tarjeta» de un partido o una partida: una sola
 * regla para el banner del panel y las tarjetas de «Mis próximos partidos»
 * (`/code-review`). La partida de stroke play lleva su competición, que su
 * pantalla necesita para leerla.
 *
 * @param {{id: string, competitionId: string, esPartidaDeFranja?: boolean}} partido
 * @returns {string}
 */
export const rutaDeAnotacion = (partido) =>
  partido.esPartidaDeFranja
    ? `/player/groups/${partido.id}/scoring?competition=${partido.competitionId}`
    : `/player/matches/${partido.id}/scoring`;
