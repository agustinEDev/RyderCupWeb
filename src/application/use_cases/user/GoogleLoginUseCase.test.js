import { describe, it, expect, vi, beforeEach } from 'vitest';
import GoogleLoginUseCase from './GoogleLoginUseCase';

describe('GoogleLoginUseCase', () => {
  const mockAuthRepository = {
    googleLogin: vi.fn(),
  };

  const createUseCase = () => new GoogleLoginUseCase({ authRepository: mockAuthRepository });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw if authRepository is not provided', () => {
      expect(() => new GoogleLoginUseCase({})).toThrow('GoogleLoginUseCase requires authRepository');
    });

    it('should create instance with valid dependencies', () => {
      const useCase = createUseCase();
      expect(useCase).toBeInstanceOf(GoogleLoginUseCase);
    });
  });

  describe('execute', () => {
    it('should call authRepository.googleLogin with trimmed code', async () => {
      const mockResult = { user: { id: '1' }, csrfToken: 'token', isNewUser: false };
      mockAuthRepository.googleLogin.mockResolvedValue(mockResult);

      const result = await createUseCase().execute('  auth-code-123  ');

      expect(mockAuthRepository.googleLogin).toHaveBeenCalledWith('auth-code-123');
      expect(result).toEqual(mockResult);
    });

    it('should return isNewUser true for new users', async () => {
      const mockResult = { user: { id: '1' }, csrfToken: 'token', isNewUser: true };
      mockAuthRepository.googleLogin.mockResolvedValue(mockResult);

      const result = await createUseCase().execute('auth-code');

      expect(result.isNewUser).toBe(true);
    });

    it('should return isNewUser false for existing users', async () => {
      const mockResult = { user: { id: '1' }, csrfToken: 'token', isNewUser: false };
      mockAuthRepository.googleLogin.mockResolvedValue(mockResult);

      const result = await createUseCase().execute('auth-code');

      expect(result.isNewUser).toBe(false);
    });

    it('should throw if authorization code is empty', async () => {
      await expect(createUseCase().execute('')).rejects.toThrow('Authorization code is required');
    });

    it('should throw if authorization code is only whitespace', async () => {
      await expect(createUseCase().execute('   ')).rejects.toThrow('Authorization code is required');
    });

    it('should throw if authorization code is null', async () => {
      await expect(createUseCase().execute(null)).rejects.toThrow('Authorization code is required');
    });

    it('should throw if authorization code is undefined', async () => {
      await expect(createUseCase().execute(undefined)).rejects.toThrow('Authorization code is required');
    });

    it('should propagate repository errors', async () => {
      const error = new Error('Network error');
      error.status = 500;
      mockAuthRepository.googleLogin.mockRejectedValue(error);

      await expect(createUseCase().execute('auth-code')).rejects.toThrow('Network error');
    });
  });
});
