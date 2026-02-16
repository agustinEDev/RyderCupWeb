class LinkGoogleAccountUseCase {
  /**
   * @param {Object} dependencies
   * @param {import('../../../domain/repositories/IAuthRepository').default} dependencies.authRepository
   */
  constructor({ authRepository }) {
    if (!authRepository) {
      throw new Error('LinkGoogleAccountUseCase requires authRepository');
    }
    this.authRepository = authRepository;
  }

  /**
   * Link a Google account to the current authenticated user.
   * @param {string} authorizationCode - The authorization code from Google.
   * @returns {Promise<{message: string, provider: string, providerEmail: string}>}
   */
  async execute(authorizationCode) {
    if (!authorizationCode || typeof authorizationCode !== 'string' || !authorizationCode.trim()) {
      throw new Error('Authorization code is required');
    }

    return await this.authRepository.linkGoogleAccount(authorizationCode.trim());
  }
}

export default LinkGoogleAccountUseCase;
