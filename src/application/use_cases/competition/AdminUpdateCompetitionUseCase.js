/**
 * Use Case: Admin partial update of a competition's basic fields.
 *
 * Unlike UpdateCompetitionUseCase (creator's full edit form, requires team
 * names/countries/etc.), this mirrors the backend's actual partial-update
 * contract (UpdateCompetitionRequestDTO — all fields optional) so the admin
 * panel can patch just name/dates without resubmitting the whole competition.
 *
 * Business Rules (enforced by the backend):
 * - Only allowed while the competition is in DRAFT status
 * - Admins bypass the creator-ownership check
 */
class AdminUpdateCompetitionUseCase {
  /**
   * @param {Object} deps - The dependencies object.
   * @param {ICompetitionRepository} deps.competitionRepository - The competition repository.
   */
  constructor({ competitionRepository }) {
    this.competitionRepository = competitionRepository;
  }

  /**
   * @param {string} competitionId - The ID of the competition to update.
   * @param {Object} fields - Partial fields to update.
   * @param {string} [fields.name] - New name (min 3 chars).
   * @param {string} [fields.start_date] - New start date (YYYY-MM-DD).
   * @param {string} [fields.end_date] - New end date (YYYY-MM-DD).
   * @returns {Promise<Object>} The updated competition.
   */
  async execute(competitionId, fields) {
    if (!competitionId || typeof competitionId !== 'string') {
      throw new Error('Competition ID is required and must be a string');
    }
    if (!fields || typeof fields !== 'object') {
      throw new Error('Fields to update are required');
    }
    if (fields.name !== undefined && fields.name.trim().length < 3) {
      throw new Error('Competition name must be at least 3 characters');
    }
    if (fields.start_date && fields.end_date && new Date(fields.end_date) < new Date(fields.start_date)) {
      throw new Error('End date must be on or after start date');
    }

    return await this.competitionRepository.updateCompetition(competitionId, fields);
  }
}

export default AdminUpdateCompetitionUseCase;
