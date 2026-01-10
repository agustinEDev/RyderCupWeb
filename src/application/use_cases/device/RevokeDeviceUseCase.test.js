/**
 * Tests for RevokeDeviceUseCase
 * v1.13.0: Device Fingerprinting feature
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import RevokeDeviceUseCase from './RevokeDeviceUseCase';

describe('RevokeDeviceUseCase', () => {
  let useCase;
  let mockDeviceRepository;

  beforeEach(() => {
    mockDeviceRepository = {
      revokeDevice: vi.fn(),
    };

    useCase = new RevokeDeviceUseCase({
      deviceRepository: mockDeviceRepository,
    });
  });

  describe('Constructor', () => {
    it('should throw error if deviceRepository is not provided', () => {
      expect(() => new RevokeDeviceUseCase({})).toThrow(
        'deviceRepository is required'
      );
    });

    it('should create use case with valid dependencies', () => {
      expect(useCase.deviceRepository).toBe(mockDeviceRepository);
    });
  });

  describe('execute', () => {
    it('should revoke device successfully', async () => {
      const deviceId = 'device-123';
      const mockResponse = {
        message: 'Dispositivo revocado exitosamente',
        device_id: deviceId,
      };

      mockDeviceRepository.revokeDevice.mockResolvedValue(mockResponse);

      const result = await useCase.execute(deviceId);

      expect(mockDeviceRepository.revokeDevice).toHaveBeenCalledWith(deviceId);
      expect(mockDeviceRepository.revokeDevice).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
    });

    it('should throw error if deviceId is null', async () => {
      await expect(useCase.execute(null)).rejects.toThrow(
        'Valid device ID is required'
      );

      expect(mockDeviceRepository.revokeDevice).not.toHaveBeenCalled();
    });

    it('should throw error if deviceId is undefined', async () => {
      await expect(useCase.execute(undefined)).rejects.toThrow(
        'Valid device ID is required'
      );

      expect(mockDeviceRepository.revokeDevice).not.toHaveBeenCalled();
    });

    it('should throw error if deviceId is empty string', async () => {
      await expect(useCase.execute('')).rejects.toThrow(
        'Valid device ID is required'
      );

      expect(mockDeviceRepository.revokeDevice).not.toHaveBeenCalled();
    });

    it('should throw error if deviceId is not a string', async () => {
      await expect(useCase.execute(123)).rejects.toThrow(
        'Valid device ID is required'
      );

      await expect(useCase.execute({})).rejects.toThrow(
        'Valid device ID is required'
      );

      await expect(useCase.execute([])).rejects.toThrow(
        'Valid device ID is required'
      );

      expect(mockDeviceRepository.revokeDevice).not.toHaveBeenCalled();
    });

    it('should propagate CSRF validation errors', async () => {
      const deviceId = 'device-456';
      const error = new Error('CSRF validation failed');
      mockDeviceRepository.revokeDevice.mockRejectedValue(error);

      await expect(useCase.execute(deviceId)).rejects.toThrow(
        'CSRF validation failed'
      );
    });

    it('should propagate device not found errors', async () => {
      const deviceId = 'device-999';
      const error = new Error('Device not found');
      mockDeviceRepository.revokeDevice.mockRejectedValue(error);

      await expect(useCase.execute(deviceId)).rejects.toThrow(
        'Device not found'
      );
    });

    it('should propagate device already revoked errors', async () => {
      const deviceId = 'device-789';
      const error = new Error('Device already revoked');
      mockDeviceRepository.revokeDevice.mockRejectedValue(error);

      await expect(useCase.execute(deviceId)).rejects.toThrow(
        'Device already revoked'
      );
    });
  });
});
