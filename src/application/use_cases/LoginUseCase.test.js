import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginUseCase from './LoginUseCase';
import User from '../../domain/entities/User';
import IAuthRepository from '../../domain/repositories/IAuthRepository';
import Email from '../../domain/value_objects/Email'; // Importar Email
import Password from '../../domain/value_objects/Password'; // Importar Password

// Mock del módulo secureAuth
vi.mock('../../utils/secureAuth', () => ({
  setAuthToken: vi.fn(),
  setUserData: vi.fn(),
}));

// Importar las funciones mockeadas
import { setAuthToken, setUserData } from '../../utils/secureAuth';

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

  it('should successfully log in a user and store credentials', async () => {
    // Arrange
    const email = 'test@example.com';
    const password = 'password123';
    const mockToken = 'mock_jwt_token';
    const mockUserEntity = new User({
      id: '123',
      email: email,
      first_name: 'Test',
      last_name: 'User',
      email_verified: true
    });

    // Configurar el mock del repositorio para devolver el usuario y token simulados
    authRepository.login.mockResolvedValue({
      user: mockUserEntity,
      token: mockToken
    });

    // Act
    const loggedInUser = await loginUseCase.execute(email, password);

    // Assert
    // 1. Verificar que el método login del repositorio fue llamado con un Email VO y la contraseña
    expect(authRepository.login).toHaveBeenCalledWith(
      expect.objectContaining({ _value: email }),
      expect.objectContaining({ _value: password })
    );

    // 2. Verificar que el token fue guardado
    expect(setAuthToken).toHaveBeenCalledWith(mockToken);

    // 3. Verificar que los datos del usuario fueron guardados (en formato de persistencia)
    expect(setUserData).toHaveBeenCalledWith(mockUserEntity.toPersistence());

    // 4. Verificar que el caso de uso devuelve la entidad User correcta
    expect(loggedInUser).toEqual(mockUserEntity);
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

    // Verificar que setAuthToken y setUserData no fueron llamados en caso de error
    expect(setAuthToken).not.toHaveBeenCalled();
    expect(setUserData).not.toHaveBeenCalled();
  });
});
