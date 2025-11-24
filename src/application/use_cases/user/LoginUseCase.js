import IAuthRepository from '../../../domain/repositories/IAuthRepository.js';
import { setUserData, setAuthToken } from '../../../utils/secureAuth'; // Para guardar user data y token
import Email from '../../../domain/value_objects/Email';
import Password from '../../../domain/value_objects/Password'; // 1. Importar Password VO

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
    const { user, token } = await this.authRepository.login(email, password);

    // Lógica post-login: guardar token y user data
    setAuthToken(token);
    setUserData(user.toPersistence()); // Guardamos el User como un objeto plano

    return user;
  }
}

export default LoginUseCase;
