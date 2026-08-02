import { describe, it, expect, vi, beforeEach } from 'vitest';
import DeleteAdminUserUseCase from './DeleteAdminUserUseCase';

describe('DeleteAdminUserUseCase', () => {
  let adminRepository;
  let useCase;

  beforeEach(() => {
    vi.clearAllMocks();
    adminRepository = { deleteUser: vi.fn() };
    useCase = new DeleteAdminUserUseCase({ adminRepository });
  });

  it('should delete the user by id', async () => {
    adminRepository.deleteUser.mockResolvedValue();

    await useCase.execute('u1');

    expect(adminRepository.deleteUser).toHaveBeenCalledWith('u1');
  });

  it('should propagate a 409 when the user has activity', async () => {
    const error = new Error('Cannot permanently delete this account: has created one or more quick matches');
    error.status = 409;
    adminRepository.deleteUser.mockRejectedValue(error);

    await expect(useCase.execute('u1')).rejects.toMatchObject({ status: 409 });
  });
});
