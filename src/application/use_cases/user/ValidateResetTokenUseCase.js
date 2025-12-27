/**
 * Use Case para validar un token de reset de contraseña
 * Pre-valida el token antes de mostrar el formulario de nueva contraseña (mejor UX)
 */
class ValidateResetTokenUseCase {
  /**
   * @param {Object} dependencies - Objeto de dependencias
   * @param {IAuthRepository} dependencies.authRepository - Repositorio de autenticación
   */
  constructor({ authRepository }) {
    this.authRepository = authRepository;
  }

  /**
   * Ejecuta el caso de uso para validar un token de reset
   * @param {string} token - Token de reset recibido por email
   * @returns {Promise<{valid: boolean, message: string}>} Resultado de la validación
   * @throws {Error} Si el token no fue proporcionado
   */
  async execute(token) {
    // Validación básica: el token debe existir
    if (!token || !token.trim()) {
      throw new Error('Reset token is required');
    }

    // Llamada al backend para validar el token
    // GET /api/v1/auth/validate-reset-token/:token
    // Respuesta: { valid: true, message: "..." } o error 400
    try {
      const result = await this.authRepository.validateResetToken(token);

      return {
        valid: true,
        message: result.message || 'Token válido. Puedes proceder a cambiar tu contraseña.'
      };
    } catch (error) {
      // Si el backend retorna 400, el token es inválido o expirado
      return {
        valid: false,
        message: error.message || 'El token es inválido o ha expirado'
      };
    }
  }
}

export default ValidateResetTokenUseCase;
