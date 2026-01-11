/**
 * GetActiveDevicesUseCase
 * v1.13.0: Device Fingerprinting feature
 * Retrieves all active devices for the current user
 */
class GetActiveDevicesUseCase {
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
   * @returns {Promise<{ devices: import('../../../domain/entities/Device').default[], total_count: number }>}
   * @throws {Error} If repository response is invalid
   */
  async execute() {
    const result = await this.deviceRepository.getActiveDevices();

    // Validate response structure
    if (!result || typeof result !== 'object') {
      throw new Error('Invalid response from device repository: expected object');
    }

    if (!Array.isArray(result.devices)) {
      throw new Error('Invalid response from device repository: devices must be an array');
    }

    // Strict number validation: must be a number AND finite (excludes null, undefined, NaN, Infinity)
    if (typeof result.total_count !== 'number' || !Number.isFinite(result.total_count)) {
      throw new Error('Invalid response from device repository: total_count must be a finite number');
    }

    return result;
  }
}

export default GetActiveDevicesUseCase;
