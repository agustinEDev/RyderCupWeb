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

      // Handle specific errors
      if (error.message && error.message.includes('403')) {
        toast.error('CSRF validation failed. Please refresh the page.');
      } else if (error.message && error.message.includes('409')) {
        toast.error('Device already revoked');
      } else if (error.message && error.message.includes('404')) {
        toast.error('Device not found');
      } else {
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

    // Simple heuristic: check if browser name is in device_name
    const browserMatch = currentUA.match(/(Chrome|Firefox|Safari|Edge|Opera)/i);
    if (browserMatch) {
      return deviceNameLower.includes(browserMatch[0].toLowerCase());
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
