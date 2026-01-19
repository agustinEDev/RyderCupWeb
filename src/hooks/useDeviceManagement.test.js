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
