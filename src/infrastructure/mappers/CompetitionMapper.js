import Competition from '../../domain/entities/Competition';
import { CompetitionId } from '../../domain/value_objects/CompetitionId';
import { CompetitionName } from '../../domain/value_objects/CompetitionName';
import { DateRange } from '../../domain/value_objects/DateRange';
import { Location } from '../../domain/value_objects/Location';
import { CountryCode } from '../../domain/value_objects/CountryCode';
import { HandicapSettings } from '../../domain/value_objects/HandicapSettings';
import { TeamAssignment } from '../../domain/value_objects/TeamAssignment';
import { CompetitionStatus } from '../../domain/value_objects/CompetitionStatus';
import { getCountryFlag } from '../../utils/countryUtils';

/**
 * Mapper to convert between API DTOs and Domain Entities
 */
class CompetitionMapper {
  /**
   * Maps API response (snake_case) to Competition domain entity
   * @param {Object} apiData - Raw data from API
   * @returns {Competition} - Domain entity
   */
  static toDomain(apiData) {
    try {
      // Map location from API response
      // API now gives: country_code, secondary_country_code, tertiary_country_code
      const mainCountry = new CountryCode(apiData.country_code || 'ES');

      // Handle adjacent countries from individual fields
      const adjacentCountry1 = apiData.secondary_country_code
        ? new CountryCode(apiData.secondary_country_code)
        : null;
      const adjacentCountry2 = apiData.tertiary_country_code
        ? new CountryCode(apiData.tertiary_country_code)
        : null;

      const location = new Location(mainCountry, adjacentCountry1, adjacentCountry2);

      // Map date range
      const dates = new DateRange(
        new Date(apiData.start_date),
        new Date(apiData.end_date)
      );

      // Map handicap settings
      const handicapSettings = new HandicapSettings(
        apiData.handicap_type || 'SCRATCH',
        apiData.handicap_percentage || null
      );

    // Map team assignment
    const teamAssignment = new TeamAssignment(apiData.team_assignment || 'MANUAL');

    // Create Competition entity
    return new Competition({
      id: new CompetitionId(apiData.id),
      creatorId: apiData.creator_id || apiData.created_by,
      name: new CompetitionName(apiData.name),
      dates,
      location,
      team1Name: apiData.team_1_name || apiData.team_one_name || apiData.team1_name || 'Team 1',
      team2Name: apiData.team_2_name || apiData.team_two_name || apiData.team2_name || 'Team 2',
      handicapSettings,
      maxPlayers: apiData.max_players || 24,
      teamAssignment,
      status: new CompetitionStatus(apiData.status || 'DRAFT'),
      createdAt: new Date(apiData.created_at),
      updatedAt: new Date(apiData.updated_at)
    });
    } catch (error) {
      console.error('❌ Error in CompetitionMapper.toDomain:', error);
      console.error('API Data:', apiData);
      throw new Error(`Failed to map competition data: ${error.message}`);
    }
  }

  /**
   * Maps Competition entity to API DTO (for persistence)
   * @param {Competition} competition - Domain entity
   * @returns {Object} - API-compatible DTO
   */
  static toDTO(competition) {
    return {
      id: competition.id.toString(),
      name: competition.name.toString(),
      team_one_name: competition.team1Name,
      team_two_name: competition.team2Name,
      start_date: competition.dates.startDate.toISOString().split('T')[0],
      end_date: competition.dates.endDate.toISOString().split('T')[0],
      main_country: competition.location.mainCountry().value(),
      countries: competition.location.getAllCountries().slice(1).map(c => c.value()),
      handicap_type: competition.handicapSettings.type(),
      handicap_percentage: competition.handicapSettings.percentage(),
      max_players: competition.maxPlayers,
      team_assignment: competition.teamAssignment.value(),
      status: competition.status.value,
      creator_id: competition.creatorId
    };
  }

  /**
   * Maps Competition entity to a simple DTO for UI presentation
   * This is useful when the UI doesn't need the full entity complexity
   * @param {Competition} competition - Domain entity
   * @param {Object} apiData - Original API data (optional, for location string)
   * @returns {Object} - Simple DTO for UI
   */
  static toSimpleDTO(competition, apiData = null) {
    try {
      // Use countries array from API if available, otherwise build from domain
      let countries = [];

      if (apiData?.countries && Array.isArray(apiData.countries)) {
        // Use countries from API with full names in English and Spanish
        countries = apiData.countries.map((country, index) => ({
          code: country.code,
          name: country.name_en, // Use English name by default (could use name_es for Spanish)
          nameEn: country.name_en,
          nameEs: country.name_es,
          flag: getCountryFlag(country.code),
          isMain: index === 0
        }));
      } else {
        // Fallback: build from domain Location value object
        const allCountries = competition.location.getAllCountries();
        const countryCodes = allCountries.map(countryCode => countryCode.value());

        countries = countryCodes.map((code, index) => ({
          code: code,
          name: code, // Fallback to ISO code if no API data
          flag: getCountryFlag(code),
          isMain: index === 0
        }));
      }
      const dto = {
        id: competition.id.toString(),
        name: competition.name.toString(),
        team1Name: competition.team1Name,
        team2Name: competition.team2Name,
        startDate: competition.dates.startDate.toISOString().split('T')[0],
        endDate: competition.dates.endDate.toISOString().split('T')[0],
        location: apiData?.location || competition.location.toString(), // String for backward compatibility
        countries: countries, // Array with main country (full name) + adjacent (ISO codes)
        status: competition.status.value,
        maxPlayers: competition.maxPlayers,
        enrolledCount: apiData?.enrolled_count || 0, // From API, not in domain
        isCreator: apiData?.is_creator || false, // From API, not in domain
        creatorId: competition.creatorId,
        // Map creator from API data (convert snake_case to camelCase)
        creator: apiData?.creator ? {
          id: apiData.creator.id,
          firstName: apiData.creator.first_name,
          lastName: apiData.creator.last_name,
          email: apiData.creator.email,
          handicap: apiData.creator.handicap,
          countryCode: apiData.creator.country_code
        } : null,
        createdAt: competition.createdAt.toISOString(),
        updatedAt: competition.updatedAt.toISOString(),
        // Enrollment status (for competitions where user is enrolled, not creator)
        enrollment_status: apiData?.user_enrollment_status || null, // PENDING, APPROVED, REJECTED, etc.
        // Pending enrollments count (for creators to see incoming requests)
        pending_enrollments_count: apiData?.pending_enrollments_count || 0,
        // Additional fields from domain
        handicapType: competition.handicapSettings.type(),
        handicapPercentage: competition.handicapSettings.percentage(),
        teamAssignment: competition.teamAssignment.value()
      };
      return dto;
    } catch (error) {
      console.error('❌ Error in toSimpleDTO:', error);
      throw error;
    }
  }
}

export default CompetitionMapper;
