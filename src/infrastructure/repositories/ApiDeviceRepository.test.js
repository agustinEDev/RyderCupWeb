/**
 * Tests for ApiDeviceRepository
 * v1.13.0: Device Fingerprinting feature
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import ApiDeviceRepository from './ApiDeviceRepository';
import Device from '../../domain/entities/Device';
import * as apiModule from '../../services/api';

// Mock the api module
vi.mock('../../services/api', () => ({
  default: vi.fn(),
}));

describe('ApiDeviceRepository', () => {
  let repository;
  let apiRequestMock;

  beforeEach(() => {
    repository = new ApiDeviceRepository();
    apiRequestMock = apiModule.default;
    vi.clearAllMocks();
  });

  describe('getActiveDevices', () => {
    it('should fetch and return active devices as Device entities', async () => {
      const mockApiResponse = {
        devices: [
          {
            id: 'device-1',
            device_name: 'Chrome 120.0 on macOS',
            ip_address: '192.168.1.100',
            last_used_at: '2026-01-09T10:30:00Z',
            created_at: '2026-01-05T08:15:00Z',
            is_active: true,
            is_current_device: true,
          },
          {
            id: 'device-2',
            device_name: 'Safari 17.2 on iOS',
            ip_address: '10.0.0.50',
            last_used_at: '2026-01-08T15:20:00Z',
            created_at: '2026-01-03T12:00:00Z',
            is_active: true,
            is_current_device: false,
          },
        ],
        total_count: 2,
      };

      apiRequestMock.mockResolvedValue(mockApiResponse);

      const result = await repository.getActiveDevices();

      expect(apiRequestMock).toHaveBeenCalledWith('/api/v1/users/me/devices', {
        method: 'GET',
      });

      expect(result.devices).toHaveLength(2);
      expect(result.devices[0]).toBeInstanceOf(Device);
      expect(result.devices[0].id).toBe('device-1');
      expect(result.devices[0].deviceName).toBe('Chrome 120.0 on macOS');
      expect(result.devices[0].isCurrentDevice).toBe(true);
      expect(result.devices[1]).toBeInstanceOf(Device);
      expect(result.devices[1].id).toBe('device-2');
      expect(result.devices[1].isCurrentDevice).toBe(false);
      expect(result.total_count).toBe(2);
    });

    it('should return empty array if no devices', async () => {
      const mockApiResponse = {
        devices: [],
        total_count: 0,
      };

      apiRequestMock.mockResolvedValue(mockApiResponse);

      const result = await repository.getActiveDevices();

      expect(result.devices).toHaveLength(0);
      expect(result.total_count).toBe(0);
    });

    it('should throw error if API request fails', async () => {
      const error = new Error('Network error');
      apiRequestMock.mockRejectedValue(error);

      await expect(repository.getActiveDevices()).rejects.toThrow('Network error');
    });

    it('should throw error if API returns null', async () => {
      apiRequestMock.mockResolvedValue(null);

      await expect(repository.getActiveDevices()).rejects.toThrow(
        'Invalid API response: expected object'
      );
    });

    it('should throw error if API returns non-object', async () => {
      apiRequestMock.mockResolvedValue('not an object');

      await expect(repository.getActiveDevices()).rejects.toThrow(
        'Invalid API response: expected object'
      );
    });

    it('should throw error if devices is not an array', async () => {
      const mockApiResponse = {
        devices: 'not-an-array',
        total_count: 0,
      };

      apiRequestMock.mockResolvedValue(mockApiResponse);

      await expect(repository.getActiveDevices()).rejects.toThrow(
        'Invalid API response: devices must be an array'
      );
    });

    it('should throw error if devices is null', async () => {
      const mockApiResponse = {
        devices: null,
        total_count: 0,
      };

      apiRequestMock.mockResolvedValue(mockApiResponse);

      await expect(repository.getActiveDevices()).rejects.toThrow(
        'Invalid API response: devices must be an array'
      );
    });

    it('should throw error if total_count is not a number', async () => {
      const mockApiResponse = {
        devices: [],
        total_count: '5',
      };

      apiRequestMock.mockResolvedValue(mockApiResponse);

      await expect(repository.getActiveDevices()).rejects.toThrow(
        'Invalid API response: total_count must be a number'
      );
    });

    it('should throw error if total_count is null', async () => {
      const mockApiResponse = {
        devices: [],
        total_count: null,
      };

      apiRequestMock.mockResolvedValue(mockApiResponse);

      await expect(repository.getActiveDevices()).rejects.toThrow(
        'Invalid API response: total_count must be a number'
      );
    });
  });

  describe('revokeDevice', () => {
    it('should revoke device successfully', async () => {
      const deviceId = 'device-123';
      const mockApiResponse = {
        message: 'Dispositivo revocado exitosamente',
        device_id: deviceId,
      };

      apiRequestMock.mockResolvedValue(mockApiResponse);

      const result = await repository.revokeDevice(deviceId);

      expect(apiRequestMock).toHaveBeenCalledWith(
        `/api/v1/users/me/devices/${deviceId}`,
        {
          method: 'DELETE',
        }
      );

      expect(result).toEqual({
        message: 'Dispositivo revocado exitosamente',
        device_id: deviceId,
      });
    });

    it('should use default message if API does not provide one', async () => {
      const deviceId = 'device-456';
      const mockApiResponse = {
        device_id: deviceId,
      };

      apiRequestMock.mockResolvedValue(mockApiResponse);

      const result = await repository.revokeDevice(deviceId);

      expect(result.message).toBe('Device revoked successfully');
      expect(result.device_id).toBe(deviceId);
    });

    it('should use provided deviceId if API does not return one', async () => {
      const deviceId = 'device-789';
      const mockApiResponse = {
        message: 'Success',
      };

      apiRequestMock.mockResolvedValue(mockApiResponse);

      const result = await repository.revokeDevice(deviceId);

      expect(result.device_id).toBe(deviceId);
    });

    it('should throw error if deviceId is missing', async () => {
      await expect(repository.revokeDevice(null)).rejects.toThrow(
        'Device ID is required'
      );
      await expect(repository.revokeDevice(undefined)).rejects.toThrow(
        'Device ID is required'
      );
      await expect(repository.revokeDevice('')).rejects.toThrow(
        'Device ID is required'
      );

      expect(apiRequestMock).not.toHaveBeenCalled();
    });

    it('should throw error if API request fails with 403', async () => {
      const deviceId = 'device-999';
      const error = new Error('CSRF validation failed');
      apiRequestMock.mockRejectedValue(error);

      await expect(repository.revokeDevice(deviceId)).rejects.toThrow(
        'CSRF validation failed'
      );
    });

    it('should throw error if API request fails with 404', async () => {
      const deviceId = 'device-999';
      const error = new Error('Device not found');
      apiRequestMock.mockRejectedValue(error);

      await expect(repository.revokeDevice(deviceId)).rejects.toThrow(
        'Device not found'
      );
    });

    it('should throw error if API request fails with 409', async () => {
      const deviceId = 'device-999';
      const error = new Error('Device already revoked');
      apiRequestMock.mockRejectedValue(error);

      await expect(repository.revokeDevice(deviceId)).rejects.toThrow(
        'Device already revoked'
      );
    });
  });

  describe('revokeDevice - HTTP to Domain Error Transformation', () => {
    it('should transform HTTP 403 to domain error code CSRF_VALIDATION_FAILED', async () => {
      const deviceId = 'device-123';
      const httpError = new Error('Forbidden');
      httpError.status = 403;
      httpError.statusCode = 403;

      apiRequestMock.mockRejectedValue(httpError);

      await expect(repository.revokeDevice(deviceId)).rejects.toMatchObject({
        message: 'CSRF_VALIDATION_FAILED',
        code: 'CSRF_VALIDATION_FAILED',
      });
    });

    it('should transform HTTP 404 to domain error code DEVICE_NOT_FOUND', async () => {
      const deviceId = 'device-456';
      const httpError = new Error('Not Found');
      httpError.status = 404;
      httpError.statusCode = 404;

      apiRequestMock.mockRejectedValue(httpError);

      await expect(repository.revokeDevice(deviceId)).rejects.toMatchObject({
        message: 'DEVICE_NOT_FOUND',
        code: 'DEVICE_NOT_FOUND',
      });
    });

    it('should transform HTTP 409 to domain error code DEVICE_ALREADY_REVOKED', async () => {
      const deviceId = 'device-789';
      const httpError = new Error('Conflict');
      httpError.status = 409;
      httpError.statusCode = 409;

      apiRequestMock.mockRejectedValue(httpError);

      await expect(repository.revokeDevice(deviceId)).rejects.toMatchObject({
        message: 'DEVICE_ALREADY_REVOKED',
        code: 'DEVICE_ALREADY_REVOKED',
      });
    });

    it('should propagate HTTP 401 authentication errors unchanged', async () => {
      const deviceId = 'device-999';
      const authError = new Error('Unauthorized');
      authError.status = 401;
      authError.statusCode = 401;

      apiRequestMock.mockRejectedValue(authError);

      // Should propagate original error for token refresh interceptor
      await expect(repository.revokeDevice(deviceId)).rejects.toThrow('Unauthorized');
      await expect(repository.revokeDevice(deviceId)).rejects.toMatchObject({
        status: 401,
      });
    });

    it('should use backend error message for other HTTP status codes', async () => {
      const deviceId = 'device-abc';
      const httpError = new Error('Internal Server Error');
      httpError.status = 500;
      httpError.statusCode = 500;

      apiRequestMock.mockRejectedValue(httpError);

      await expect(repository.revokeDevice(deviceId)).rejects.toMatchObject({
        message: 'Internal Server Error',
        code: 'FAILED_TO_REVOKE_DEVICE',
        originalMessage: 'Internal Server Error',
      });
    });

    it('should use fallback error code if backend provides no message', async () => {
      const deviceId = 'device-xyz';
      const httpError = new Error('');
      httpError.status = 500;
      httpError.statusCode = 500;

      apiRequestMock.mockRejectedValue(httpError);

      await expect(repository.revokeDevice(deviceId)).rejects.toMatchObject({
        message: 'FAILED_TO_REVOKE_DEVICE',
        code: 'FAILED_TO_REVOKE_DEVICE',
      });
    });

    it('should handle statusCode field (alias for status)', async () => {
      const deviceId = 'device-def';
      const httpError = new Error('Not Found');
      httpError.statusCode = 404; // Only statusCode, no status

      apiRequestMock.mockRejectedValue(httpError);

      await expect(repository.revokeDevice(deviceId)).rejects.toMatchObject({
        message: 'DEVICE_NOT_FOUND',
        code: 'DEVICE_NOT_FOUND',
      });
    });

    it('should handle errors without status codes', async () => {
      const deviceId = 'device-ghi';
      const networkError = new Error('Network timeout');
      // No status/statusCode field

      apiRequestMock.mockRejectedValue(networkError);

      await expect(repository.revokeDevice(deviceId)).rejects.toMatchObject({
        message: 'Network timeout',
        code: 'FAILED_TO_REVOKE_DEVICE',
        originalMessage: 'Network timeout',
      });
    });
  });
});
