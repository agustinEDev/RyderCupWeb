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
      teamAssignment: competition.teamAssignment.value()
    };
  }
}

export default CompetitionAssembler;
