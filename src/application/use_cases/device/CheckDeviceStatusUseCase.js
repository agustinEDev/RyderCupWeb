/**
 * CheckDeviceStatusUseCase
 *
 * Hace una petición con sesión para que el backend diga si este dispositivo se
 * revocó (FE #1046 / BE #737). La respuesta no decide nada: la revocación de
 * verdad llega como 401 «Dispositivo revocado», que trata el interceptor del
 * refresco. Lo usa el monitor de dispositivos (`useDeviceRevocationMonitor`).
 */
class CheckDeviceStatusUseCase {
  /**
   * @param {Object} deps
   * @param {import('../../../domain/repositories/IDeviceRepository').default} deps.deviceRepository
   */
  constructor({ deviceRepository }) {
    if (!deviceRepository) {
      throw new Error('deviceRepository is required');
    }
    this.deviceRepository = deviceRepository;
  }

  /**
   * @returns {Promise<void>}
   */
  async execute() {
    await this.deviceRepository.checkDeviceStatus();
  }
}

export default CheckDeviceStatusUseCase;
