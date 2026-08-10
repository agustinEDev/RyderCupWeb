const SESSION_ORDER = { MORNING: 0, AFTERNOON: 1, EVENING: 2 };
const UPCOMING_STATUSES = ['SCHEDULED', 'IN_PROGRESS'];

/**
 * Use Case: Get Upcoming Matches
 *
 * Los partidos que el jugador tiene por delante, de todas sus competiciones en
 * curso, del más próximo al más lejano.
 *
 * No hay endpoint que responda esto: hay que preguntar el calendario de cada
 * competición y quedarse con los partidos donde aparece el jugador. Por eso
 * vive en un caso de uso y no repetido en cada pantalla — antes lo calculaban
 * por su cuenta la página de próximos partidos y la tarjeta de acciones
 * pendientes, con criterios que podían separarse sin que nadie se enterara.
 *
 * Una competición que falle no tumba al resto: se descarta y se devuelve lo
 * que sí se pudo leer. Es un resumen, y media lista es más útil que ninguna.
 */
class GetUpcomingMatchesUseCase {
  #listUserCompetitionsUseCase;
  #getScheduleUseCase;
  #listEnrollmentsUseCase;

  constructor({ listUserCompetitionsUseCase, getScheduleUseCase, listEnrollmentsUseCase }) {
    if (!listUserCompetitionsUseCase || !getScheduleUseCase || !listEnrollmentsUseCase) {
      throw new Error(
        'GetUpcomingMatchesUseCase requires listUserCompetitionsUseCase, getScheduleUseCase and listEnrollmentsUseCase'
      );
    }
    this.#listUserCompetitionsUseCase = listUserCompetitionsUseCase;
    this.#getScheduleUseCase = getScheduleUseCase;
    this.#listEnrollmentsUseCase = listEnrollmentsUseCase;
  }

  /**
   * @param {string} userId
   * @param {Array} [competitions] - Competiciones ya cargadas, para no pedirlas otra vez
   */
  async execute(userId, competitions = null) {
    if (!userId) {
      throw new Error('GetUpcomingMatchesUseCase requires a userId');
    }

    const all = competitions ?? (await this.#listUserCompetitionsUseCase.execute(userId));
    // Solo las que están jugándose: en una competición sin empezar no hay
    // partido al que ir hoy
    const active = (all || []).filter((competition) => competition.status === 'IN_PROGRESS');
    if (active.length === 0) {
      return [];
    }

    const results = await Promise.allSettled(
      active.map((competition) => this.#matchesOf(competition, userId))
    );

    return results
      .filter((result) => result.status === 'fulfilled')
      .flatMap((result) => result.value)
      .sort(this.#byWhenItIsPlayed);
  }

  async #matchesOf(competition, userId) {
    const [schedule, enrollments] = await Promise.all([
      this.#getScheduleUseCase.execute(competition.id),
      this.#listEnrollmentsUseCase.execute(competition.id),
    ]);

    // Los partidos traen ids de usuario; los nombres viven en las inscripciones
    const namesByUserId = new Map();
    (enrollments || []).forEach((enrollment) => {
      if (enrollment.userId && enrollment.userName) {
        namesByUserId.set(enrollment.userId, enrollment.userName);
      }
    });
    const nameOf = (player) => namesByUserId.get(player.userId) || player.userId;

    const upcoming = [];
    (schedule?.rounds || []).forEach((round) => {
      (round.matches || []).forEach((match) => {
        const teamA = match.teamAPlayers || [];
        const teamB = match.teamBPlayers || [];
        const playsInTeamA = teamA.some((player) => player.userId === userId);
        const playsInTeamB = teamB.some((player) => player.userId === userId);

        if ((!playsInTeamA && !playsInTeamB) || !UPCOMING_STATUSES.includes(match.status)) {
          return;
        }

        const own = playsInTeamA ? teamA : teamB;
        const rival = playsInTeamA ? teamB : teamA;

        upcoming.push({
          ...match,
          competitionId: competition.id,
          competitionName: competition.name,
          roundDate: round.roundDate,
          sessionType: round.sessionType,
          matchFormat: round.matchFormat,
          golfCourseName: round.golfCourseName,
          teamAPlayerNames: teamA.map(nameOf),
          teamBPlayerNames: teamB.map(nameOf),
          // Vistos desde quien pregunta, que es como se leen: uno juega con sus
          // compañeros y contra sus rivales, no con "el equipo A"
          partnerNames: own.filter((player) => player.userId !== userId).map(nameOf),
          opponentNames: rival.map(nameOf),
        });
      });
    });

    return upcoming;
  }

  #byWhenItIsPlayed(a, b) {
    const byDate = (a.roundDate || '').localeCompare(b.roundDate || '');
    if (byDate !== 0) {
      return byDate;
    }
    // Mismo día: manda la sesión, que es lo único que ordena mañana y tarde
    return (SESSION_ORDER[a.sessionType] ?? 0) - (SESSION_ORDER[b.sessionType] ?? 0);
  }
}

export default GetUpcomingMatchesUseCase;
