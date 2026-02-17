import Password from '../../../domain/value_objects/Password.js';

/**
 * Use Case para completar el reset de contraseña
 * Valida la nueva contraseña y llama al backend para cambiarla
 * El backend invalida automáticamente todas las sesiones activas del usuario
 *
 * Note: broadcastLogout() is the UI layer's responsibility (ResetPassword.jsx)
 */
class ResetPasswordUseCase {
  /**
   * @param {Object} dependencies - Objeto de dependencias
   * @param {IAuthRepository} dependencies.authRepository - Repositorio de autenticación
   */
  constructor({ authRepository }) {
    this.authRepository = authRepository;
  }

  /**
   * Ejecuta el caso de uso para resetear la contraseña
   * @param {string} token - Token de reset recibido por email
   * @param {string} newPassword - Nueva contraseña del usuario
   * @returns {Promise<{success: boolean, message: string}>} Resultado de la operación
   * @throws {Error} Si el token o password son inválidos
   */
  async execute(token, newPassword) {
    // Validación 1: Token requerido
    if (!token || !token.trim()) {
      throw new Error('Reset token is required');
    }

    // Validación 2: Password con requisitos OWASP ASVS V2.1 via domain Value Object
    const password = new Password(newPassword);

    // Llamada al backend para cambiar la contraseña
    const result = await this.authRepository.resetPassword(token, password.getValue());

    return {
      success: true,
      message: result.message || 'Password changed successfully. Please log in again.'
    };
  }
}

export default ResetPasswordUseCase;
