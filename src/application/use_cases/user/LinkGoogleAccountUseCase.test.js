import { describe, it, expect, vi } from 'vitest';
import LinkGoogleAccountUseCase from './LinkGoogleAccountUseCase';

// El verifier de PKCE de la ida a Google (fase 3)
const VERIFIER = 'v'.repeat(64);

describe('LinkGoogleAccountUseCase', () => {
  const mockAuthRepository = {
    linkGoogleAccount: vi.fn(),
  };

  const createUseCase = () =>
    new LinkGoogleAccountUseCase({ authRepository: mockAuthRepository });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw if authRepository is not provided', () => {
      expect(() => new LinkGoogleAccountUseCase({})).toThrow(
        'LinkGoogleAccountUseCase requires authRepository',
      );
    });

    it('should create instance with valid dependencies', () => {
      const useCase = createUseCase();
      expect(useCase).toBeInstanceOf(LinkGoogleAccountUseCase);
    });
  });

  describe('execute', () => {
    it('should call authRepository.linkGoogleAccount with trimmed code', async () => {
      const mockResult = {
        message: 'Linked',
        provider: 'google',
        providerEmail: 'user@gmail.com',
      };
      mockAuthRepository.linkGoogleAccount.mockResolvedValue(mockResult);

      const result = await createUseCase().execute('  auth-code  ', VERIFIER);

      expect(mockAuthRepository.linkGoogleAccount).toHaveBeenCalledWith(
        'auth-code',
        VERIFIER,
      );
      expect(result).toEqual(mockResult);
    });

    it('should throw if authorization code is empty', async () => {
      await expect(createUseCase().execute('', VERIFIER)).rejects.toThrow(
        'Authorization code is required',
      );
    });

    it('should throw if authorization code is null', async () => {
      await expect(createUseCase().execute(null, VERIFIER)).rejects.toThrow(
        'Authorization code is required',
      );
    });

    it('should propagate repository errors', async () => {
      const error = new Error('Already linked');
      error.status = 400;
      mockAuthRepository.linkGoogleAccount.mockRejectedValue(error);

      await expect(
        createUseCase().execute('auth-code', VERIFIER),
      ).rejects.toThrow('Already linked');
    });
  });
});

describe('LinkGoogleAccountUseCase · PKCE (fase 3)', () => {
  it.each([
    ['sin verifier', undefined],
    ['con un verifier vacío', ''],
    ['con un verifier que no es texto', 42],
  ])('%s no llama al backend', async (_caso, verifier) => {
    const authRepository = { linkGoogleAccount: vi.fn() };
    const UseCase = (await import('./LinkGoogleAccountUseCase')).default;

    await expect(
      new UseCase({ authRepository }).execute('auth-code', verifier),
    ).rejects.toThrow('Code verifier is required');
    expect(authRepository.linkGoogleAccount).not.toHaveBeenCalled();
  });
});
