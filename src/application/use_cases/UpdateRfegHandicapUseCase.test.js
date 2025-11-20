import { describe, it, expect, vi, beforeEach } from 'vitest';
import UpdateRfegHandicapUseCase from './UpdateRfegHandicapUseCase';
import User from '../../domain/entities/User';
import IHandicapRepository from '../../domain/repositories/IHandicapRepository';

describe('UpdateRfegHandicapUseCase', () => {
  let handicapRepository;
  let updateRfegHandicapUseCase;

  beforeEach(() => {
    // Resetear todos los mocks antes de cada test
    vi.clearAllMocks();

    // Crear un mock del handicapRepository
    handicapRepository = {
      updateFromRfeg: vi.fn(),
    };

    // Instanciar UpdateRfegHandicapUseCase con el mock
    updateRfegHandicapUseCase = new UpdateRfegHandicapUseCase({ handicapRepository });
  });

  it('should successfully update user handicap from RFEG', async () => {
    // Arrange
    const userId = 'user-123';
    const mockUpdatedUserEntity = new User({
      id: userId,
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com',
      handicap: 18.0,
      handicap_updated_at: new Date().toISOString()
    });

    // Configurar el mock del repositorio para devolver el usuario actualizado simulado
    handicapRepository.updateFromRfeg.mockResolvedValue(mockUpdatedUserEntity);

    // Act
    const updatedUser = await updateRfegHandicapUseCase.execute({ userId });

    // Assert
    // 1. Verificar que el método updateFromRfeg del repositorio fue llamado con el userId correcto
    expect(handicapRepository.updateFromRfeg).toHaveBeenCalledWith(userId);

    // 2. Verificar que el caso de uso devuelve la entidad User correcta
    expect(updatedUser).toEqual(mockUpdatedUserEntity);
  });

  it('should throw an error if userId is not provided', async () => {
    await expect(updateRfegHandicapUseCase.execute({ userId: '' }))
      .rejects.toThrow('User ID is required');
  });

  it('should propagate errors from the handicap repository', async () => {
    // Arrange
    const userId = 'user-123';
    const mockError = new Error('API error during RFEG handicap update');

    handicapRepository.updateFromRfeg.mockRejectedValue(mockError);

    // Act & Assert
    await expect(updateRfegHandicapUseCase.execute({ userId }))
      .rejects.toThrow('API error during RFEG handicap update');
    expect(handicapRepository.updateFromRfeg).toHaveBeenCalledWith(userId);
  });
});
