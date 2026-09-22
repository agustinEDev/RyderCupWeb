import { getCountryFlag } from '../../utils/countryUtils';

/**
 * CompetitionAssembler - Application Layer
 *
 * Converts Competition domain entities to simple DTOs for the UI.
 * This responsibility belongs in the application layer (not infrastructure)
 * because it serves the use cases, not the persistence mechanism.
 */
class CompetitionAssembler {
  /**
   * Maps Competition entity to a simple DTO for UI presentation.
   *
   * @param {Competition} competition - Domain entity
   * @param {Object} apiData - Original API data (optional, for location string)
   * @returns {Object} - Simple DTO for UI
   */
  static toSimpleDTO(competition, apiData = null) {
    // Use countries array from API if available, otherwise build from domain
    let countries = [];

    if (apiData?.countries && Array.isArray(apiData.countries)) {
      countries = apiData.countries.map((country, index) => ({
        code: country.code,
        name: country.name_en,
        nameEn: country.name_en,
        nameEs: country.name_es,
        // También con la grafía del backend: es la que entienden `countries.js`
        // y sus ayudantes. Sin ella, un país de aquí se pintaba bien pero el
        // buscador de países lo filtraba a cero en cuanto se tecleaba algo
        name_en: country.name_en,
        name_es: country.name_es,
        flag: getCountryFlag(country.code),
        isMain: index === 0
      }));
    } else {
      const allCountries = competition.location.getAllCountries();
      const countryCodes = allCountries.map(countryCode => countryCode.value());

      countries = countryCodes.map((code, index) => ({
        code: code,
        name: code,
        flag: getCountryFlag(code),
        isMain: index === 0
      }));
    }

    return {
      id: competition.id.toString(),
      name: competition.name.toString(),
      team1Name: competition.team1Name,
      team2Name: competition.team2Name,
      startDate: competition.dates.startDate.toISOString().split('T')[0],
      endDate: competition.dates.endDate.toISOString().split('T')[0],
      location: apiData?.location || competition.location.toString(),
      countries: countries,
      status: competition.status.value,
      maxPlayers: competition.maxPlayers,
      visibility: competition.visibility,
      // Cuántos días antes del torneo abren solas las inscripciones, o null si
      // se abren al invitar (FE #678). Sin esto la ficha no puede decir cuándo
      enrollmentOpensDaysBefore: apiData?.enrollment_opens_days_before ?? null,
      // Si quien la mira puede borrarla ahora (FE #667). Lo decide el backend con la
      // misma regla que el borrado —estado, nada jugado y quién— y solo lo manda la
      // ficha (RyderCupAM#347); sin el campo, no se ofrece
      canDelete: apiData?.can_delete === true,
      // Cuánto monta la app por su cuenta (FE #695). De él sale además cómo se
      // reparten los equipos, que ya no se pregunta aparte (RyderCupAm#351)
      setupMode: apiData?.setup_mode || 'RYDER_CUP',
      // Si ya hay equipos repartidos: con ellos los capitanes no se cambian, y una
      // reabierta se vuelve a cerrar con «Cerrar inscripciones» (FE #692). Solo lo
      // manda la ficha; sin el campo, no se afirma un reparto que nadie ha dicho
      teamsAssigned: apiData?.teams_assigned === true,
      // Capitanes y subcapitanes, uno por equipo (FE #692, RyderCupAM#320)
      captains: {
        teamA: apiData?.team_a_captain_id ?? null,
        teamB: apiData?.team_b_captain_id ?? null,
        viceTeamA: apiData?.team_a_vice_captain_id ?? null,
        viceTeamB: apiData?.team_b_vice_captain_id ?? null,
      },
      enrolledCount: apiData?.enrolled_count || 0,
      isCreator: apiData?.is_creator || false,
      creatorId: competition.creatorId,
      creator: apiData?.creator ? {
        id: apiData.creator.id,
        firstName: apiData.creator.first_name,
        lastName: apiData.creator.last_name,
        handicap: apiData.creator.handicap,
        countryCode: apiData.creator.country_code
      } : null,
      createdAt: competition.createdAt.toISOString(),
      updatedAt: competition.updatedAt.toISOString(),
      enrollment_status: apiData?.user_enrollment_status || null,
      pending_enrollments_count: apiData?.pending_enrollments_count || 0,
      playMode: competition.handicapSettings.type(),
      teamAssignment: competition.teamAssignment.value(),
      maxPlayingHandicap: apiData?.max_playing_handicap ?? null
    };
  }
}

export default CompetitionAssembler;
