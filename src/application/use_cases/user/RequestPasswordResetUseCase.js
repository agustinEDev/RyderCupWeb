import Email from '../../../domain/value_objects/Email.js';

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
    const trimmedEmail = email && email.trim();

    if (!trimmedEmail) {
      throw new Error('Email is required');
    }

    if (trimmedEmail.length > 254) {
      throw new Error('Email must not exceed 254 characters');
    }

    // Validates email format using domain Value Object
    const emailVO = new Email(trimmedEmail);

    // Llamada al repositorio para enviar el email de reset
    // El backend siempre retorna el mismo mensaje (anti-enumeración)
    const result = await this.authRepository.requestPasswordReset(emailVO.getValue());

    return {
      success: true,
      message: result?.message || 'If the email exists, a recovery link has been sent'
    };
  }
}

export default RequestPasswordResetUseCase;
