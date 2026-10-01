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
    // Respuesta: 200 con { valid: true|false, message }. Un token inválido o
    // caducado llega como valid:false, no como error: solo un true explícito
    // es un token válido (FE #775). Un error de red sigue yendo al catch
    try {
      const result = await this.authRepository.validateResetToken(token);

      if (result?.valid !== true) {
        return {
          valid: false,
          message: result?.message || 'The token is invalid or has expired'
        };
      }

      return {
        valid: true,
        message: result.message || 'Token is valid. You can proceed to change your password.'
      };
    } catch (error) {
      // Errores de red o HTTP (429 del límite de peticiones, 5xx): un token
      // inválido no llega aquí, llega como valid:false
      return {
        valid: false,
        message: error.message || 'The token is invalid or has expired'
      };
    }
  }
}

export default ValidateResetTokenUseCase;
