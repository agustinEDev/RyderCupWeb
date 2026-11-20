import { nombreVisible } from '../../utils/nombreVisible';
import { getCountryFlag } from '../../utils/countryUtils';
import { Modality } from '../../domain/value_objects/Modality';

import { SetupMode } from '../../domain/value_objects/SetupMode';
/** @typedef {import('../../domain/entities/Competition').default} Competition */
/** @typedef {import('../../domain/repositories/ICompetitionRepository').CompetitionExtras} CompetitionExtras */

// Un jugador de la actualización de hándicaps: el que falta por preguntar y el
// que se quedó sin actualizar llegan igual
const aJugadorDeLaActualizacion = (p) => ({ userId: p.userId, name: p.name });

/**
 * CompetitionAssembler - Application Layer
 *
 * Converts Competition domain entities to simple DTOs for the UI.
 * This responsibility belongs in the application layer (not infrastructure)
 * because it serves the use cases, not the persistence mechanism.
 */
class CompetitionAssembler {
  /**
   * Los ajustes de un Stableford o un Medal, en plano (FE #824). Una sola
   * conversión: la ficha y el PATCH devuelven la misma forma, y el formulario
   * compara una con otra para saber qué cambió (/code-review).
   * @param {import('../../domain/value_objects/StrokePlaySetup').StrokePlaySetup} ajustes
   */
  static toStrokePlayDTO(ajustes) {
    return {
      categoryLimits: [...ajustes.categoryLimits],
      categoryCount: ajustes.categoryCount,
      maxMatchdaysPerPlayer: ajustes.maxMatchdaysPerPlayer,
      overallStanding: ajustes.overallStanding,
    };
  }

  /**
   * Maps Competition entity to a simple DTO for UI presentation.
   *
   * @param {Competition} competition - Domain entity
   * @param {CompetitionExtras|null} [extras] - Lo que llegó de la API y la
   *   entidad no guarda (país con nombres, ficha del organizador…), en camelCase
   * @returns {Object} - Simple DTO for UI
   */
  static toSimpleDTO(competition, extras = null) {
    // Use countries array from API if available, otherwise build from domain
    let countries = [];

    if (extras?.countries && Array.isArray(extras.countries)) {
      countries = extras.countries.map((country, index) => ({
        code: country.code,
        name: country.nameEn,
        nameEn: country.nameEn,
        nameEs: country.nameEs,
        // También con la grafía del backend: es la que entienden `countries.js`
        // y sus ayudantes. Sin ella, un país de aquí se pintaba bien pero el
        // buscador de países lo filtraba a cero en cuanto se tecleaba algo
        name_en: country.nameEn,
        name_es: country.nameEs,
        flag: getCountryFlag(country.code),
        isMain: index === 0,
      }));
    } else {
      const allCountries = competition.location.getAllCountries();
      const countryCodes = allCountries.map((countryCode) =>
        countryCode.value(),
      );

      countries = countryCodes.map((code, index) => ({
        code: code,
        name: code,
        flag: getCountryFlag(code),
        isMain: index === 0,
      }));
    }

    return {
      id: competition.id.toString(),
      name: competition.name.toString(),
      // Si tiene la pieza de la Ryder (equipos, reparto, modo y capitanes). Las
      // pantallas preguntan esto, no el tipo (FE #791)
      hasTeams: competition.hasTeams,
      team1Name: competition.ryderCup?.team1Name ?? null,
      team2Name: competition.ryderCup?.team2Name ?? null,
      startDate: competition.dates.startDate.toISOString().split('T')[0],
      endDate: competition.dates.endDate.toISOString().split('T')[0],
      location: extras?.location || competition.location.toString(),
      countries: countries,
      status: competition.status.value,
      maxPlayers: competition.maxPlayers,
      visibility: competition.visibility,
      // Cuántos días antes del torneo abren solas las inscripciones, o null si
      // se abren al invitar (FE #678). Sin esto la ficha no puede decir cuándo
      enrollmentOpensDaysBefore: extras?.enrollmentOpensDaysBefore ?? null,
      // El plazo de inscripción (15 nov 2026, RyderCupAm #865): las 12:00 del
      // día anterior con el desfase del campo; si vale para esta (no, si se
      // abrió a mano pasado el plazo), y si la cerró el plazo y no el organizador
      enrollmentDeadline:
        typeof extras?.enrollmentDeadline === 'string'
          ? extras.enrollmentDeadline
          : null,
      enrollmentDeadlineApplies: extras?.enrollmentDeadlineApplies === true,
      enrollmentClosedByDeadline: extras?.enrollmentClosedByDeadline === true,
      // Si quien la mira puede borrarla ahora (FE #667). Lo decide el backend con la
      // misma regla que el borrado —estado, nada jugado y quién— y solo lo manda la
      // ficha (RyderCupAM#347); sin el campo, no se ofrece
      canDelete: extras?.canDelete === true,
      // Qué torneo es y su modalidad (FE #791, RyderCupAm#251). Una respuesta
      // de antes del tipo es una Ryder Cup: es lo que eran todas
      tournamentType: competition.tournamentType,
      // Categorías, jornadas por jugador y general de un Stableford o un Medal
      // (FE #824); null en una Ryder
      strokePlay: competition.strokePlay
        ? CompetitionAssembler.toStrokePlayDTO(competition.strokePlay)
        : null,
      // La última actualización de hándicaps y la ventana del botón (FE #824).
      // Solo le llegan al organizador: a los demás, null
      handicapUpdate: extras?.handicapUpdate
        ? {
            status: extras.handicapUpdate.status,
            origin: extras.handicapUpdate.origin,
            startedAt: extras.handicapUpdate.startedAt,
            finishedAt: extras.handicapUpdate.finishedAt ?? null,
            pendingPlayers: (extras.handicapUpdate.pendingPlayers || []).map(
              aJugadorDeLaActualizacion,
            ),
            // Los mismos que el aviso al organizador «{N} jugadores sin
            // actualizar con la RFEG» (15 nov 2026). Null si el servidor es de
            // antes del campo: la tarjeta sigue con pendingPlayers
            notUpdatedPlayers: Array.isArray(
              extras.handicapUpdate.notUpdatedPlayers,
            )
              ? extras.handicapUpdate.notUpdatedPlayers.map(
                  aJugadorDeLaActualizacion,
                )
              : null,
          }
        : null,
      handicapUpdateWindow: extras?.handicapUpdateWindow
        ? {
            open: extras.handicapUpdateWindow.open,
            closesAt: extras.handicapUpdateWindow.closesAt ?? null,
            reason: extras.handicapUpdateWindow.reason ?? null,
            // El motivo como código, para decirlo en el idioma de la app (RyderCupAm#541)
            reasonCode: extras.handicapUpdateWindow.reasonCode ?? null,
            scheduledAt: extras.handicapUpdateWindow.scheduledAt ?? null,
          }
        : null,
      // Lo que pinta la tarjeta de «Mis competiciones» (FE #846, RyderCupAm#558).
      // Sin el campo (un servidor anterior), null: no se sabe, que no es «ninguno»
      golfCourses: Array.isArray(extras?.golfCourses)
        ? extras.golfCourses.map((c) => ({
            id: c.id,
            name: c.name,
            countryCode: c.countryCode,
          }))
        : null,
      // Cuántos días se juega en un stroke play; null en una Ryder
      playingDays: extras?.playingDays ?? null,
      // Mi próxima salida, solo si juego en ella; la hora, si ya se sabe
      myNextSession: extras?.myNextSession
        ? {
            date: extras.myNextSession.date,
            sessionType: extras.myNextSession.sessionType,
            teeTime: extras.myNextSession.teeTime ?? null,
          }
        : null,
      // Mi invitación pendiente, solo si aceptarla puede salir bien: el cuadro
      // de la ficha (release social 2)
      myPendingInvitation: extras?.myPendingInvitation
        ? {
            id: extras.myPendingInvitation.id,
            expiresAt: extras.myPendingInvitation.expiresAt ?? null,
          }
        : null,
      modality: extras?.modality || Modality.MATCH_PLAY,
      // Cuánto monta la app por su cuenta (FE #695). De él sale además cómo se
      // reparten los equipos, que ya no se pregunta aparte (RyderCupAm#351).
      // Solo una Ryder lo tiene: a un Stableford no se le inventa
      setupMode:
        extras?.setupMode ||
        (competition.hasTeams ? SetupMode.RYDER_CUP : null),
      // Si ya hay equipos repartidos: con ellos los capitanes no se cambian, y una
      // reabierta se vuelve a cerrar con «Cerrar inscripciones» (FE #692). Solo lo
      // manda la ficha; sin el campo, no se afirma un reparto que nadie ha dicho
      teamsAssigned: extras?.teamsAssigned === true,
      // Qué ve quien mira de los inscritos: ALL, FRIENDS o NONE (release social 2).
      // Solo lo manda la ficha
      enrolledVisibility: extras?.enrolledVisibility ?? null,
      // Capitanes y subcapitanes, uno por equipo (FE #692, RyderCupAM#320)
      captains: {
        teamA: extras?.teamACaptainId ?? null,
        teamB: extras?.teamBCaptainId ?? null,
        viceTeamA: extras?.teamAViceCaptainId ?? null,
        viceTeamB: extras?.teamBViceCaptainId ?? null,
      },
      enrolledCount: extras?.enrolledCount || 0,
      isCreator: extras?.isCreator || false,
      creatorId: competition.creatorId,
      creator: extras?.creator
        ? {
            id: extras.creator.id,
            firstName: extras.creator.firstName,
            lastName: extras.creator.lastName,
            // Lo que hay que pintar: en una privada con alias, nombre y apellidos
            // llegan vacíos para quien no es el organizador ni un admin (SB-08)
            displayName: nombreVisible(extras.creator),
            alias: extras.creator.alias ?? null,
            handicap: extras.creator.handicap,
            countryCode: extras.creator.countryCode,
          }
        : null,
      createdAt: competition.createdAt.toISOString(),
      updatedAt: competition.updatedAt.toISOString(),
      enrollment_status: extras?.userEnrollmentStatus || null,
      pending_enrollments_count: extras?.pendingEnrollmentsCount || 0,
      playMode: competition.handicapSettings.type(),
      // El modo con el que se CONFIGURÓ: decide si se reparte solo al cerrar
      teamAssignment: competition.ryderCup?.teamAssignment?.value() ?? null,
      // Cómo se repartieron DE VERDAD, si ya se repartieron: del tipo Ryder
      // sale MANUAL, así que unos equipos elegidos uno a uno en la sala de
      // draft se contaban como hechos a mano. Va aparte para no pisar el
      // configurado: una automática rehecha a mano, al reabrir y volver a
      // cerrar, dejaría sin equipo a los que entraron después. Solo lo manda
      // la ficha; los listados, no
      actualTeamAssignment: extras?.actualTeamAssignment ?? null,
      maxPlayingHandicap: extras?.maxPlayingHandicap ?? null,
    };
  }
}

export default CompetitionAssembler;
