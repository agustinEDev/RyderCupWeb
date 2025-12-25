import { describe, it, expect, vi, beforeEach } from 'vitest';
import VerifyEmailUseCase from './VerifyEmailUseCase';
import User from '../../../domain/entities/User';

describe('VerifyEmailUseCase', () => {
  let authRepository;
  let verifyEmailUseCase;

  beforeEach(() => {
    // Resetear todos los mocks antes de cada test
    vi.clearAllMocks();

    // Crear un mock del authRepository
    authRepository = {
      verifyEmail: vi.fn(),
    };

    // Instanciar VerifyEmailUseCase con el mock
    verifyEmailUseCase = new VerifyEmailUseCase({ authRepository });
  });

  it('should successfully verify user email', async () => {
    // Arrange
    const token = 'mock-verification-token';
    const mockUpdatedUserEntity = new User({
      id: 'user-123',
      first_name: 'Verified',
      last_name: 'User',
      email: 'verified@example.com',
      email_verified: true
    });

    // Configurar el mock del repositorio para devolver el usuario actualizado simulado
    authRepository.verifyEmail.mockResolvedValue(mockUpdatedUserEntity);

    // Act
    const updatedUser = await verifyEmailUseCase.execute(token);

    // Assert
    // 1. Verificar que el método verifyEmail del repositorio fue llamado con el token correcto
    expect(authRepository.verifyEmail).toHaveBeenCalledWith(token);

    // 2. Verificar que el caso de uso devuelve la entidad User correcta
    expect(updatedUser).toEqual(mockUpdatedUserEntity);
    expect(updatedUser.emailVerified).toBe(true);
  });

  it('should throw an error if token is not provided', async () => {
    await expect(verifyEmailUseCase.execute(''))
      .rejects.toThrow('Verification token is required');
  });

  it('should propagate errors from the auth repository', async () => {
    // Arrange
    const token = 'invalid-token';
    const mockError = new Error('Invalid or expired verification token');

    authRepository.verifyEmail.mockRejectedValue(mockError);

    // Act & Assert
    await expect(verifyEmailUseCase.execute(token))
      .rejects.toThrow('Invalid or expired verification token');
    expect(authRepository.verifyEmail).toHaveBeenCalledWith(token);
  });
});
