/**
 * GetAdminStatsUseCase
 * Fetches platform-wide statistics for the admin panel
 *
 * @param {Object} dependencies
 * @param {IAdminRepository} dependencies.adminRepository
 */
class GetAdminStatsUseCase {
  constructor({ adminRepository }) {
    this.adminRepository = adminRepository;
  }

  async execute() {
    return await this.adminRepository.getStats();
  }
}

export default GetAdminStatsUseCase;
