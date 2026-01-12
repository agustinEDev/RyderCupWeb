import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

import {
  getActiveDevicesUseCase,
  revokeDeviceUseCase,
} from '../composition';

/**
 * Custom hook for Device Management
 * v1.13.0: Device Fingerprinting feature
 */
export const useDeviceManagement = () => {
  const [devices, setDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [revokingDeviceIds, setRevokingDeviceIds] = useState(new Set());

  /**
   * Fetches all active devices for the current user
   */
  const fetchDevices = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await getActiveDevicesUseCase.execute();
      setDevices(result.devices || []);
    } catch (error) {
      console.error('❌ [useDeviceManagement] Error fetching devices:', error);
      toast.error(error.message || 'Failed to load devices');
    } finally {
      setIsLoading(false);
    }
  }, []); // No external dependencies - uses stable setters and imported use case

  // Fetch devices on mount
  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  /**
   * Revokes a specific device
   * @param {string} deviceId - The device ID to revoke
   * @returns {Promise<boolean>} - Returns true if revoked successfully
   */
  const revokeDevice = async (deviceId) => {
    if (!deviceId) {
      toast.error('Device ID is required');
      return false;
    }

    try {
      // Add device ID to revoking set
      setRevokingDeviceIds(prev => new Set(prev).add(deviceId));

      await revokeDeviceUseCase.execute(deviceId);

      // Remove device from local state
      setDevices(prevDevices => prevDevices.filter(d => d.id !== deviceId));

      toast.success('Device revoked successfully');
      return true;
    } catch (error) {
      console.error('❌ [useDeviceManagement] Error revoking device:', error);

      // Handle specific errors based on HTTP status code
      if (error.status === 403 || error.statusCode === 403) {
        toast.error('CSRF validation failed. Please refresh the page.');
      } else if (error.status === 409 || error.statusCode === 409) {
        toast.error('Device already revoked');
      } else if (error.status === 404 || error.statusCode === 404) {
        toast.error('Device not found');
      } else {
        // Use the actual error message from the backend
        toast.error(error.message || 'Failed to revoke device');
      }

      return false;
    } finally {
      // Remove device ID from revoking set
      setRevokingDeviceIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(deviceId);
        return newSet;
      });
    }
  };

  /**
   * Checks if a device is the current one based on User-Agent
   * @param {Object} device - The device object
   * @returns {boolean}
   */
  const isCurrentDevice = (device) => {
    if (!device || !device.deviceName) return false;

    const currentUA = navigator.userAgent;
    const deviceNameLower = device.deviceName.toLowerCase();

    // Priority order: Edge/Opera first, then Chrome, then Firefox, then Safari
    // This prevents Chrome from matching Safari (since Chrome UA contains "Safari")
    if (currentUA.includes('Edg')) {
      return deviceNameLower.includes('edge');
    }
    if (currentUA.includes('OPR') || currentUA.includes('Opera')) {
      return deviceNameLower.includes('opera');
    }
    if (currentUA.includes('Chrome') || currentUA.includes('Chromium')) {
      return deviceNameLower.includes('chrome');
    }
    if (currentUA.includes('Firefox')) {
      return deviceNameLower.includes('firefox');
    }
    // Safari: Match browser AND OS to distinguish macOS vs iOS
    if (currentUA.includes('Safari') && !currentUA.includes('Chrome')) {
      if (!deviceNameLower.includes('safari')) return false;

      // Distinguish between macOS Safari and iOS Safari
      const isMacOS = currentUA.includes('Macintosh') || currentUA.includes('Mac OS X');
      const isIOS = currentUA.includes('iPhone') || currentUA.includes('iPad') || currentUA.includes('iPod');

      // Match macOS Safari
      if (isMacOS && deviceNameLower.includes('macos')) return true;
      // Match iOS Safari
      if (isIOS && deviceNameLower.includes('ios')) return true;

      // Fallback: If device name doesn't specify OS, don't mark as current
      return false;
    }

    return false;
  };

  return {
    // State
    devices,
    isLoading,
    revokingDeviceIds,

    // Actions
    fetchDevices,
    revokeDevice,
    isCurrentDevice,
  };
};
