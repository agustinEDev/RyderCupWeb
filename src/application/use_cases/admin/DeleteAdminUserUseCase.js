/**
 * DeleteAdminUserUseCase
 * Permanently deletes a user's account. Rejects with a 409 (error.status)
 * if the account has activity that blocks deletion — see IAdminRepository.
 *
 * @param {Object} dependencies
 * @param {IAdminRepository} dependencies.adminRepository
 */
class DeleteAdminUserUseCase {
  constructor({ adminRepository }) {
    this.adminRepository = adminRepository;
  }

  async execute(userId) {
    return await this.adminRepository.deleteUser(userId);
  }
}

export default DeleteAdminUserUseCase;
