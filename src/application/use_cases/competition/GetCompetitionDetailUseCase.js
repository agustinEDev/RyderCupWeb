import { ICompetitionRepository } from '../../../domain/repositories/ICompetitionRepository';
import CompetitionMapper from '../../../infrastructure/mappers/CompetitionMapper';

/**
 * Use Case: Get Competition Detail
 *
 * Retrieves the full details of a competition by its ID.
 * Returns a simple DTO optimized for the UI, including all competition
 * information such as location details, dates, settings, and status.
 */
class GetCompetitionDetailUseCase {
  /**
   * @param {Object} deps - The dependencies object.
   * @param {ICompetitionRepository} deps.competitionRepository - The competition repository.
   */
  constructor({ competitionRepository }) {
    this.competitionRepository = competitionRepository;
  }

  /**
   * Executes the use case to get competition details.
   *
   * @param {string} competitionId - The ID of the competition to retrieve.
   * @returns {Promise<Object>} - A simple DTO for the UI with all competition details.
   * @throws {Error} If competitionId is not provided or competition is not found.
   */
  async execute(competitionId) {
    // Validate input
    if (!competitionId) {
      throw new Error('Competition ID is required');
    }

    // Fetch competition from repository (returns domain entity)
    const competition = await this.competitionRepository.findById(competitionId);

    // Convert domain entity to simple DTO for UI
    // Pass original API data for location names parsing
    return CompetitionMapper.toSimpleDTO(competition, competition._apiData);
  }
}

export default GetCompetitionDetailUseCase;
