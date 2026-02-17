/**
 * Tests for Device Entity
 * v1.13.0: Device Fingerprinting feature
 */

import { describe, it, expect } from 'vitest';
import Device from './Device';

describe('Device Entity', () => {
  const validDeviceData = {
    id: 'device-123',
    device_name: 'Chrome 120.0 on macOS',
    ip_address: '192.168.1.100',
    last_used_at: '2026-01-09T10:30:00Z',
    created_at: '2026-01-05T08:15:00Z',
    is_active: true,
    is_current_device: false,
  };

  describe('Constructor', () => {
    it('should create a valid device with all fields', () => {
      const device = new Device(validDeviceData);

      expect(device.id).toBe('device-123');
      expect(device.deviceName).toBe('Chrome 120.0 on macOS');
      expect(device.ipAddress).toBe('192.168.1.100');
      expect(device.lastUsedAt).toBe('2026-01-09T10:30:00Z');
      expect(device.createdAt).toBe('2026-01-05T08:15:00Z');
      expect(device.isActive).toBe(true);
      expect(device.isCurrentDevice).toBe(false);
    });

    it('should default is_active to true if not provided', () => {
      const deviceData = {
        id: 'device-456',
        device_name: 'Safari on iOS',
        ip_address: '10.0.0.50',
      };

      const device = new Device(deviceData);

      expect(device.isActive).toBe(true);
    });

    it('should throw error if id is missing', () => {
      const deviceData = {
        device_name: 'Chrome on Windows',
        ip_address: '192.168.1.200',
      };

      expect(() => new Device(deviceData)).toThrow(
        'Device entity requires id, device_name, and ip_address'
      );
    });

    it('should throw error if device_name is missing', () => {
      const deviceData = {
        id: 'device-789',
        ip_address: '192.168.1.200',
      };

      expect(() => new Device(deviceData)).toThrow(
        'Device entity requires id, device_name, and ip_address'
      );
    });

    it('should throw error if ip_address is missing', () => {
      const deviceData = {
        id: 'device-789',
        device_name: 'Chrome on Windows',
      };

      expect(() => new Device(deviceData)).toThrow(
        'Device entity requires id, device_name, and ip_address'
      );
    });
  });

  describe('Constructor - Type Validations', () => {
    describe('id type validation', () => {
      it('should throw error if id is a number', () => {
        const deviceData = {
          ...validDeviceData,
          id: 12345,
        };

        expect(() => new Device(deviceData)).toThrow(
          'Device id must be a string'
        );
      });

      it('should throw error if id is an object', () => {
        const deviceData = {
          ...validDeviceData,
          id: { value: 'device-123' },
        };

        expect(() => new Device(deviceData)).toThrow(
          'Device id must be a string'
        );
      });

      it('should throw error if id is an array', () => {
        const deviceData = {
          ...validDeviceData,
          id: ['device-123'],
        };

        expect(() => new Device(deviceData)).toThrow(
          'Device id must be a string'
        );
      });

      it('should throw error if id is a boolean', () => {
        const deviceData = {
          ...validDeviceData,
          id: true,
        };

        expect(() => new Device(deviceData)).toThrow(
          'Device id must be a string'
        );
      });
    });

    describe('device_name type validation', () => {
      it('should throw error if device_name is a number', () => {
        const deviceData = {
          ...validDeviceData,
          device_name: 123,
        };

        expect(() => new Device(deviceData)).toThrow(
          'Device device_name must be a string'
        );
      });

      it('should throw error if device_name is an object', () => {
        const deviceData = {
          ...validDeviceData,
          device_name: { browser: 'Chrome' },
        };

        expect(() => new Device(deviceData)).toThrow(
          'Device device_name must be a string'
        );
      });

      it('should throw error if device_name is an array', () => {
        const deviceData = {
          ...validDeviceData,
          device_name: ['Chrome', 'macOS'],
        };

        expect(() => new Device(deviceData)).toThrow(
          'Device device_name must be a string'
        );
      });
    });

    describe('ip_address type validation', () => {
      it('should throw error if ip_address is a number', () => {
        const deviceData = {
          ...validDeviceData,
          ip_address: 192168001100,
        };

        expect(() => new Device(deviceData)).toThrow(
          'Device ip_address must be a string'
        );
      });

      it('should throw error if ip_address is an object', () => {
        const deviceData = {
          ...validDeviceData,
          ip_address: { ipv4: '192.168.1.100' },
        };

        expect(() => new Device(deviceData)).toThrow(
          'Device ip_address must be a string'
        );
      });

      it('should throw error if ip_address is an array', () => {
        const deviceData = {
          ...validDeviceData,
          ip_address: [192, 168, 1, 100],
        };

        expect(() => new Device(deviceData)).toThrow(
          'Device ip_address must be a string'
        );
      });
    });

    describe('last_used_at type validation', () => {
      it('should accept null for last_used_at', () => {
        const deviceData = {
          ...validDeviceData,
          last_used_at: null,
        };

        const device = new Device(deviceData);

        expect(device.lastUsedAt).toBeNull();
      });

      it('should accept undefined for last_used_at', () => {
        const deviceData = {
          ...validDeviceData,
          last_used_at: undefined,
        };

        const device = new Device(deviceData);

        expect(device.lastUsedAt).toBeUndefined();
      });

      it('should throw error if last_used_at is a number', () => {
        const deviceData = {
          ...validDeviceData,
          last_used_at: 1673262600000,
        };

        expect(() => new Device(deviceData)).toThrow(
          'Device last_used_at must be a string, null, or undefined'
        );
      });

      it('should throw error if last_used_at is an object', () => {
        const deviceData = {
          ...validDeviceData,
          last_used_at: { timestamp: '2026-01-09T10:30:00Z' },
        };

        expect(() => new Device(deviceData)).toThrow(
          'Device last_used_at must be a string, null, or undefined'
        );
      });

      it('should throw error if last_used_at is a boolean', () => {
        const deviceData = {
          ...validDeviceData,
          last_used_at: true,
        };

        expect(() => new Device(deviceData)).toThrow(
          'Device last_used_at must be a string, null, or undefined'
        );
      });
    });

    describe('created_at type validation', () => {
      it('should accept null for created_at', () => {
        const deviceData = {
          ...validDeviceData,
          created_at: null,
        };

        const device = new Device(deviceData);

        expect(device.createdAt).toBeNull();
      });

      it('should accept undefined for created_at', () => {
        const deviceData = {
          ...validDeviceData,
          created_at: undefined,
        };

        const device = new Device(deviceData);

        expect(device.createdAt).toBeUndefined();
      });

      it('should throw error if created_at is a number', () => {
        const deviceData = {
          ...validDeviceData,
          created_at: 1672563300000,
        };

        expect(() => new Device(deviceData)).toThrow(
          'Device created_at must be a string, null, or undefined'
        );
      });

      it('should throw error if created_at is an object', () => {
        const deviceData = {
          ...validDeviceData,
          created_at: { timestamp: '2026-01-05T08:15:00Z' },
        };

        expect(() => new Device(deviceData)).toThrow(
          'Device created_at must be a string, null, or undefined'
        );
      });

      it('should throw error if created_at is an array', () => {
        const deviceData = {
          ...validDeviceData,
          created_at: ['2026-01-05', '08:15:00'],
        };

        expect(() => new Device(deviceData)).toThrow(
          'Device created_at must be a string, null, or undefined'
        );
      });
    });

    describe('is_active type validation', () => {
      it('should accept true for is_active', () => {
        const deviceData = {
          ...validDeviceData,
          is_active: true,
        };

        const device = new Device(deviceData);

        expect(device.isActive).toBe(true);
      });

      it('should accept false for is_active', () => {
        const deviceData = {
          ...validDeviceData,
          is_active: false,
        };

        const device = new Device(deviceData);

        expect(device.isActive).toBe(false);
      });

      it('should throw error if is_active is a number', () => {
        const deviceData = {
          ...validDeviceData,
          is_active: 1,
        };

        expect(() => new Device(deviceData)).toThrow(
          'Device is_active must be a boolean'
        );
      });

      it('should throw error if is_active is a string', () => {
        const deviceData = {
          ...validDeviceData,
          is_active: 'true',
        };

        expect(() => new Device(deviceData)).toThrow(
          'Device is_active must be a boolean'
        );
      });

      it('should throw error if is_active is null', () => {
        const deviceData = {
          ...validDeviceData,
          is_active: null,
        };

        expect(() => new Device(deviceData)).toThrow(
          'Device is_active must be a boolean'
        );
      });

      it('should throw error if is_active is an object', () => {
        const deviceData = {
          ...validDeviceData,
          is_active: { value: true },
        };

        expect(() => new Device(deviceData)).toThrow(
          'Device is_active must be a boolean'
        );
      });
    });

    describe('is_current_device type validation', () => {
      it('should accept true for is_current_device', () => {
        const deviceData = {
          ...validDeviceData,
          is_current_device: true,
        };

        const device = new Device(deviceData);

        expect(device.isCurrentDevice).toBe(true);
      });

      it('should accept false for is_current_device', () => {
        const deviceData = {
          ...validDeviceData,
          is_current_device: false,
        };

        const device = new Device(deviceData);

        expect(device.isCurrentDevice).toBe(false);
      });

      it('should default to false if not provided', () => {
        const deviceData = {
          id: 'device-999',
          device_name: 'Firefox on Linux',
          ip_address: '10.0.0.1',
        };

        const device = new Device(deviceData);

        expect(device.isCurrentDevice).toBe(false);
      });

      it('should throw error if is_current_device is a number', () => {
        const deviceData = {
          ...validDeviceData,
          is_current_device: 1,
        };

        expect(() => new Device(deviceData)).toThrow(
          'Device is_current_device must be a boolean'
        );
      });

      it('should throw error if is_current_device is a string', () => {
        const deviceData = {
          ...validDeviceData,
          is_current_device: 'true',
        };

        expect(() => new Device(deviceData)).toThrow(
          'Device is_current_device must be a boolean'
        );
      });

      it('should throw error if is_current_device is null', () => {
        const deviceData = {
          ...validDeviceData,
          is_current_device: null,
        };

        expect(() => new Device(deviceData)).toThrow(
          'Device is_current_device must be a boolean'
        );
      });

      it('should throw error if is_current_device is an object', () => {
        const deviceData = {
          ...validDeviceData,
          is_current_device: { value: true },
        };

        expect(() => new Device(deviceData)).toThrow(
          'Device is_current_device must be a boolean'
        );
      });
    });
  });

  describe('isDeviceActive', () => {
    it('should return true for active device', () => {
      const device = new Device(validDeviceData);

      expect(device.isDeviceActive()).toBe(true);
    });

    it('should return false for inactive device', () => {
      const device = new Device({
        ...validDeviceData,
        is_active: false,
      });

      expect(device.isDeviceActive()).toBe(false);
    });
  });

  describe('toPersistence', () => {
    it('should return object with snake_case properties', () => {
      const device = new Device(validDeviceData);
      const persistence = device.toPersistence();

      expect(persistence).toEqual({
        id: 'device-123',
        device_name: 'Chrome 120.0 on macOS',
        ip_address: '192.168.1.100',
        last_used_at: '2026-01-09T10:30:00Z',
        created_at: '2026-01-05T08:15:00Z',
        is_active: true,
        is_current_device: false,
      });
    });

    it('should handle null timestamps', () => {
      const device = new Device({
        ...validDeviceData,
        last_used_at: null,
        created_at: null,
      });

      const persistence = device.toPersistence();

      expect(persistence.last_used_at).toBeNull();
      expect(persistence.created_at).toBeNull();
    });
  });
});
