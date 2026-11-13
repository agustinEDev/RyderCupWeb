import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import customToast from '../utils/toast';
import { useCargaCancelableEffect } from './useCargaCancelableEffect';

import { getActiveDevicesUseCase, revokeDeviceUseCase } from '../composition';

/**
 * Custom hook for Device Management
 * v1.13.0: Device Fingerprinting feature
 * v1.14.0: Added i18n error handling (Clean Architecture)
 */
export const useDeviceManagement = () => {
  const { t } = useTranslation('devices');
  const [devices, setDevices] = useState([]);
  const [revokingDeviceIds, setRevokingDeviceIds] = useState(new Set());
  const [deviceErrors, setDeviceErrors] = useState(new Map()); // v1.14.0: Track errors per device

  /**
   * Los dispositivos activos del usuario: al entrar y otra vez al cambiar de
   * idioma (`t`). Solo se aplica la última lectura pedida, y una que falla
   * tras salir de la pantalla no avisa en otra.
   */
  const { cargando: isLoading, recargar } = useCargaCancelableEffect(
    () => getActiveDevicesUseCase.execute(),
    [t],
    {
      alCargar: (result) => setDevices(result.devices || []),
      alFallar: (error) => {
        console.error(
          '❌ [useDeviceManagement] Error fetching devices:',
          error,
        );

        // Translate error code or use fallback
        const errorMessage = error.code
          ? t(`errors.${error.code}`, {
              defaultValue: t('errors.FAILED_TO_LOAD_DEVICES'),
            })
          : error.message || t('errors.FAILED_TO_LOAD_DEVICES');

        customToast.error(errorMessage);
      },
    },
  );
  // La misma API de antes: vuelve a pedir con la espera, sin pasar un evento
  const fetchDevices = useCallback(() => recargar(), [recargar]);

  /**
   * Revokes a specific device
   * @param {string} deviceId - The device ID to revoke
   * @returns {Promise<boolean>} - Returns true if revoked successfully
   */
  const revokeDevice = async (deviceId) => {
    if (!deviceId) {
      customToast.error(t('errors.DEVICE_ID_REQUIRED'));
      return false;
    }

    try {
      // Clear any previous error for this device
      setDeviceErrors((prev) => {
        const newMap = new Map(prev);
        newMap.delete(deviceId);
        return newMap;
      });

      // Add device ID to revoking set
      setRevokingDeviceIds((prev) => new Set(prev).add(deviceId));

      await revokeDeviceUseCase.execute(deviceId);

      // Remove device from local state
      setDevices((prevDevices) => prevDevices.filter((d) => d.id !== deviceId));

      customToast.success(t('success.deviceRevoked'));
      return true;
    } catch (error) {
      console.error('❌ [useDeviceManagement] Error revoking device:', error);

      // Translate domain error code (Repository returns error codes, not messages)
      const errorMessage = error.code
        ? t(`errors.${error.code}`, {
            defaultValue: t('errors.FAILED_TO_REVOKE_DEVICE'),
          })
        : error.message || t('errors.FAILED_TO_REVOKE_DEVICE');

      // Show toast AND save error for inline display
      customToast.error(errorMessage);

      // Save error for this specific device (v1.14.0: Inline error display)
      setDeviceErrors((prev) => {
        const newMap = new Map(prev);
        newMap.set(deviceId, errorMessage);
        return newMap;
      });

      return false;
    } finally {
      // Remove device ID from revoking set
      setRevokingDeviceIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(deviceId);
        return newSet;
      });
    }
  };

  /**
   * Clears error for a specific device
   * @param {string} deviceId - The device ID to clear error for
   */
  const clearDeviceError = useCallback((deviceId) => {
    setDeviceErrors((prev) => {
      const newMap = new Map(prev);
      newMap.delete(deviceId);
      return newMap;
    });
  }, []);

  return {
    // State
    devices,
    isLoading,
    revokingDeviceIds,
    deviceErrors, // v1.14.0: Per-device error tracking

    // Actions
    fetchDevices,
    revokeDevice,
    clearDeviceError, // v1.14.0: Clear inline error
  };
};
