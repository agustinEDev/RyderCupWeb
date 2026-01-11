import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginUseCase from './LoginUseCase';
import User from '../../../domain/entities/User';

// secureAuth.js has been removed (migrated to httpOnly cookies)
// LoginUseCase no longer uses setAuthToken/setUserData - authentication is handled by httpOnly cookies
// v1.13.0: LoginUseCase now returns { user, csrfToken } for CSRF protection

describe('LoginUseCase', () => {
  let authRepository;
  let loginUseCase;

  beforeEach(() => {
    // Resetear todos los mocks antes de cada test
    vi.clearAllMocks();

    // Crear un mock del authRepository
    authRepository = {
      login: vi.fn(),
    };

    // Instanciar LoginUseCase con el mock
    loginUseCase = new LoginUseCase({ authRepository });
  });

  it('should successfully log in a user and return user with CSRF token', async () => {
    // Arrange
    const email = 'test@example.com';
    const password = 'password123';
    const mockToken = 'mock_jwt_token';
    const mockCsrfToken = 'csrf-token-abc-123'; // v1.13.0
    const mockUserEntity = new User({
      id: '123',
      email: email,
      first_name: 'Test',
      last_name: 'User',
      email_verified: true
    });

    // Configurar el mock del repositorio para devolver el usuario, token y csrfToken
    authRepository.login.mockResolvedValue({
      user: mockUserEntity,
      token: mockToken,
      csrfToken: mockCsrfToken // v1.13.0: CSRF Protection
    });

    // Act
    const result = await loginUseCase.execute(email, password);

    // Assert
    // 1. Verificar que el método login del repositorio fue llamado con un Email VO y la contraseña
    expect(authRepository.login).toHaveBeenCalledWith(
      expect.objectContaining({ _value: email }),
      expect.objectContaining({ _value: password })
    );

    // 2. v1.13.0: Verificar que el caso de uso devuelve { user, csrfToken }
    expect(result).toEqual({
      user: mockUserEntity,
      csrfToken: mockCsrfToken
    });
  });

  it('should throw an error if email is not provided', async () => {
    // Act & Assert
    await expect(loginUseCase.execute('', 'password123')).rejects.toThrow('Invalid email address.');
  });

  it('should throw an error if password is not provided', async () => {
    // Act & Assert
    await expect(loginUseCase.execute('test@example.com', '')).rejects.toThrow('Password cannot be empty.');
  });

  it('should propagate errors from the auth repository', async () => {
    // Arrange
    const email = 'test@example.com';
    const password = 'wrongpassword';
    const mockError = new Error('Invalid credentials from API');

    authRepository.login.mockRejectedValue(mockError);

    // Act & Assert
    await expect(loginUseCase.execute(email, password)).rejects.toThrow('Invalid credentials from API');

    expect(authRepository.login).toHaveBeenCalledWith(
      expect.objectContaining({ _value: email }),
      expect.objectContaining({ _value: password })
    );

    // Note: Token/user storage is now handled by httpOnly cookies (no manual storage needed)
  });
});
