/**
 * SetAdminUserActiveUseCase
 * Deactivates or reactivates a user's account (reversible, blocks login)
 *
 * @param {Object} dependencies
 * @param {IAdminRepository} dependencies.adminRepository
 */
class SetAdminUserActiveUseCase {
  constructor({ adminRepository }) {
    this.adminRepository = adminRepository;
  }

  async execute(userId, isActive) {
    return await this.adminRepository.setUserActive(userId, isActive);
  }
}

export default SetAdminUserActiveUseCase;
