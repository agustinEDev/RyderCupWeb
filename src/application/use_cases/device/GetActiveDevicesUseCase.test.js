/**
 * Tests for GetActiveDevicesUseCase
 * v1.13.0: Device Fingerprinting feature
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import GetActiveDevicesUseCase from './GetActiveDevicesUseCase';
import Device from '../../../domain/entities/Device';

describe('GetActiveDevicesUseCase', () => {
  let useCase;
  let mockDeviceRepository;

  beforeEach(() => {
    mockDeviceRepository = {
      getActiveDevices: vi.fn(),
    };

    useCase = new GetActiveDevicesUseCase({
      deviceRepository: mockDeviceRepository,
    });
  });

  describe('Constructor', () => {
    it('should throw error if deviceRepository is not provided', () => {
      expect(() => new GetActiveDevicesUseCase({})).toThrow(
        'deviceRepository is required'
      );
    });

    it('should create use case with valid dependencies', () => {
      expect(useCase.deviceRepository).toBe(mockDeviceRepository);
    });
  });

  describe('execute', () => {
    it('should return devices from repository', async () => {
      const mockDevices = [
        new Device({
          id: 'device-1',
          device_name: 'Chrome on macOS',
          ip_address: '192.168.1.100',
          last_used_at: '2026-01-09T10:30:00Z',
          created_at: '2026-01-05T08:15:00Z',
          is_active: true,
        }),
        new Device({
          id: 'device-2',
          device_name: 'Safari on iOS',
          ip_address: '10.0.0.50',
          last_used_at: '2026-01-08T15:20:00Z',
          created_at: '2026-01-03T12:00:00Z',
          is_active: true,
        }),
      ];

      mockDeviceRepository.getActiveDevices.mockResolvedValue({
        devices: mockDevices,
        total_count: 2,
      });

      const result = await useCase.execute();

      expect(mockDeviceRepository.getActiveDevices).toHaveBeenCalledTimes(1);
      expect(result.devices).toHaveLength(2);
      expect(result.devices[0]).toBeInstanceOf(Device);
      expect(result.total_count).toBe(2);
    });

    it('should return empty array if no devices', async () => {
      mockDeviceRepository.getActiveDevices.mockResolvedValue({
        devices: [],
        total_count: 0,
      });

      const result = await useCase.execute();

      expect(result.devices).toHaveLength(0);
      expect(result.total_count).toBe(0);
    });

    it('should throw error if repository returns invalid response', async () => {
      mockDeviceRepository.getActiveDevices.mockResolvedValue(null);

      await expect(useCase.execute()).rejects.toThrow(
        'Invalid response from device repository'
      );
    });

    it('should throw error if devices is not an array', async () => {
      mockDeviceRepository.getActiveDevices.mockResolvedValue({
        devices: 'not-an-array',
        total_count: 0,
      });

      await expect(useCase.execute()).rejects.toThrow(
        'Invalid response from device repository'
      );
    });

    it('should propagate repository errors', async () => {
      const error = new Error('Database connection failed');
      mockDeviceRepository.getActiveDevices.mockRejectedValue(error);

      await expect(useCase.execute()).rejects.toThrow(
        'Database connection failed'
      );
    });
  });
});
