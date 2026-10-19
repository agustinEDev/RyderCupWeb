import { describe, it, expect, vi, beforeEach } from 'vitest';
import UpdateUserSecurityUseCase from './UpdateUserSecurityUseCase';
import User from '../../../domain/entities/User';

describe('UpdateUserSecurityUseCase', () => {
  let userRepository;
  let updateUserSecurityUseCase;

  beforeEach(() => {
    // Resetear todos los mocks antes de cada test
    vi.clearAllMocks();

    // Crear un mock del userRepository
    userRepository = {
      updateSecurity: vi.fn(),
    };

    // Instanciar UpdateUserSecurityUseCase con el mock
    updateUserSecurityUseCase = new UpdateUserSecurityUseCase({ userRepository });
  });

  it('should successfully update user security settings (email and password)', async () => {
    // Arrange
    const userId = 'user-123';
    const securityData = {
      currentPassword: 'oldPassword123',
      email: 'new.email@example.com',
      newPassword: 'newStrongPassword456'
    };
    const mockUpdatedUserEntity = new User({
      id: userId,
      first_name: 'Test',
      last_name: 'User',
      email: securityData.email,
      email_verified: false
    });

    // Configurar el mock del repositorio para devolver el usuario actualizado simulado
    userRepository.updateSecurity.mockResolvedValue(mockUpdatedUserEntity);

    // Act
    const updatedUser = await updateUserSecurityUseCase.execute({ userId, securityData });

    // Assert
    // 1. Verificar que el método updateSecurity del repositorio fue llamado con los datos correctos
    expect(userRepository.updateSecurity).toHaveBeenCalledWith(userId, securityData);

    // 2. Verificar que el caso de uso devuelve la entidad User correcta
    expect(updatedUser).toEqual(mockUpdatedUserEntity);
  });

  it('no exige a la contraseña ACTUAL la política de las nuevas', async () => {
    // Quien tiene una contraseña de antes de la política no podía cambiarla:
    // el caso de uso la rechazaba antes de llegar al backend, que solo
    // comprueba que coincide
    userRepository.updateSecurity.mockResolvedValue({});

    await updateUserSecurityUseCase.execute({
      userId: 'user-123',
      securityData: { current_password: 'vieja', new_password: 'NuevaSegura123!' },
    });

    const [, enviado] = userRepository.updateSecurity.mock.calls[0];
    expect(enviado.current_password.getValue()).toBe('vieja');
    expect(enviado.new_password.getValue()).toBe('NuevaSegura123!');
  });

  it('la contraseña NUEVA sí tiene que cumplir la política', async () => {
    await expect(
      updateUserSecurityUseCase.execute({
        userId: 'user-123',
        securityData: { current_password: 'vieja', new_password: 'SinSimbolo1234' },
      })
    ).rejects.toThrow('special character');
    expect(userRepository.updateSecurity).not.toHaveBeenCalled();
  });

  it('should throw an error if userId is not provided', async () => {
    // Act & Assert
    await expect(updateUserSecurityUseCase.execute({ userId: '', securityData: {} }))
      .rejects.toThrow('User ID and security data are required');
  });

  it('should throw an error if securityData is not provided', async () => {
    // Act & Assert
    await expect(updateUserSecurityUseCase.execute({ userId: 'user-123', securityData: undefined }))
      .rejects.toThrow('User ID and security data are required');
  });

  it('should propagate errors from the user repository', async () => {
    // Arrange
    const userId = 'user-123';
    const securityData = { currentPassword: 'wrongPassword', email: 'email@test.com' };
    const mockError = new Error('Invalid current password');

    userRepository.updateSecurity.mockRejectedValue(mockError);

    // Act & Assert
    await expect(updateUserSecurityUseCase.execute({ userId, securityData }))
      .rejects.toThrow('Invalid current password');
    expect(userRepository.updateSecurity).toHaveBeenCalledWith(userId, securityData);
  });
});