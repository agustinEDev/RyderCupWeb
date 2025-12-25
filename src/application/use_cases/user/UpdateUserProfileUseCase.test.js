import { describe, it, expect, vi, beforeEach } from 'vitest';
import UpdateUserProfileUseCase from './UpdateUserProfileUseCase';
import User from '../../../domain/entities/User';

describe('UpdateUserProfileUseCase', () => {
  let userRepository;
  let updateUserProfileUseCase;

  beforeEach(() => {
    // Resetear todos los mocks antes de cada test
    vi.clearAllMocks();

    // Crear un mock del userRepository
    userRepository = {
      update: vi.fn(),
    };

    // Instanciar UpdateUserProfileUseCase con el mock
    updateUserProfileUseCase = new UpdateUserProfileUseCase({ userRepository });
  });

  it('should successfully update user profile', async () => {
    // Arrange
    const userId = 'user-123';
    const updateData = {
      firstName: 'UpdatedName',
      lastName: 'UpdatedLastName'
    };
    const mockUpdatedUserEntity = new User({
      id: userId,
      first_name: updateData.firstName,
      last_name: updateData.lastName,
      email: 'test@example.com'
    });

    // Configurar el mock del repositorio para devolver el usuario actualizado simulado
    userRepository.update.mockResolvedValue(mockUpdatedUserEntity);

    // Act
    const updatedUser = await updateUserProfileUseCase.execute(userId, updateData);

    // Assert
    // 1. Verificar que el método update del repositorio fue llamado con los datos correctos
    expect(userRepository.update).toHaveBeenCalledWith(userId, updateData);

    // 2. Verificar que el caso de uso devuelve la entidad User correcta
    expect(updatedUser).toEqual(mockUpdatedUserEntity);
  });

  it('should throw an error if userId is not provided', async () => {
    await expect(updateUserProfileUseCase.execute('', { firstName: 'Name' }))
      .rejects.toThrow('User ID and update data are required');
  });

  it('should throw an error if updateData is not provided', async () => {
    await expect(updateUserProfileUseCase.execute('user-123', undefined))
      .rejects.toThrow('User ID and update data are required');
  });

  it('should propagate errors from the user repository', async () => {
    // Arrange
    const userId = 'user-123';
    const updateData = { firstName: 'Updated' };
    const mockError = new Error('API error during profile update');

    userRepository.update.mockRejectedValue(mockError);

    // Act & Assert
    await expect(updateUserProfileUseCase.execute(userId, updateData))
      .rejects.toThrow('API error during profile update');
    expect(userRepository.update).toHaveBeenCalledWith(userId, updateData);
  });
});
