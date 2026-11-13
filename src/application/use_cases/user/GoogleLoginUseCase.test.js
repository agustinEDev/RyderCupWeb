import { describe, it, expect, vi, beforeEach } from 'vitest';
import GoogleLoginUseCase from './GoogleLoginUseCase';

// El verifier de PKCE de la ida a Google (fase 3)
const VERIFIER = 'v'.repeat(64);

describe('GoogleLoginUseCase', () => {
  const mockAuthRepository = {
    googleLogin: vi.fn(),
  };

  const createUseCase = () =>
    new GoogleLoginUseCase({ authRepository: mockAuthRepository });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw if authRepository is not provided', () => {
      expect(() => new GoogleLoginUseCase({})).toThrow(
        'GoogleLoginUseCase requires authRepository',
      );
    });

    it('should create instance with valid dependencies', () => {
      const useCase = createUseCase();
      expect(useCase).toBeInstanceOf(GoogleLoginUseCase);
    });
  });

  describe('execute', () => {
    it('should call authRepository.googleLogin with trimmed code', async () => {
      const mockResult = {
        user: { id: '1' },
        csrfToken: 'token',
        isNewUser: false,
      };
      mockAuthRepository.googleLogin.mockResolvedValue(mockResult);

      const result = await createUseCase().execute(
        '  auth-code-123  ',
        VERIFIER,
      );

      expect(mockAuthRepository.googleLogin).toHaveBeenCalledWith(
        'auth-code-123',
        VERIFIER,
      );
      expect(result).toEqual(mockResult);
    });

    it('should return isNewUser true for new users', async () => {
      const mockResult = {
        user: { id: '1' },
        csrfToken: 'token',
        isNewUser: true,
      };
      mockAuthRepository.googleLogin.mockResolvedValue(mockResult);

      const result = await createUseCase().execute('auth-code', VERIFIER);

      expect(result.isNewUser).toBe(true);
    });

    it('should return isNewUser false for existing users', async () => {
      const mockResult = {
        user: { id: '1' },
        csrfToken: 'token',
        isNewUser: false,
      };
      mockAuthRepository.googleLogin.mockResolvedValue(mockResult);

      const result = await createUseCase().execute('auth-code', VERIFIER);

      expect(result.isNewUser).toBe(false);
    });

    it('should throw if authorization code is empty', async () => {
      await expect(createUseCase().execute('', VERIFIER)).rejects.toThrow(
        'Authorization code is required',
      );
    });

    it('should throw if authorization code is only whitespace', async () => {
      await expect(createUseCase().execute('   ', VERIFIER)).rejects.toThrow(
        'Authorization code is required',
      );
    });

    it('should throw if authorization code is null', async () => {
      await expect(createUseCase().execute(null, VERIFIER)).rejects.toThrow(
        'Authorization code is required',
      );
    });

    it('should throw if authorization code is undefined', async () => {
      await expect(
        createUseCase().execute(undefined, VERIFIER),
      ).rejects.toThrow('Authorization code is required');
    });

    it('should propagate repository errors', async () => {
      const error = new Error('Network error');
      error.status = 500;
      mockAuthRepository.googleLogin.mockRejectedValue(error);

      await expect(
        createUseCase().execute('auth-code', VERIFIER),
      ).rejects.toThrow('Network error');
    });
  });
});

describe('GoogleLoginUseCase · PKCE (fase 3)', () => {
  it.each([
    ['sin verifier', undefined],
    ['con un verifier vacío', ''],
    ['con un verifier que no es texto', 42],
  ])('%s no llama al backend', async (_caso, verifier) => {
    const authRepository = { googleLogin: vi.fn() };
    const UseCase = (await import('./GoogleLoginUseCase')).default;

    await expect(
      new UseCase({ authRepository }).execute('auth-code', verifier),
    ).rejects.toThrow('Code verifier is required');
    expect(authRepository.googleLogin).not.toHaveBeenCalled();
  });
});
