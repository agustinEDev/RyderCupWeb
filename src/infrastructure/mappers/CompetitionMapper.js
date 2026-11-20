import Competition from '../../domain/entities/Competition';
import { CompetitionId } from '../../domain/value_objects/CompetitionId';
import { CompetitionName } from '../../domain/value_objects/CompetitionName';
import { DateRange } from '../../domain/value_objects/DateRange';
import { Location } from '../../domain/value_objects/Location';
import { CountryCode } from '../../domain/value_objects/CountryCode';
import { HandicapSettings } from '../../domain/value_objects/HandicapSettings';
import { TeamAssignment } from '../../domain/value_objects/TeamAssignment';
import {
  CompetitionStatus,
  CompetitionStatusEnum,
} from '../../domain/value_objects/CompetitionStatus';
import { StrokePlaySetup } from '../../domain/value_objects/StrokePlaySetup';
import { instanteDeLaApi } from '../../utils/instanteDeLaApi';

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

      const location = new Location(
        mainCountry,
        adjacentCountry1,
        adjacentCountry2,
      );

      // Map date range
      const dates = new DateRange(
        new Date(apiData.start_date),
        new Date(apiData.end_date),
      );

      // Map handicap settings (play_mode replaces handicap_type/handicap_percentage)
      const handicapSettings = new HandicapSettings(
        apiData.play_mode || apiData.handicap_type || 'SCRATCH',
      );

      // Map team assignment. Si el torneo no tiene equipos, la entidad lo
      // descarta: la regla vive en ella (FE #791)
      const teamAssignment = new TeamAssignment(
        apiData.team_assignment || 'MANUAL',
      );

      // Bidirectional mapping for maxPlayers/number_of_players
      // Prefer number_of_players (current API contract), fallback to max_players (legacy)
      const maxPlayers = apiData.number_of_players ?? apiData.max_players ?? 24;

      // Create Competition entity
      return new Competition({
        id: new CompetitionId(apiData.id),
        creatorId: apiData.creator_id || apiData.created_by,
        name: new CompetitionName(apiData.name),
        dates,
        location,
        team1Name:
          apiData.team_1_name ||
          apiData.team_one_name ||
          apiData.team1_Name ||
          'Team 1',
        team2Name:
          apiData.team_2_name ||
          apiData.team_two_name ||
          apiData.team2_name ||
          'Team 2',
        // Una respuesta de antes del tipo es una Ryder Cup
        tournamentType: apiData.tournament_type || 'RYDER_CUP',
        strokePlay: CompetitionMapper.ajustesDeStrokePlay(apiData),
        handicapSettings,
        maxPlayers,
        teamAssignment,
        // Sin el campo, privada: una respuesta de antes de que existiera no
        // convierte en pública una competición que no lo es (FE #664)
        visibility: apiData.visibility || 'PRIVATE',
        status: new CompetitionStatus(
          apiData.status || CompetitionStatusEnum.DRAFT,
        ),
        createdAt: instanteDeLaApi(apiData.created_at),
        updatedAt: instanteDeLaApi(apiData.updated_at),
      });
    } catch (error) {
      throw Object.assign(
        new Error(`Failed to map competition data: ${error.message}`, {
          cause: error,
        }),
        { mensajeTecnico: true },
      );
    }
  }

  /**
   * Los ajustes del stroke play de la respuesta (FE #824, RyderCupAm#536), o
   * undefined si no vienen: un listado no los trae, y entonces la entidad pone
   * los de por defecto a un stroke play y ninguno a una Ryder. Los límites
   * llegan como texto («12.0»), como todo `Decimal` de la API.
   */
  static ajustesDeStrokePlay(apiData) {
    const ajustes = apiData.stroke_play;
    if (!ajustes) return undefined;
    return new StrokePlaySetup({
      categoryLimits: (ajustes.category_limits ?? []).map(Number),
      // Una respuesta de antes del contador es de límites a mano
      categoryCount: ajustes.category_count ?? null,
      maxMatchdaysPerPlayer: ajustes.max_matchdays_per_player ?? 1,
      overallStanding: ajustes.overall_standing ?? undefined,
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
      team_one_name: competition.ryderCup?.team1Name ?? null,
      team_two_name: competition.ryderCup?.team2Name ?? null,
      start_date: competition.dates.startDate.toISOString().split('T')[0],
      end_date: competition.dates.endDate.toISOString().split('T')[0],
      main_country: competition.location.mainCountry().value(),
      countries: competition.location
        .getAllCountries()
        .slice(1)
        .map((c) => c.value()),
      play_mode: competition.handicapSettings.type(),
      number_of_players: competition.maxPlayers, // Use API contract field name
      team_assignment: competition.ryderCup?.teamAssignment?.value() ?? null,
      status: competition.status.value,
      creator_id: competition.creatorId,
    };
  }
}

export default CompetitionMapper;
