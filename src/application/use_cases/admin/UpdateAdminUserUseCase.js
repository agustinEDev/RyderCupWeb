/**
 * UpdateAdminUserUseCase
 * Edits a user's data from the admin panel
 *
 * @param {Object} dependencies
 * @param {IAdminRepository} dependencies.adminRepository
 */
class UpdateAdminUserUseCase {
  constructor({ adminRepository }) {
    this.adminRepository = adminRepository;
  }

  async execute(userId, data) {
    return await this.adminRepository.updateUser(userId, data);
  }
}

export default UpdateAdminUserUseCase;
