import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

import {
  getActiveDevicesUseCase,
  revokeDeviceUseCase,
} from '../composition';

/**
 * Custom hook for Device Management
 * v1.13.0: Device Fingerprinting feature
 * v1.14.0: Added i18n error handling (Clean Architecture)
 */
export const useDeviceManagement = () => {
  const { t } = useTranslation('devices');
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

      // Translate error code or use fallback
      const errorMessage = error.code
        ? t(`errors.${error.code}`, { defaultValue: t('errors.FAILED_TO_LOAD_DEVICES') })
        : error.message || t('errors.FAILED_TO_LOAD_DEVICES');

      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [t]); // Added 't' dependency for i18n translations

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

      // Translate domain error code (Repository returns error codes, not messages)
      const errorMessage = error.code
        ? t(`errors.${error.code}`, { defaultValue: t('errors.FAILED_TO_REVOKE_DEVICE') })
        : error.message || t('errors.FAILED_TO_REVOKE_DEVICE');

      toast.error(errorMessage);

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

  return {
    // State
    devices,
    isLoading,
    revokingDeviceIds,

    // Actions
    fetchDevices,
    revokeDevice,
  };
};
