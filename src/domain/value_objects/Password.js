import { validatePassword } from '../../utils/validation';

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

  validateStrength() {
    // La regla es UNA, la de `validatePassword`, que es la del backend: aquí
    // había una copia a mano que ya se había quedado sin el símbolo (hotfix 2.40.1)
    const result = validatePassword(this._value);
    if (!result.isValid) {
      throw new PasswordValidationError(result.message);
    }
  }
}

export default Password;
