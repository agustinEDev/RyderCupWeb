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
   * @throws {Error} El de la petición, tal cual, si no hubo respuesta de la API
   *   (sin conexión, 429, 5xx): eso no dice nada del enlace (FE #785)
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
    // es un token válido (FE #775).
    // Sin catch: la red caída, el 429 o un 5xx no son un token inválido, y
    // convertirlos en valid:false mandaba a pedir otro enlace con uno bueno.
    // Suben tal cual y la página los distingue con utils/sinCobertura (FE #785)
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
  }
}

export default ValidateResetTokenUseCase;
