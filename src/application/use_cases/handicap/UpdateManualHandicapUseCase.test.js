import { describe, it, expect, vi, beforeEach } from 'vitest';
import UpdateManualHandicapUseCase from './UpdateManualHandicapUseCase';
import User from '../../../domain/entities/User';

describe('UpdateManualHandicapUseCase', () => {
  let handicapRepository;
  let updateManualHandicapUseCase;

  beforeEach(() => {
    // Resetear todos los mocks antes de cada test
    vi.clearAllMocks();

    // Crear un mock del handicapRepository
    handicapRepository = {
      updateManual: vi.fn(),
    };

    // Instanciar UpdateManualHandicapUseCase con el mock
    updateManualHandicapUseCase = new UpdateManualHandicapUseCase({ handicapRepository });
  });

  it('should successfully update user manual handicap within valid range', async () => {
    // Arrange
    const userId = 'user-123';
    const validHandicap = 15.5;
    const mockUpdatedUserEntity = new User({
      id: userId,
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com',
      handicap: validHandicap,
      handicap_updated_at: new Date().toISOString()
    });

    // Configurar el mock del repositorio para devolver el usuario actualizado simulado
    handicapRepository.updateManual.mockResolvedValue(mockUpdatedUserEntity);

    // Act
    const updatedUser = await updateManualHandicapUseCase.execute({ userId, handicap: validHandicap });

    // Assert
    // 1. Verificar que el método updateManual del repositorio fue llamado con los datos correctos
    expect(handicapRepository.updateManual).toHaveBeenCalledWith(userId, validHandicap);

    // 2. Verificar que el caso de uso devuelve la entidad User correcta
    expect(updatedUser).toEqual(mockUpdatedUserEntity);
  });

  it('should throw an error if userId is not provided', async () => {
    await expect(updateManualHandicapUseCase.execute({ userId: '', handicap: 10 }))
      .rejects.toThrow('User ID and handicap value are required');
  });

  it('should throw an error if handicap is not provided', async () => {
    await expect(updateManualHandicapUseCase.execute({ userId: 'user-123', handicap: undefined }))
      .rejects.toThrow('User ID and handicap value are required');
  });

  it('should throw an error if handicap is below the valid range', async () => {
    await expect(updateManualHandicapUseCase.execute({ userId: 'user-123', handicap: -10.1 }))
      .rejects.toThrow('Invalid handicap value. Must be between -10.0 and 54.0');
  });

  it('should throw an error if handicap is above the valid range', async () => {
    await expect(updateManualHandicapUseCase.execute({ userId: 'user-123', handicap: 54.1 }))
      .rejects.toThrow('Invalid handicap value. Must be between -10.0 and 54.0');
  });

  it('should throw an error if no parameters are provided', async () => {
    await expect(updateManualHandicapUseCase.execute())
      .rejects.toThrow('User ID and handicap value are required');
  });

  it('should throw an error if handicap is not a valid number', async () => {
    await expect(updateManualHandicapUseCase.execute({ userId: 'user-123', handicap: 'invalid' }))
      .rejects.toThrow('Invalid handicap value. Must be a valid number.');
  });

  it('should throw an error if handicap is a non-pure numeric string', async () => {
    await expect(updateManualHandicapUseCase.execute({ userId: 'user-123', handicap: '15a' }))
      .rejects.toThrow('Invalid handicap value. Must be a valid number.');
  });

  it('should throw an error for Infinity', async () => {
    await expect(updateManualHandicapUseCase.execute({ userId: 'user-123', handicap: Infinity }))
      .rejects.toThrow('Invalid handicap value. Must be a valid number.');
  });

  it('should propagate errors from the handicap repository', async () => {
    // Arrange
    const userId = 'user-123';
    const handicap = 20.0;
    const mockError = new Error('API error during handicap update');

    handicapRepository.updateManual.mockRejectedValue(mockError);

    // Act & Assert
    await expect(updateManualHandicapUseCase.execute({ userId, handicap }))
      .rejects.toThrow('API error during handicap update');
    expect(handicapRepository.updateManual).toHaveBeenCalledWith(userId, handicap);
  });
});
