import { describe, it, expect, vi, beforeEach } from 'vitest';
import UpdateUserSecurityUseCase from './UpdateUserSecurityUseCase';
import User from '../../domain/entities/User';
import IUserRepository from '../../domain/repositories/IUserRepository';

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