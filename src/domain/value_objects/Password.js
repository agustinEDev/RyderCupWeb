import { PASSWORD_SPECIAL_CHARS, passwordLength } from '../../utils/validation';

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
    // La misma política que el backend y que `validatePassword` (hotfix 2.40.1)
    if (this._value.trim() !== this._value) {
      throw new PasswordValidationError('Password must not start or end with whitespace.');
    }
    if (passwordLength(this._value) < 12) {
      throw new PasswordValidationError('Password must be at least 12 characters long.');
    }
    if (passwordLength(this._value) > 128) {
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
    if (!PASSWORD_SPECIAL_CHARS.test(this._value)) {
      throw new PasswordValidationError('Password must contain at least one special character.');
    }
  }
}

export default Password;
