import Email from '../../../domain/value_objects/Email';
import Password from '../../../domain/value_objects/Password';

class LoginUseCase {
  /**
   * @param {Object} dependencies - Objeto de dependencias.
   * @param {IAuthRepository} dependencies.authRepository - El repositorio de autenticación.
   */
  constructor({ authRepository }) {
    this.authRepository = authRepository;
  }

  /**
   * Ejecuta el caso de uso para el login del usuario.
   * @param {string} emailString - El email del usuario como cadena de texto.
   * @param {string} passwordString - La contraseña del usuario como cadena de texto. // Renombrado
   * @returns {Promise<import('../../../domain/entities/User').default>} El objeto User autenticado.
   */
  async execute(emailString, passwordString) { // Renombrado 'password' a 'passwordString'
    const email = new Email(emailString);
    const password = new Password(passwordString, { validateStrength: false }); // Desactivar validación de fortaleza para el login

    // Llamada al repositorio para realizar la autenticación
    // Pasamos la instancia del Email y Password Value Object
    const { user } = await this.authRepository.login(email, password);

    // El backend establece automáticamente la cookie httpOnly
    // No necesitamos guardar nada en el frontend

    return user;
  }
}

export default LoginUseCase;
