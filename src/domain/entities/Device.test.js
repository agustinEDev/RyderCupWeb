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

  describe('getFormattedLastUsed', () => {
    it('should return formatted date for valid timestamp', () => {
      const device = new Device(validDeviceData);
      const formatted = device.getFormattedLastUsed();

      expect(formatted).toBeTruthy();
      expect(formatted).not.toBe('Never');
    });

    it('should return "Never" if last_used_at is null', () => {
      const device = new Device({
        ...validDeviceData,
        last_used_at: null,
      });

      expect(device.getFormattedLastUsed()).toBe('Never');
    });

    it('should return "Never" if last_used_at is undefined', () => {
      const device = new Device({
        ...validDeviceData,
        last_used_at: undefined,
      });

      expect(device.getFormattedLastUsed()).toBe('Never');
    });
  });

  describe('getFormattedCreatedAt', () => {
    it('should return formatted date for valid timestamp', () => {
      const device = new Device(validDeviceData);
      const formatted = device.getFormattedCreatedAt();

      expect(formatted).toBeTruthy();
      expect(formatted).not.toBe('Unknown');
    });

    it('should return "Unknown" if created_at is null', () => {
      const device = new Device({
        ...validDeviceData,
        created_at: null,
      });

      expect(device.getFormattedCreatedAt()).toBe('Unknown');
    });

    it('should return "Unknown" if created_at is undefined', () => {
      const device = new Device({
        ...validDeviceData,
        created_at: undefined,
      });

      expect(device.getFormattedCreatedAt()).toBe('Unknown');
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
