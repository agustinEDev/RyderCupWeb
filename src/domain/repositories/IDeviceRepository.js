/* eslint-disable no-unused-vars */

/**
 * Device Repository Interface
 * v1.13.0: Device Fingerprinting feature
 */
class IDeviceRepository {
  /**
   * Fetches all active devices for the current user
   * @returns {Promise<{ devices: Array<import('../entities/Device').default>, total_count: number }>}
   */
  async getActiveDevices() {
    throw new Error('Method not implemented: getActiveDevices');
  }

  /**
   * Revokes (soft deletes) a device by its ID
   * @param {string} deviceId - The device ID to revoke
   * @returns {Promise<{ message: string, device_id: string }>}
   */
  async revokeDevice(deviceId) {
    throw new Error('Method not implemented: revokeDevice');
  }
}

export default IDeviceRepository;
