import { ICompetitionRepository } from '../../domain/repositories/ICompetitionRepository';
import CompetitionMapper from '../../infrastructure/mappers/CompetitionMapper';

class CreateCompetitionUseCase {
  /**
   * @param {Object} deps - The dependencies object.
   * @param {ICompetitionRepository} deps.competitionRepository - The competition repository.
   */
  constructor({ competitionRepository }) {
    this.competitionRepository = competitionRepository;
  }

  /**
   * Executes the use case to create a new competition.
   * @param {Object} competitionData - The data for the new competition (API DTO format).
   * @returns {Promise<Object>} - A simple DTO for the UI with essential fields.
   */
  async execute(competitionData) {
    // TODO: Add domain validations here before persisting
    // TODO: Transform competitionData to domain entity if needed

    // Save via repository (returns domain entity)
    const newCompetition = await this.competitionRepository.save(competitionData);

    // Convert domain entity to simple DTO for UI
    // This prevents the UI from depending on complex domain Value Objects
    return CompetitionMapper.toSimpleDTO(newCompetition);
  }
}

export default CreateCompetitionUseCase;
