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
   */
  async execute() {
    const result = await this.deviceRepository.getActiveDevices();

    if (!result || !Array.isArray(result.devices) || typeof result.total_count !== 'number' || !isFinite(result.total_count)) {
      throw new Error('Invalid response from device repository');
    }

    return result;
  }
}

export default GetActiveDevicesUseCase;
