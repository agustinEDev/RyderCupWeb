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
    if (this._value.length < 8) {
      throw new PasswordValidationError('Password must be at least 8 characters long.');
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
    // Opcional: Requerir un caracter especial
    // if (!/[!@#$%^&*]/.test(this._value)) {
    //   throw new PasswordValidationError('Password must contain at least one special character.');
    // }
  }
}

export default Password;
