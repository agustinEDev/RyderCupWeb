import { describe, it, expect, vi, beforeEach } from 'vitest';
import SetAdminUserActiveUseCase from './SetAdminUserActiveUseCase';

describe('SetAdminUserActiveUseCase', () => {
  let adminRepository;
  let useCase;

  beforeEach(() => {
    vi.clearAllMocks();
    adminRepository = { setUserActive: vi.fn() };
    useCase = new SetAdminUserActiveUseCase({ adminRepository });
  });

  it('should deactivate the user', async () => {
    adminRepository.setUserActive.mockResolvedValue();

    await useCase.execute('u1', false);

    expect(adminRepository.setUserActive).toHaveBeenCalledWith('u1', false);
  });

  it('should reactivate the user', async () => {
    adminRepository.setUserActive.mockResolvedValue();

    await useCase.execute('u1', true);

    expect(adminRepository.setUserActive).toHaveBeenCalledWith('u1', true);
  });

  it('should propagate repository errors', async () => {
    adminRepository.setUserActive.mockRejectedValue(new Error('Network error'));

    await expect(useCase.execute('u1', false)).rejects.toThrow('Network error');
  });
});
