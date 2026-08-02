import { describe, it, expect, vi, beforeEach } from 'vitest';
import UpdateAdminUserUseCase from './UpdateAdminUserUseCase';

describe('UpdateAdminUserUseCase', () => {
  let adminRepository;
  let useCase;

  beforeEach(() => {
    vi.clearAllMocks();
    adminRepository = { updateUser: vi.fn() };
    useCase = new UpdateAdminUserUseCase({ adminRepository });
  });

  it('should update the user with the given data', async () => {
    const data = { firstName: 'Agus', isAdmin: true };
    const updated = { id: 'u1', firstName: 'Agus', isAdmin: true };
    adminRepository.updateUser.mockResolvedValue(updated);

    const result = await useCase.execute('u1', data);

    expect(adminRepository.updateUser).toHaveBeenCalledWith('u1', data);
    expect(result).toEqual(updated);
  });

  it('should propagate repository errors (e.g. duplicate email)', async () => {
    const error = new Error('Email already in use');
    error.status = 409;
    adminRepository.updateUser.mockRejectedValue(error);

    await expect(useCase.execute('u1', { email: 'taken@test.com' })).rejects.toThrow('Email already in use');
  });
});
