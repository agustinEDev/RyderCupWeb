/**
 * RevokeDeviceUseCase
 * v1.13.0: Device Fingerprinting feature
 * Revokes (soft deletes) a specific device
 */
class RevokeDeviceUseCase {
  /**
   * @param {Object} deps - Dependencies
   * @param {import('../../../domain/repositories/IDeviceRepository').default} deps.deviceRepository - Device repository
   */
  constructor({ deviceRepository }) {
    if (!deviceRepository) {
      throw new Error('deviceRepository is required');
    }
    this.deviceRepository = deviceRepository;
  }

  /**
   * Executes the use case
   * @param {string} deviceId - The device ID to revoke
   * @returns {Promise<{ message: string, device_id: string }>}
   */
  async execute(deviceId) {
    if (!deviceId || typeof deviceId !== 'string') {
      throw new Error('Valid device ID is required');
    }

    const result = await this.deviceRepository.revokeDevice(deviceId);

    return result;
  }
}

export default RevokeDeviceUseCase;
