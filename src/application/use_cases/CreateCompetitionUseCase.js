import { ICompetitionRepository } from '../../domain/repositories/ICompetitionRepository';

class CreateCompetitionUseCase {
  /**
   * @param {Object} deps - The dependencies object.
   * @param {ICompetitionRepository} deps.competitionRepository - The competition repository.
   */
  constructor({ competitionRepository }) {
    this.competitionRepository = competitionRepository;
  }

  /**
   * Executes the use case.
   * @param {Object} competitionData - The data for the new competition.
   * @returns {Promise<any>} - The newly created competition entity.
   */
  async execute(competitionData) {
    const newCompetition = await this.competitionRepository.save(competitionData);
    return newCompetition;
  }
}

export default CreateCompetitionUseCase;
