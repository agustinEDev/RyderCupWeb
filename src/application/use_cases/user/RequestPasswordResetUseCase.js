import { validateEmail } from '../../../utils/validation.js';

/**
 * Use Case para solicitar reset de contraseña
 * Maneja la validación del email y delega al repositorio el envío del email de recuperación
 */
class RequestPasswordResetUseCase {
  /**
   * @param {Object} dependencies - Objeto de dependencias
   * @param {IAuthRepository} dependencies.authRepository - Repositorio de autenticación
   */
  constructor({ authRepository }) {
    this.authRepository = authRepository;
  }

  /**
   * Ejecuta el caso de uso para solicitar reset de contraseña
   * @param {string} email - Email del usuario que solicita el reset
   * @returns {Promise<{success: boolean, message: string}>} Resultado de la operación
   * @throws {Error} Si el email es inválido o hay un error de red
   */
  async execute(email) {
    // Validación del email usando la función utilitaria
    const validation = validateEmail(email);

    if (!validation.isValid) {
      throw new Error(validation.message);
    }

    // Llamada al repositorio para enviar el email de reset
    // El backend siempre retorna el mismo mensaje (anti-enumeración)
    const result = await this.authRepository.requestPasswordReset(email);

    return {
      success: true,
      message: result.message || 'Si el email existe, se ha enviado un enlace de recuperación'
    };
  }
}

export default RequestPasswordResetUseCase;
