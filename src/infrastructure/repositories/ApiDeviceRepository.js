 
import Device from '../../domain/entities/Device.js';
import IDeviceRepository from '../../domain/repositories/IDeviceRepository.js';
import apiRequest from '../http/api.js';
import { RUTA_DEL_USUARIO_ACTUAL } from '../../utils/rutasDeLaSesion';

/**
 * API implementation of Device Repository
 * v1.13.0: Device Fingerprinting feature
 */
const MOTIVOS_DE_UN_403 = new Set(['CSRF_VALIDATION_FAILED', 'TERMS_NOT_ACCEPTED']);
// La ruta con sesión más ligera (RUTA_DEL_USUARIO_ACTUAL): el backend comprueba en
// ella el dispositivo del token. La lista de dispositivos era la consulta más cara (FE #1046)

class ApiDeviceRepository extends IDeviceRepository {
  constructor() {
    super();
    // httpOnly cookies handle authentication automatically
  }

  /**
   * @override
   * Fetches all active devices for the current user
   * @returns {Promise<{ devices: Device[], total_count: number }>}
   */
  async getActiveDevices() {
    const data = await apiRequest('/api/v1/users/me/devices', {
      method: 'GET',
    });

    // Validate response structure before mapping
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid API response: expected object');
    }

    if (!Array.isArray(data.devices)) {
      throw new Error('Invalid API response: devices must be an array');
    }

    if (typeof data.total_count !== 'number') {
      throw new Error('Invalid API response: total_count must be a number');
    }

    // Map API DTOs to Device entities
    const devices = data.devices.map(deviceDto => new Device(deviceDto));

    return {
      devices,
      total_count: data.total_count,
    };
  }

  /**
   * @override
   * La respuesta no decide nada (FE #1046): antes, que la lista de dispositivos no
   * trajera el actual echaba con un «revocado» falso al perderse la cookie. La
   * revocación de verdad llega como 401 «Dispositivo revocado», que trata el
   * interceptor
   * @returns {Promise<void>}
   */
  async checkDeviceStatus() {
    await apiRequest(RUTA_DEL_USUARIO_ACTUAL);
  }

  /**
   * @override
   * Revokes (soft deletes) a device by its ID
   * @param {string} deviceId - The device ID to revoke
   * @returns {Promise<{ message: string, device_id: string }>}
   * @throws {Error} Domain error with descriptive message based on HTTP status
   */
  async revokeDevice(deviceId) {
    if (typeof deviceId !== 'string' || deviceId.trim() === '') {
      throw new Error('Device ID is required');
    }

    try {
      const data = await apiRequest(`/api/v1/users/me/devices/${deviceId}`, {
        method: 'DELETE',
      });

      return {
        message: data.message || 'Device revoked successfully',
        device_id: data.device_id || deviceId,
      };
    } catch (error) {
      // Transform HTTP errors to domain errors (Clean Architecture)
      // Repository returns error codes, presentation layer handles i18n
      const statusCode = error.status || error.statusCode;

      // Transform HTTP status codes to domain error codes
      if (statusCode === 403) {
        // Cada 403 con su motivo (FE #1046): antes todos eran «CSRF», también los
        // Términos pendientes o un dispositivo que no es tuyo
        const codigo = MOTIVOS_DE_UN_403.has(error.errorCode) ? error.errorCode : 'FORBIDDEN';
        const domainError = new Error(codigo);
        domainError.code = codigo;
        throw domainError;
      } else if (statusCode === 404) {
        const domainError = new Error('DEVICE_NOT_FOUND');
        domainError.code = 'DEVICE_NOT_FOUND';
        throw domainError;
      } else if (statusCode === 409) {
        const domainError = new Error('DEVICE_ALREADY_REVOKED');
        domainError.code = 'DEVICE_ALREADY_REVOKED';
        throw domainError;
      } else if (statusCode === 401) {
        // Let authentication errors propagate (handled by tokenRefreshInterceptor)
        throw error;
      } else {
        // For other errors, return generic error code with original message
        const domainError = new Error(error.message || 'FAILED_TO_REVOKE_DEVICE');
        domainError.code = 'FAILED_TO_REVOKE_DEVICE';
        domainError.originalMessage = error.message;
        throw domainError;
      }
    }
  }
}

export default ApiDeviceRepository;
