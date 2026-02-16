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
   * @returns {Promise<{user: import('../../../domain/entities/User').default, csrfToken: string, isNewUser: boolean}>}
   */
  async execute(authorizationCode) {
    if (!authorizationCode || typeof authorizationCode !== 'string' || !authorizationCode.trim()) {
      throw new Error('Authorization code is required');
    }

    return await this.authRepository.googleLogin(authorizationCode.trim());
  }
}

export default GoogleLoginUseCase;
