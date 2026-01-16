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

  /**
   * Checks if a device is the current one based on User-Agent
   * Uses regex with word boundaries to prevent false positives
   * @param {Object} device - The device object
   * @returns {boolean}
   */
  const isCurrentDevice = (device) => {
    if (!device || !device.deviceName) return false;

    const currentUA = navigator.userAgent;
    const deviceNameLower = device.deviceName.toLowerCase();

    // Debug logging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('[isCurrentDevice] Checking device:', {
        deviceName: device.deviceName,
        userAgent: currentUA,
      });
    }

    // Regex patterns with word boundaries to prevent false positives
    // \b ensures we match whole words, not substrings within other words
    const edgeRegex = /\bedge\b/i;
    const operaRegex = /\bopera\b/i;
    const chromeRegex = /\bchrome\b|\bchromium\b/i;
    const firefoxRegex = /\bfirefox\b/i;

    // Priority order: Edge/Opera first, then Chrome, then Firefox, then Safari
    // This prevents Chrome from matching Safari (since Chrome UA contains "Safari")
    if (currentUA.includes('Edg')) {
      return edgeRegex.test(deviceNameLower);
    }
    if (currentUA.includes('OPR') || currentUA.includes('Opera')) {
      return operaRegex.test(deviceNameLower);
    }
    if (currentUA.includes('Chrome') || currentUA.includes('Chromium')) {
      return chromeRegex.test(deviceNameLower);
    }
    if (currentUA.includes('Firefox')) {
      return firefoxRegex.test(deviceNameLower);
    }

    // Safari: Match browser AND OS to distinguish macOS vs iOS
    if (currentUA.includes('Safari') && !currentUA.includes('Chrome')) {
      const safariRegex = /\bsafari\b/i;
      if (!safariRegex.test(deviceNameLower)) return false;

      // Distinguish between macOS Safari and iOS Safari
      const isMacOS = currentUA.includes('Macintosh') || currentUA.includes('Mac OS X');
      // iOS detection including iPadOS 13+ (which identifies as Mac but has touch support)
      const isIOS = currentUA.includes('iPhone') ||
                    currentUA.includes('iPad') ||
                    currentUA.includes('iPod') ||
                    // iPadOS 13+ identifies as Macintosh but has touch capabilities
                    (currentUA.includes('Macintosh') && navigator.maxTouchPoints > 1);

      // Regex patterns for OS detection with word boundaries
      const iosRegex = /\b(ios|iphone|ipad|ipod)\b/i;
      const macOSRegex = /\b(macos|mac\s*os|macintosh|mac)\b/i;

      // Check OS match with more flexible patterns
      // IMPORTANT: Check iOS first, as iPadOS 13+ matches both isMacOS and isIOS
      if (isIOS) {
        const isIOSDevice = iosRegex.test(deviceNameLower);

        if (process.env.NODE_ENV === 'development') {
          console.log('[isCurrentDevice] iOS Safari check:', { isIOSDevice, deviceNameLower });
        }

        return isIOSDevice;
      }

      // Check macOS Safari (only if NOT iOS/iPadOS)
      if (isMacOS && !isIOS) {
        // Match macOS but NOT if it contains iPhone (prevents false positives)
        const isMacOSDevice = macOSRegex.test(deviceNameLower) &&
                              !deviceNameLower.includes('iphone');

        if (process.env.NODE_ENV === 'development') {
          console.log('[isCurrentDevice] macOS Safari check:', { isMacOSDevice, deviceNameLower });
        }

        return isMacOSDevice;
      }

      // Fallback: If we can't determine OS, don't mark as current
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
