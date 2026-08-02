/**
 * ListAdminUsersUseCase
 * Lists users for the admin panel, paginated and filterable
 *
 * @param {Object} dependencies
 * @param {IAdminRepository} dependencies.adminRepository
 */
class ListAdminUsersUseCase {
  constructor({ adminRepository }) {
    this.adminRepository = adminRepository;
  }

  async execute(filters = {}) {
    return await this.adminRepository.listUsers(filters);
  }
}

export default ListAdminUsersUseCase;
