import { describe, it, expect, vi, beforeEach } from 'vitest';
import UpdateRfegHandicapUseCase from './UpdateRfegHandicapUseCase';
import User from '../../../domain/entities/User';

describe('UpdateRfegHandicapUseCase', () => {
  let handicapRepository;
  let userRepository;
  let updateRfegHandicapUseCase;

  beforeEach(() => {
    // Resetear todos los mocks antes de cada test
    vi.clearAllMocks();

    // Crear un mock del handicapRepository
    handicapRepository = {
      updateFromRfeg: vi.fn(),
    };

    // Crear un mock del userRepository
    userRepository = {
      getById: vi.fn(),
    };

    // Instanciar UpdateRfegHandicapUseCase con los mocks
    updateRfegHandicapUseCase = new UpdateRfegHandicapUseCase({
      handicapRepository,
      userRepository
    });
  });

  it('should successfully update user handicap from RFEG for Spanish user', async () => {
    // Arrange
    const userId = 'user-123';
    const mockUserEntity = new User({
      id: userId,
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com',
      country_code: 'ES',
      handicap: 15.0
    });

    const mockUpdatedUserEntity = new User({
      id: userId,
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com',
      country_code: 'ES',
      handicap: 18.0,
      handicap_updated_at: new Date().toISOString()
    });

    // Mock: userRepository.getById devuelve un usuario español
    userRepository.getById.mockResolvedValue(mockUserEntity);

    // Mock: handicapRepository.updateFromRfeg devuelve el usuario actualizado
    handicapRepository.updateFromRfeg.mockResolvedValue(mockUpdatedUserEntity);

    // Act
    const updatedUser = await updateRfegHandicapUseCase.execute({ userId });

    // Assert
    // 1. Verificar que se obtuvo el usuario del repositorio
    expect(userRepository.getById).toHaveBeenCalledWith(userId);

    // 2. Verificar que el método updateFromRfeg del repositorio fue llamado con el userId correcto
    expect(handicapRepository.updateFromRfeg).toHaveBeenCalledWith(userId);

    // 3. Verificar que el caso de uso devuelve la entidad User correcta
    expect(updatedUser).toEqual(mockUpdatedUserEntity);
  });

  it('should throw an error if userId is not provided', async () => {
    await expect(updateRfegHandicapUseCase.execute({ userId: '' }))
      .rejects.toThrow('User ID is required');
  });

  it('should propagate errors from the handicap repository', async () => {
    // Arrange
    const userId = 'user-123';
    const mockUserEntity = new User({
      id: userId,
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com',
      country_code: 'ES'
    });
    const mockError = new Error('API error during RFEG handicap update');

    userRepository.getById.mockResolvedValue(mockUserEntity);
    handicapRepository.updateFromRfeg.mockRejectedValue(mockError);

    // Act & Assert
    await expect(updateRfegHandicapUseCase.execute({ userId }))
      .rejects.toThrow('API error during RFEG handicap update');
    expect(userRepository.getById).toHaveBeenCalledWith(userId);
    expect(handicapRepository.updateFromRfeg).toHaveBeenCalledWith(userId);
  });

  // ===== NUEVOS TESTS PARA VALIDACIÓN DE NACIONALIDAD =====

  it('should throw an error if user is not found', async () => {
    // Arrange
    const userId = 'user-123';
    userRepository.getById.mockResolvedValue(null);

    // Act & Assert
    await expect(updateRfegHandicapUseCase.execute({ userId }))
      .rejects.toThrow('User not found');
    expect(userRepository.getById).toHaveBeenCalledWith(userId);
    expect(handicapRepository.updateFromRfeg).not.toHaveBeenCalled();
  });

  it('should throw an error if user does not have country_code', async () => {
    // Arrange
    const userId = 'user-123';
    const mockUserEntity = new User({
      id: userId,
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com',
      country_code: null // Sin nacionalidad
    });

    userRepository.getById.mockResolvedValue(mockUserEntity);

    // Act & Assert
    await expect(updateRfegHandicapUseCase.execute({ userId }))
      .rejects.toThrow('RFEG handicap updates require Spanish nationality');
    expect(userRepository.getById).toHaveBeenCalledWith(userId);
    expect(handicapRepository.updateFromRfeg).not.toHaveBeenCalled();
  });

  it('should throw an error if user is not Spanish (country_code !== ES)', async () => {
    // Arrange
    const userId = 'user-123';
    const mockUserEntity = new User({
      id: userId,
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com',
      country_code: 'FR' // Usuario francés
    });

    userRepository.getById.mockResolvedValue(mockUserEntity);

    // Act & Assert
    await expect(updateRfegHandicapUseCase.execute({ userId }))
      .rejects.toThrow('RFEG handicap updates are only available for Spanish players');
    expect(userRepository.getById).toHaveBeenCalledWith(userId);
    expect(handicapRepository.updateFromRfeg).not.toHaveBeenCalled();
  });

  it('should allow RFEG update for user with country_code ES (case insensitive)', async () => {
    // Arrange
    const userId = 'user-123';
    const mockUserEntity = new User({
      id: userId,
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com',
      country_code: 'es' // Usuario español (lowercase to test case-insensitivity)
    });

    const mockUpdatedUserEntity = new User({
      id: userId,
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com',
      country_code: 'ES',
      handicap: 20.5,
      handicap_updated_at: new Date().toISOString()
    });

    userRepository.getById.mockResolvedValue(mockUserEntity);
    handicapRepository.updateFromRfeg.mockResolvedValue(mockUpdatedUserEntity);

    // Act
    const updatedUser = await updateRfegHandicapUseCase.execute({ userId });

    // Assert
    expect(userRepository.getById).toHaveBeenCalledWith(userId);
    expect(handicapRepository.updateFromRfeg).toHaveBeenCalledWith(userId);
    expect(updatedUser).toEqual(mockUpdatedUserEntity);
  });
});
