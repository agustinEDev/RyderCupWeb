 
import Device from '../../domain/entities/Device.js';
import IDeviceRepository from '../../domain/repositories/IDeviceRepository.js';
import apiRequest from '../../services/api.js';

/**
 * API implementation of Device Repository
 * v1.13.0: Device Fingerprinting feature
 */
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

    // Map API DTOs to Device entities
    const devices = data.devices.map(deviceDto => new Device(deviceDto));

    return {
      devices,
      total_count: data.total_count,
    };
  }

  /**
   * @override
   * Revokes (soft deletes) a device by its ID
   * @param {string} deviceId - The device ID to revoke
   * @returns {Promise<{ message: string, device_id: string }>}
   */
  async revokeDevice(deviceId) {
    if (!deviceId) {
      throw new Error('Device ID is required');
    }

    const data = await apiRequest(`/api/v1/users/me/devices/${deviceId}`, {
      method: 'DELETE',
    });

    return {
      message: data.message || 'Device revoked successfully',
      device_id: data.device_id || deviceId,
    };
  }
}

export default ApiDeviceRepository;
