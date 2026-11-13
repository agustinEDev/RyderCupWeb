class GoogleLoginUseCase {
  /**
   * @param {Object} dependencies
   * @param {import('../../../domain/repositories/IAuthRepository').default} dependencies.authRepository
   */
  constructor({ authRepository }) {
    if (!authRepository) {
      throw new Error('GoogleLoginUseCase requires authRepository');
    }
    this.authRepository = authRepository;
  }

  /**
   * Execute Google OAuth login/registration.
   * @param {string} authorizationCode - The authorization code from Google.
   * @param {string} codeVerifier - El verifier de PKCE guardado al empezar la ida (fase 3).
   * @returns {Promise<{user: import('../../../domain/entities/User').default, csrfToken: string, isNewUser: boolean}>}
   */
  async execute(authorizationCode, codeVerifier) {
    if (
      !authorizationCode ||
      typeof authorizationCode !== 'string' ||
      !authorizationCode.trim()
    ) {
      throw new Error('Authorization code is required');
    }

    // Sin el verifier el backend no canjea el código (PKCE): ni se pregunta
    if (!codeVerifier || typeof codeVerifier !== 'string') {
      throw new Error('Code verifier is required');
    }

    return await this.authRepository.googleLogin(
      authorizationCode.trim(),
      codeVerifier,
    );
  }
}

export default GoogleLoginUseCase;
