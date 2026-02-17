export class PasswordValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PasswordValidationError';
  }
}

class Password {
  constructor(value, options = { validateStrength: true }) { // 1. Añadir opciones
    if (!value) {
      throw new PasswordValidationError('Password cannot be empty.');
    }
    this._value = value;

    if (options.validateStrength) { // 2. Validar fortaleza condicionalmente
      this.validateStrength();
    }
  }

  getValue() {
    return this._value;
  }

  validateStrength() { // 3. Renombrar validate a validateStrength
    if (this._value.length < 12) {
      throw new PasswordValidationError('Password must be at least 12 characters long.');
    }
    if (this._value.length > 128) {
      throw new PasswordValidationError('Password must not exceed 128 characters.');
    }
    if (!/[A-Z]/.test(this._value)) {
      throw new PasswordValidationError('Password must contain at least one uppercase letter.');
    }
    if (!/[a-z]/.test(this._value)) {
      throw new PasswordValidationError('Password must contain at least one lowercase letter.');
    }
    if (!/[0-9]/.test(this._value)) {
      throw new PasswordValidationError('Password must contain at least one number.');
    }
  }
}

export default Password;
