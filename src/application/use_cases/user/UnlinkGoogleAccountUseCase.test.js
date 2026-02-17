import { describe, it, expect, vi } from 'vitest';
import UnlinkGoogleAccountUseCase from './UnlinkGoogleAccountUseCase';

describe('UnlinkGoogleAccountUseCase', () => {
  const mockAuthRepository = {
    unlinkGoogleAccount: vi.fn(),
  };

  const createUseCase = () => new UnlinkGoogleAccountUseCase({ authRepository: mockAuthRepository });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw if authRepository is not provided', () => {
      expect(() => new UnlinkGoogleAccountUseCase({})).toThrow('UnlinkGoogleAccountUseCase requires authRepository');
    });

    it('should create instance with valid dependencies', () => {
      const useCase = createUseCase();
      expect(useCase).toBeInstanceOf(UnlinkGoogleAccountUseCase);
    });
  });

  describe('execute', () => {
    it('should call authRepository.unlinkGoogleAccount', async () => {
      const mockResult = { message: 'Unlinked', provider: 'google' };
      mockAuthRepository.unlinkGoogleAccount.mockResolvedValue(mockResult);

      const result = await createUseCase().execute();

      expect(mockAuthRepository.unlinkGoogleAccount).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('should propagate error when google is not linked', async () => {
      const error = new Error('Google account is not linked');
      error.status = 400;
      mockAuthRepository.unlinkGoogleAccount.mockRejectedValue(error);

      await expect(createUseCase().execute()).rejects.toThrow('Google account is not linked');
    });

    it('should propagate error when it is the only auth method', async () => {
      const error = new Error('Cannot unlink the only authentication method');
      error.status = 400;
      mockAuthRepository.unlinkGoogleAccount.mockRejectedValue(error);

      await expect(createUseCase().execute()).rejects.toThrow('Cannot unlink the only authentication method');
    });
  });
});
