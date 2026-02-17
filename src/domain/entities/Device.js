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
    is_current_device = false,
  }) {
    // Validaciones de presencia
    if (!id || !device_name || !ip_address) {
      throw new Error('Device entity requires id, device_name, and ip_address');
    }

    // Validaciones de tipo - strings requeridos
    if (typeof id !== 'string') {
      throw new Error('Device id must be a string');
    }
    if (typeof device_name !== 'string') {
      throw new Error('Device device_name must be a string');
    }
    if (typeof ip_address !== 'string') {
      throw new Error('Device ip_address must be a string');
    }

    // Validaciones de tipo - timestamps opcionales (string, null, o undefined)
    if (last_used_at !== null && last_used_at !== undefined && typeof last_used_at !== 'string') {
      throw new Error('Device last_used_at must be a string, null, or undefined');
    }
    if (created_at !== null && created_at !== undefined && typeof created_at !== 'string') {
      throw new Error('Device created_at must be a string, null, or undefined');
    }

    // Validación de tipo - boolean
    if (typeof is_active !== 'boolean') {
      throw new Error('Device is_active must be a boolean');
    }
    if (typeof is_current_device !== 'boolean') {
      throw new Error('Device is_current_device must be a boolean');
    }

    this.id = id;
    this.deviceName = device_name;
    this.ipAddress = ip_address;
    this.lastUsedAt = last_used_at;
    this.createdAt = created_at;
    this.isActive = is_active;
    this.isCurrentDevice = is_current_device;
  }

  /**
   * Checks if device is currently active
   * @returns {boolean}
   */
  isDeviceActive() {
    return this.isActive === true;
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
      is_current_device: this.isCurrentDevice,
    };
  }
}

export default Device;
