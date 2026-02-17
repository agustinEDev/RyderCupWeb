// src/domain/repositories/ICompetitionRepository.js

/**
 * Interface for a competition repository.
 * This class should be extended by concrete repository implementations.
 *
 * In JavaScript, interfaces are simulated by classes that throw errors
 * for methods that must be implemented by subclasses.
 */
export /* eslint-disable no-unused-vars */

class ICompetitionRepository {
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

  /**
   * Finds public competitions with optional filters.
   * This method is used to browse competitions that are publicly visible.
   *
   * @param {object} filters Optional filters for the search.
   * @param {string|string[]} filters.status Competition status (e.g., 'ACTIVE', ['CLOSED', 'IN_PROGRESS'])
   * @param {string} filters.searchName Search by competition name (partial match)
   * @param {string} filters.searchCreator Search by creator name (partial match)
   * @param {boolean} filters.excludeMyCompetitions If true, excludes competitions where user is creator or enrolled
   * @param {number} filters.limit Maximum number of results
   * @param {number} filters.offset Pagination offset
   * @returns {Promise<Competition[]>} A list of public competitions matching the filters.
   * @throws {Error} If the method is not implemented.
   */
  async findPublic(filters = {}) {
    throw new Error('ICompetitionRepository.findPublic must be implemented');
  }

  /**
   * Adds a golf course to a competition.
   * Only allowed when competition status is DRAFT.
   *
   * @param {string} competitionId The ID of the competition.
   * @param {string} golfCourseId The ID of the golf course to add.
   * @returns {Promise<object>} The association details (competition_id, golf_course_id, display_order, added_at).
   * @throws {Error} If the method is not implemented.
   */
  async addGolfCourse(competitionId, golfCourseId) {
    throw new Error('ICompetitionRepository.addGolfCourse must be implemented');
  }

  /**
   * Removes a golf course from a competition.
   * Only allowed when competition status is DRAFT.
   *
   * @param {string} competitionId The ID of the competition.
   * @param {string} golfCourseId The ID of the golf course to remove.
   * @returns {Promise<object>} The removal confirmation (competition_id, golf_course_id, removed_at).
   * @throws {Error} If the method is not implemented.
   */
  async removeGolfCourse(competitionId, golfCourseId) {
    throw new Error('ICompetitionRepository.removeGolfCourse must be implemented');
  }

  /**
   * Reorders golf courses in a competition.
   * Only allowed when competition status is DRAFT.
   *
   * @param {string} competitionId The ID of the competition.
   * @param {string[]} golfCourseIds Array of golf course IDs in the new order.
   * @returns {Promise<object>} The reordered golf courses with display_order.
   * @throws {Error} If the method is not implemented.
   */
  async reorderGolfCourses(competitionId, golfCourseIds) {
    throw new Error('ICompetitionRepository.reorderGolfCourses must be implemented');
  }

  /**
   * Gets all golf courses associated with a competition.
   *
   * @param {string} competitionId The ID of the competition.
   * @returns {Promise<object>} Object containing competition_id and golf_courses array.
   * @throws {Error} If the method is not implemented.
   */
  async getCompetitionGolfCourses(competitionId) {
    throw new Error('ICompetitionRepository.getCompetitionGolfCourses must be implemented');
  }

  /**
   * Updates a competition.
   * Only allowed when competition status is DRAFT and user is the creator.
   *
   * @param {string} competitionId The ID of the competition to update.
   * @param {object} competitionData The updated competition data.
   * @returns {Promise<Competition>} The updated competition entity.
   * @throws {Error} If the method is not implemented.
   */
  async updateCompetition(competitionId, competitionData) {
    throw new Error('ICompetitionRepository.updateCompetition must be implemented');
  }

  /**
   * Activates a competition (DRAFT → ACTIVE).
   * @param {string} competitionId
   * @returns {Promise<Object>} Updated competition data
   */
  async activate(competitionId) {
    throw new Error('ICompetitionRepository.activate must be implemented');
  }

  /**
   * Closes enrollments for a competition (ACTIVE → CLOSED).
   * @param {string} competitionId
   * @returns {Promise<Object>} Updated competition data
   */
  async closeEnrollments(competitionId) {
    throw new Error('ICompetitionRepository.closeEnrollments must be implemented');
  }

  /**
   * Starts a competition (CLOSED → IN_PROGRESS).
   * @param {string} competitionId
   * @returns {Promise<Object>} Updated competition data
   */
  async start(competitionId) {
    throw new Error('ICompetitionRepository.start must be implemented');
  }

  /**
   * Completes a competition (IN_PROGRESS → COMPLETED).
   * @param {string} competitionId
   * @returns {Promise<Object>} Updated competition data
   */
  async complete(competitionId) {
    throw new Error('ICompetitionRepository.complete must be implemented');
  }

  /**
   * Cancels a competition (any state → CANCELLED).
   * @param {string} competitionId
   * @returns {Promise<Object>} Updated competition data
   */
  async cancel(competitionId) {
    throw new Error('ICompetitionRepository.cancel must be implemented');
  }
}
