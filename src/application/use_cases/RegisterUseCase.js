import IAuthRepository from '../../domain/repositories/IAuthRepository.js';

class RegisterUseCase {
  /**
   * @param {Object} dependencies - Objeto de dependencias.
   * @param {IAuthRepository} dependencies.authRepository - El repositorio de autenticación.
   */
  constructor({ authRepository }) {
    this.authRepository = authRepository;
  }

  /**
   * Ejecuta el caso de uso para registrar un nuevo usuario.
   * @param {Object} userData - Los datos del nuevo usuario.
   * @param {string} userData.firstName - El nombre del usuario.
   * @param {string} userData.lastName - El apellido del usuario.
   * @param {string} userData.email - El email del usuario.
   * @param {string} userData.password - La contraseña del usuario.
   * @returns {Promise<import('../../domain/entities/User').default>} El objeto User recién creado.
   */
  async execute({ firstName, lastName, email, password }) {
    if (!firstName || !lastName || !email || !password) {
      throw new Error('All user data fields are required for registration');
    }

    // Aquí podríamos añadir lógica de negocio adicional de validación,
    // como complejidad de contraseña o formato de email, antes de llamar al repositorio.

    const newUser = await this.authRepository.register({
      firstName,
      lastName,
      email,
      password,
    });

    return newUser;
  }
}

export default RegisterUseCase;
