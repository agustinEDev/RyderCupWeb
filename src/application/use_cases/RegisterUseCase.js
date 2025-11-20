import IAuthRepository from '../../domain/repositories/IAuthRepository.js';
import Email from '../../domain/value_objects/Email';
import Password from '../../domain/value_objects/Password'; // 1. Importar Password VO

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
   * @param {string} userData.email - El email del usuario (cadena de texto).
   * @param {string} userData.password - La contraseña del usuario (cadena de texto).
   * @returns {Promise<import('../../domain/entities/User').default>} El objeto User recién creado.
   */
  async execute({ firstName, lastName, email: emailString, password: passwordString }) { // Renombramos 'password' a 'passwordString'
    if (!firstName || !lastName || !emailString || !passwordString) {
      throw new Error('All user data fields are required for registration');
    }

    const email = new Email(emailString);
    const password = new Password(passwordString); // 2. Crear una instancia del Password Value Object para validación

    const newUser = await this.authRepository.register({
      firstName,
      lastName,
      email,
      password, // Pasamos el Password Value Object
    });

    return newUser;
  }
}

export default RegisterUseCase;
