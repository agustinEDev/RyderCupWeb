/**
 * Device Entity
 * Represents a user's device/session
 * v1.13.0: Device Fingerprinting feature
 */
class Device {
  constructor({
    id,
    device_name,
    ip_address,
    last_used_at,
    created_at,
    is_active = true,
  }) {
    // Validaciones básicas de la entidad
    if (!id || !device_name || !ip_address) {
      throw new Error('Device entity requires id, device_name, and ip_address');
    }

    this.id = id;
    this.deviceName = device_name;
    this.ipAddress = ip_address;
    this.lastUsedAt = last_used_at;
    this.createdAt = created_at;
    this.isActive = is_active;
  }

  /**
   * Checks if device is currently active
   * @returns {boolean}
   */
  isDeviceActive() {
    return this.isActive === true;
  }

  /**
   * Returns a formatted last used date
   * @deprecated since v1.13.0, will be removed in v2.0.0. Use formatDateTime from utils/dateFormatters instead
   * @returns {string}
   */
  getFormattedLastUsed() {
    if (!this.lastUsedAt) return 'Never';
    return new Date(this.lastUsedAt).toLocaleString();
  }

  /**
   * Returns a formatted creation date
   * @deprecated since v1.13.0, will be removed in v2.0.0. Use formatDateTime from utils/dateFormatters instead
   * @returns {string}
   */
  getFormattedCreatedAt() {
    if (!this.createdAt) return 'Unknown';
    return new Date(this.createdAt).toLocaleString();
  }

  /**
   * Converts entity to API format
   * @returns {Object}
   */
  toPersistence() {
    return {
      id: this.id,
      device_name: this.deviceName,
      ip_address: this.ipAddress,
      last_used_at: this.lastUsedAt,
      created_at: this.createdAt,
      is_active: this.isActive,
    };
  }
}

export default Device;
