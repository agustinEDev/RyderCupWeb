/**
 * Tests for useDeviceManagement Hook
 * v1.14.0: Fix #7 - iOS Safari Device Detection (iPadOS 13+ support)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDeviceManagement } from './useDeviceManagement';
import * as composition from '../composition';

// Mock composition
vi.mock('../composition', () => ({
  getActiveDevicesUseCase: {
    execute: vi.fn(),
  },
  revokeDeviceUseCase: {
    execute: vi.fn(),
  },
}));

// Mock toast
vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('useDeviceManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset navigator mocks
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      value: 0,
    });
  });

  describe('isCurrentDevice', () => {
    describe('Safari detection', () => {
      it('should detect macOS Safari correctly (not iPad)', () => {
        // Mock macOS Safari User-Agent (NO touch support)
        Object.defineProperty(navigator, 'userAgent', {
          writable: true,
          value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15',
        });
        Object.defineProperty(navigator, 'maxTouchPoints', {
          writable: true,
          value: 0, // No touch support = real Mac
        });

        composition.getActiveDevicesUseCase.execute.mockResolvedValue({
          devices: [],
          total_count: 0,
        });

        const { result } = renderHook(() => useDeviceManagement());

        const macDevice = {
          id: 'device-1',
          deviceName: 'Safari on macOS',
        };

        expect(result.current.isCurrentDevice(macDevice)).toBe(true);
      });

      it('should detect iPad with iPadOS 13+ correctly (identifies as Mac but has touch)', () => {
        // Mock iPadOS 13+ User-Agent (identifies as Macintosh but has touch)
        Object.defineProperty(navigator, 'userAgent', {
          writable: true,
          value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15',
        });
        Object.defineProperty(navigator, 'maxTouchPoints', {
          writable: true,
          value: 5, // Touch support = iPad
        });

        composition.getActiveDevicesUseCase.execute.mockResolvedValue({
          devices: [],
          total_count: 0,
        });

        const { result } = renderHook(() => useDeviceManagement());

        const iPadDevice = {
          id: 'device-2',
          deviceName: 'Safari on iPad',
        };

        expect(result.current.isCurrentDevice(iPadDevice)).toBe(true);
      });

      it('should NOT detect macOS Safari as iPad device', () => {
        // Mock macOS Safari User-Agent
        Object.defineProperty(navigator, 'userAgent', {
          writable: true,
          value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15',
        });
        Object.defineProperty(navigator, 'maxTouchPoints', {
          writable: true,
          value: 0, // No touch
        });

        composition.getActiveDevicesUseCase.execute.mockResolvedValue({
          devices: [],
          total_count: 0,
        });

        const { result } = renderHook(() => useDeviceManagement());

        const iPadDevice = {
          id: 'device-2',
          deviceName: 'Safari on iPad', // Device is iPad
        };

        // macOS Safari should NOT match iPad device name
        expect(result.current.isCurrentDevice(iPadDevice)).toBe(false);
      });

      it('should NOT detect iPadOS 13+ as macOS device', () => {
        // Mock iPadOS 13+ User-Agent
        Object.defineProperty(navigator, 'userAgent', {
          writable: true,
          value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15',
        });
        Object.defineProperty(navigator, 'maxTouchPoints', {
          writable: true,
          value: 5, // Touch support
        });

        composition.getActiveDevicesUseCase.execute.mockResolvedValue({
          devices: [],
          total_count: 0,
        });

        const { result } = renderHook(() => useDeviceManagement());

        const macDevice = {
          id: 'device-1',
          deviceName: 'Safari on macOS', // Device is macOS
        };

        // iPadOS should NOT match macOS device name
        expect(result.current.isCurrentDevice(macDevice)).toBe(false);
      });

      it('should detect iPhone Safari correctly', () => {
        // Mock iPhone Safari User-Agent
        Object.defineProperty(navigator, 'userAgent', {
          writable: true,
          value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        });

        composition.getActiveDevicesUseCase.execute.mockResolvedValue({
          devices: [],
          total_count: 0,
        });

        const { result } = renderHook(() => useDeviceManagement());

        const iPhoneDevice = {
          id: 'device-3',
          deviceName: 'Safari on iPhone',
        };

        expect(result.current.isCurrentDevice(iPhoneDevice)).toBe(true);
      });

      it('should detect iPad with old iOS correctly (contains "iPad" in UA)', () => {
        // Mock iPad with iOS < 13 (includes "iPad" in UA)
        Object.defineProperty(navigator, 'userAgent', {
          writable: true,
          value: 'Mozilla/5.0 (iPad; CPU OS 12_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0 Mobile/15E148 Safari/604.1',
        });

        composition.getActiveDevicesUseCase.execute.mockResolvedValue({
          devices: [],
          total_count: 0,
        });

        const { result } = renderHook(() => useDeviceManagement());

        const iPadDevice = {
          id: 'device-4',
          deviceName: 'Safari on iPad',
        };

        expect(result.current.isCurrentDevice(iPadDevice)).toBe(true);
      });
    });

    describe('Other browsers detection', () => {
      it('should detect Chrome correctly', () => {
        Object.defineProperty(navigator, 'userAgent', {
          writable: true,
          value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        });

        composition.getActiveDevicesUseCase.execute.mockResolvedValue({
          devices: [],
          total_count: 0,
        });

        const { result } = renderHook(() => useDeviceManagement());

        const chromeDevice = {
          id: 'device-5',
          deviceName: 'Chrome on macOS',
        };

        expect(result.current.isCurrentDevice(chromeDevice)).toBe(true);
      });

      it('should detect Firefox correctly', () => {
        Object.defineProperty(navigator, 'userAgent', {
          writable: true,
          value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
        });

        composition.getActiveDevicesUseCase.execute.mockResolvedValue({
          devices: [],
          total_count: 0,
        });

        const { result } = renderHook(() => useDeviceManagement());

        const firefoxDevice = {
          id: 'device-6',
          deviceName: 'Firefox on macOS',
        };

        expect(result.current.isCurrentDevice(firefoxDevice)).toBe(true);
      });

      it('should detect Edge correctly', () => {
        Object.defineProperty(navigator, 'userAgent', {
          writable: true,
          value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        });

        composition.getActiveDevicesUseCase.execute.mockResolvedValue({
          devices: [],
          total_count: 0,
        });

        const { result } = renderHook(() => useDeviceManagement());

        const edgeDevice = {
          id: 'device-7',
          deviceName: 'Edge on macOS',
        };

        expect(result.current.isCurrentDevice(edgeDevice)).toBe(true);
      });
    });

    describe('Edge cases', () => {
      it('should return false for null device', () => {
        composition.getActiveDevicesUseCase.execute.mockResolvedValue({
          devices: [],
          total_count: 0,
        });

        const { result } = renderHook(() => useDeviceManagement());

        expect(result.current.isCurrentDevice(null)).toBe(false);
      });

      it('should return false for device without deviceName', () => {
        composition.getActiveDevicesUseCase.execute.mockResolvedValue({
          devices: [],
          total_count: 0,
        });

        const { result } = renderHook(() => useDeviceManagement());

        const deviceWithoutName = {
          id: 'device-8',
        };

        expect(result.current.isCurrentDevice(deviceWithoutName)).toBe(false);
      });

      it('should return false for mismatched browser', () => {
        Object.defineProperty(navigator, 'userAgent', {
          writable: true,
          value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        });

        composition.getActiveDevicesUseCase.execute.mockResolvedValue({
          devices: [],
          total_count: 0,
        });

        const { result } = renderHook(() => useDeviceManagement());

        const firefoxDevice = {
          id: 'device-9',
          deviceName: 'Firefox on macOS',
        };

        // Current browser is Chrome, device is Firefox
        expect(result.current.isCurrentDevice(firefoxDevice)).toBe(false);
      });
    });
  });

  describe('fetchDevices', () => {
    it('should fetch devices successfully', async () => {
      const mockDevices = [
        {
          id: 'device-1',
          deviceName: 'Chrome on macOS',
          ipAddress: '192.168.1.1',
          lastUsedAt: '2026-01-16T10:00:00Z',
          createdAt: '2026-01-01T10:00:00Z',
          isActive: true,
        },
      ];

      composition.getActiveDevicesUseCase.execute.mockResolvedValue({
        devices: mockDevices,
        total_count: 1,
      });

      const { result } = renderHook(() => useDeviceManagement());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.devices).toEqual(mockDevices);
    });

    it('should handle fetch error', async () => {
      const error = new Error('Network error');
      composition.getActiveDevicesUseCase.execute.mockRejectedValue(error);

      const { result } = renderHook(() => useDeviceManagement());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.devices).toEqual([]);
    });
  });

  describe('revokeDevice', () => {
    it('should revoke device successfully', async () => {
      composition.getActiveDevicesUseCase.execute.mockResolvedValue({
        devices: [
          {
            id: 'device-1',
            deviceName: 'Chrome on macOS',
            ipAddress: '192.168.1.1',
          },
        ],
        total_count: 1,
      });

      composition.revokeDeviceUseCase.execute.mockResolvedValue({
        message: 'Device revoked successfully',
        device_id: 'device-1',
      });

      const { result } = renderHook(() => useDeviceManagement());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const success = await result.current.revokeDevice('device-1');

      expect(success).toBe(true);
      expect(composition.revokeDeviceUseCase.execute).toHaveBeenCalledWith('device-1');

      // Wait for state update after revoke
      await waitFor(() => {
        expect(result.current.devices).toHaveLength(0);
      });
    });

    it('should handle revoke error', async () => {
      composition.getActiveDevicesUseCase.execute.mockResolvedValue({
        devices: [
          {
            id: 'device-1',
            deviceName: 'Chrome on macOS',
          },
        ],
        total_count: 1,
      });

      const error = new Error('Device not found');
      composition.revokeDeviceUseCase.execute.mockRejectedValue(error);

      const { result } = renderHook(() => useDeviceManagement());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const success = await result.current.revokeDevice('device-1');

      expect(success).toBe(false);
      // Device should NOT be removed from state if revoke failed
      expect(result.current.devices).toHaveLength(1);
    });
  });
});
