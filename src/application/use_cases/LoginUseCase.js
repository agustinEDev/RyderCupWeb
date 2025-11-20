import IAuthRepository from '../../domain/repositories/IAuthRepository.js';
import { setUserData, setAuthToken } from '../../utils/secureAuth'; // Para guardar user data y token

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
   * @param {string} email - El email del usuario.
   * @param {string} password - La contraseña del usuario.
   * @returns {Promise<import('../../domain/entities/User').default>} El objeto User autenticado.
   */
  async execute(email, password) {
    if (!email || !password) {
      throw new Error('Email and password are required for login');
    }

    // Llamada al repositorio para realizar la autenticación
    const { user, token } = await this.authRepository.login(email, password);

    // Lógica post-login: guardar token y user data
    setAuthToken(token);
    setUserData(user.toPersistence()); // Guardamos el User como un objeto plano

    return user;
  }
}

export default LoginUseCase;
