import { describe, it, expect, vi, beforeEach } from 'vitest';
import ListAdminUsersUseCase from './ListAdminUsersUseCase';

describe('ListAdminUsersUseCase', () => {
  let adminRepository;
  let useCase;

  beforeEach(() => {
    vi.clearAllMocks();
    adminRepository = { listUsers: vi.fn() };
    useCase = new ListAdminUsersUseCase({ adminRepository });
  });

  it('should list users with the given filters', async () => {
    const filters = { search: 'agus', isAdmin: true, limit: 20, offset: 0 };
    const response = { users: [{ id: 'u1' }], totalCount: 1, limit: 20, offset: 0 };
    adminRepository.listUsers.mockResolvedValue(response);

    const result = await useCase.execute(filters);

    expect(adminRepository.listUsers).toHaveBeenCalledWith(filters);
    expect(result).toEqual(response);
  });

  it('should default to an empty filters object', async () => {
    adminRepository.listUsers.mockResolvedValue({ users: [], totalCount: 0, limit: 20, offset: 0 });

    await useCase.execute();

    expect(adminRepository.listUsers).toHaveBeenCalledWith({});
  });

  it('should propagate repository errors', async () => {
    adminRepository.listUsers.mockRejectedValue(new Error('Network error'));

    await expect(useCase.execute()).rejects.toThrow('Network error');
  });
});
