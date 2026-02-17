import { describe, it, expect, vi } from 'vitest';
import LinkGoogleAccountUseCase from './LinkGoogleAccountUseCase';

describe('LinkGoogleAccountUseCase', () => {
  const mockAuthRepository = {
    linkGoogleAccount: vi.fn(),
  };

  const createUseCase = () => new LinkGoogleAccountUseCase({ authRepository: mockAuthRepository });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw if authRepository is not provided', () => {
      expect(() => new LinkGoogleAccountUseCase({})).toThrow('LinkGoogleAccountUseCase requires authRepository');
    });

    it('should create instance with valid dependencies', () => {
      const useCase = createUseCase();
      expect(useCase).toBeInstanceOf(LinkGoogleAccountUseCase);
    });
  });

  describe('execute', () => {
    it('should call authRepository.linkGoogleAccount with trimmed code', async () => {
      const mockResult = { message: 'Linked', provider: 'google', providerEmail: 'user@gmail.com' };
      mockAuthRepository.linkGoogleAccount.mockResolvedValue(mockResult);

      const result = await createUseCase().execute('  auth-code  ');

      expect(mockAuthRepository.linkGoogleAccount).toHaveBeenCalledWith('auth-code');
      expect(result).toEqual(mockResult);
    });

    it('should throw if authorization code is empty', async () => {
      await expect(createUseCase().execute('')).rejects.toThrow('Authorization code is required');
    });

    it('should throw if authorization code is null', async () => {
      await expect(createUseCase().execute(null)).rejects.toThrow('Authorization code is required');
    });

    it('should propagate repository errors', async () => {
      const error = new Error('Already linked');
      error.status = 400;
      mockAuthRepository.linkGoogleAccount.mockRejectedValue(error);

      await expect(createUseCase().execute('auth-code')).rejects.toThrow('Already linked');
    });
  });
});
