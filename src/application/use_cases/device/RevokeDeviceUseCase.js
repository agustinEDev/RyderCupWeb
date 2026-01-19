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
   * @throws {Error} If repository response is invalid
   */
  async execute(deviceId) {
    if (!deviceId || typeof deviceId !== 'string') {
      throw new Error('Valid device ID is required');
    }

    const result = await this.deviceRepository.revokeDevice(deviceId);

    // Validate response structure
    if (!result || typeof result !== 'object' || Array.isArray(result)) {
      throw new Error('Invalid response from device repository: expected object');
    }

    if (typeof result.message !== 'string') {
      throw new Error('Invalid response from device repository: message must be a string');
    }

    if (typeof result.device_id !== 'string') {
      throw new Error('Invalid response from device repository: device_id must be a string');
    }

    return result;
  }
}

export default RevokeDeviceUseCase;
