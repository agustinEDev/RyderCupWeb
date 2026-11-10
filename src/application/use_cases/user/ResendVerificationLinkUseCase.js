/**
 * Pide otro enlace de verificación con el token del caducado, sin sesión (fase 3).
 * La respuesta del backend no dice si se envió: cualquier token responde igual.
 */
class ResendVerificationLinkUseCase {
  constructor({ authRepository }) {
    this.authRepository = authRepository;
  }

  async execute(token) {
    if (typeof token !== 'string' || !token.trim()) {
      throw new Error('Verification token is required');
    }
    return await this.authRepository.resendVerificationLink(token);
  }
}

export default ResendVerificationLinkUseCase;
