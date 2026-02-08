import Email from '../../../domain/value_objects/Email';
import Password from '../../../domain/value_objects/Password';
import { CountryCode } from '../../../domain/value_objects/CountryCode';

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
   * @param {string} [userData.countryCode] - El código de país del usuario (opcional, ISO 3166-1 alpha-2).
   * @returns {Promise<import('../../../domain/entities/User').default>} El objeto User recién creado.
   */
  async execute({ firstName, lastName, email: emailString, password: passwordString, countryCode: countryCodeString, gender: genderValue = null }) {
    // Validar campos requeridos (country_code y gender son opcionales)
    if (!firstName || !lastName || !emailString || !passwordString) {
      throw new Error('All user data fields are required for registration');
    }

    // Crear Value Objects para validación
    const email = new Email(emailString);
    const password = new Password(passwordString);

    // CountryCode es opcional: solo lo creamos si se proporcionó
    const countryCode = countryCodeString ? new CountryCode(countryCodeString) : null;

    // Validate gender if provided
    const validGenders = ['MALE', 'FEMALE'];
    if (genderValue !== null && genderValue !== '' && !validGenders.includes(genderValue)) {
      throw new Error(`Invalid gender: ${genderValue}. Must be 'MALE', 'FEMALE', or null`);
    }
    const gender = (genderValue && validGenders.includes(genderValue)) ? genderValue : null;

    const newUser = await this.authRepository.register({
      firstName,
      lastName,
      email,
      password,
      countryCode, // Puede ser CountryCode VO o null
      gender,
    });

    return newUser;
  }
}

export default RegisterUseCase;
