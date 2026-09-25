/**
 * Qué toca ahora en una competición (FE #705).
 *
 * La ficha ofrecía hasta siete botones del mismo peso en seis colores, y el
 * que de verdad tocaba se perdía entre los demás. Aquí vive la regla de cuál
 * es ese, para que la pantalla ofrezca UNO y el resto viva en un menú.
 *
 * Devuelve el identificador de la acción, no la acción: quién sabe navegar o
 * abrir un modal es la pantalla, y así esto se puede probar como lo que es,
 * una tabla de estados.
 */

/**
 * @param {Object|null} competition - La competición, tal como la trae la ficha
 * @param {Object} [opciones]
 * @param {boolean} [opciones.puedeGestionar=true] - Si quien mira la organiza
 * @param {number} [opciones.inscritos] - Aprobados; sin él no se sabe si quedan plazas
 * @returns {string|null} El identificador del siguiente paso, o null si no hay
 */
export const siguientePasoDeLaCompeticion = (
  competition,
  { puedeGestionar = true, inscritos } = {}
) => {
  if (!competition) return null;

  const { status, setupMode, teamsAssigned, captains, maxPlayers } = competition;
  const hayCapitanes = Boolean(captains?.teamA && captains?.teamB);

  // Con el torneo en marcha o terminado, lo que todo el mundo quiere ver es
  // cómo va: también quien no organiza nada
  if (status === 'IN_PROGRESS' || status === 'COMPLETED') return 'leaderboard';

  // Lo demás son pasos de organizador
  if (!puedeGestionar) return null;

  if (status === 'DRAFT') return 'activate';

  if (status === 'ACTIVE') {
    // Nombrar a los capitanes es lo que cierra las inscripciones. Con los
    // equipos ya repartidos —una reabierta— los capitanes ya no se tocan, así
    // que lo que queda es volver a cerrar
    if (teamsAssigned) return 'close-enrollments';
    // Con plazas libres, invitar (#710): nombrarlos cierra las inscripciones y
    // deja sin plaza las invitaciones pendientes, y con 1 de 12 no es lo que
    // toca. Sigue en el menú para quien quiera cerrar antes
    // Sin saber cuántos hay o sin cupo, la comparación con `undefined` es
    // falsa: se sugiere como antes
    const quedanPlazas = inscritos < maxPlayers;
    return quedanPlazas ? 'manageInvitations' : 'nameCaptains';
  }

  if (status === 'CLOSED') {
    if (!teamsAssigned) {
      // La sala de draft es del tipo Ryder, y no tiene quién elija hasta que
      // hay capitanes: sin esto la ficha se quedaba sin acción principal
      // —la del draft no se ofrece— justo cuando nombrarlos es lo único que
      // hay que hacer
      if (setupMode !== 'RYDER_CUP') return 'manageSchedule';
      return hayCapitanes ? 'draft' : 'nameCaptains';
    }
    return 'manageSchedule';
  }

  // CANCELLED: no hay siguiente paso, solo el menú
  return null;
};
