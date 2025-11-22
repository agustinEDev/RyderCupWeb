import Competition from '../../domain/entities/Competition';
import { CompetitionId } from '../../domain/value_objects/CompetitionId';
import { CompetitionName } from '../../domain/value_objects/CompetitionName';
import { DateRange } from '../../domain/value_objects/DateRange';
import { Location } from '../../domain/value_objects/Location';
import { CountryCode } from '../../domain/value_objects/CountryCode';
import { HandicapSettings } from '../../domain/value_objects/HandicapSettings';
import { TeamAssignment } from '../../domain/value_objects/TeamAssignment';
import { CompetitionStatus } from '../../domain/value_objects/CompetitionStatus';

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
    // Map location
    const adjacentCountries = (apiData.countries || []).map(code => new CountryCode(code));
    const location = new Location({
      mainCountry: new CountryCode(apiData.main_country),
      adjacentCountries
    });

    // Map date range
    const dates = new DateRange({
      startDate: new Date(apiData.start_date),
      endDate: new Date(apiData.end_date)
    });

    // Map handicap settings
    const handicapSettings = new HandicapSettings({
      type: apiData.handicap_type,
      percentage: apiData.handicap_percentage,
      source: apiData.player_handicap
    });

    // Map team assignment
    const teamAssignment = new TeamAssignment(apiData.team_assignment);

    // Create Competition entity
    return new Competition({
      id: new CompetitionId(apiData.id),
      creatorId: apiData.creator_id,
      name: new CompetitionName(apiData.name),
      dates,
      location,
      team1Name: apiData.team_one_name,
      team2Name: apiData.team_two_name,
      handicapSettings,
      maxPlayers: apiData.max_players,
      teamAssignment,
      status: new CompetitionStatus(apiData.status),
      createdAt: new Date(apiData.created_at),
      updatedAt: new Date(apiData.updated_at)
    });
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
      main_country: competition.location.mainCountry.code,
      countries: competition.location.adjacentCountries.map(c => c.code),
      handicap_type: competition.handicapSettings.type,
      handicap_percentage: competition.handicapSettings.percentage,
      player_handicap: competition.handicapSettings.source,
      max_players: competition.maxPlayers,
      team_assignment: competition.teamAssignment.value,
      status: competition.status.value,
      creator_id: competition.creatorId
    };
  }

  /**
   * Maps Competition entity to a simple DTO for UI presentation
   * This is useful when the UI doesn't need the full entity complexity
   * @param {Competition} competition - Domain entity
   * @returns {Object} - Simple DTO for UI
   */
  static toSimpleDTO(competition) {
    return {
      id: competition.id.toString(),
      name: competition.name.toString(),
      team1Name: competition.team1Name,
      team2Name: competition.team2Name,
      startDate: competition.dates.startDate.toISOString().split('T')[0],
      endDate: competition.dates.endDate.toISOString().split('T')[0],
      status: competition.status.value,
      maxPlayers: competition.maxPlayers,
      creatorId: competition.creatorId
    };
  }
}

export default CompetitionMapper;
