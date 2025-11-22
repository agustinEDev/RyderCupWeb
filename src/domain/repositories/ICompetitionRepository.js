// src/domain/repositories/ICompetitionRepository.js

/**
 * Interface for a competition repository.
 * This class should be extended by concrete repository implementations.
 *
 * In JavaScript, interfaces are simulated by classes that throw errors
 * for methods that must be implemented by subclasses.
 */
export class ICompetitionRepository {
  /**
   * Saves a competition (either creates a new one or updates an existing one).
   * @param {Competition} competition The competition entity to save.
   * @returns {Promise<void>}
   * @throws {Error} If the method is not implemented.
   */
  async save(competition) {
    throw new Error('ICompetitionRepository.save must be implemented');
  }

  /**
   * Finds a competition by its unique ID.
   * @param {CompetitionId} competitionId The ID of the competition to find.
   * @returns {Promise<?Competition>} The competition entity or null if not found.
   * @throws {Error} If the method is not implemented.
   */
  async findById(competitionId) {
    throw new Error('ICompetitionRepository.findById must be implemented');
  }

  /**
   * Finds all competitions.
   * @returns {Promise<Competition[]>} A list of all competition entities.
   * @throws {Error} If the method is not implemented.
   */
  async findAll() {
    throw new Error('ICompetitionRepository.findAll must be implemented');
  }

  /**
   * Deletes a competition by its unique ID.
   * @param {CompetitionId} competitionId The ID of the competition to delete.
   * @returns {Promise<void>}
   * @throws {Error} If the method is not implemented.
   */
  async delete(competitionId) {
    throw new Error('ICompetitionRepository.delete must be implemented');
  }

  /**
   * Finds competitions by their status.
   * @param {CompetitionStatus} status The status to filter by.
   * @returns {Promise<Competition[]>} A list of competitions with the given status.
   * @throws {Error} If the method is not implemented.
   */
  async findByStatus(status) {
    throw new Error('ICompetitionRepository.findByStatus must be implemented');
  }

  /**
   * Finds all competitions for a specific user (creator).
   * @param {string} userId The ID of the user/creator.
   * @param {object} filters Optional filters (status, etc.)
   * @returns {Promise<Competition[]>} A list of competitions created by the user.
   * @throws {Error} If the method is not implemented.
   */
  async findByCreator(userId, filters = {}) {
    throw new Error('ICompetitionRepository.findByCreator must be implemented');
  }
}
