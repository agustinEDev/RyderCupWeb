class UnlinkGoogleAccountUseCase {
  /**
   * @param {Object} dependencies
   * @param {import('../../../domain/repositories/IAuthRepository').default} dependencies.authRepository
   */
  constructor({ authRepository }) {
    if (!authRepository) {
      throw new Error('UnlinkGoogleAccountUseCase requires authRepository');
    }
    this.authRepository = authRepository;
  }

  /**
   * Unlink Google account from the current authenticated user.
   * @returns {Promise<{message: string, provider: string}>}
   */
  async execute() {
    return await this.authRepository.unlinkGoogleAccount();
  }
}

export default UnlinkGoogleAccountUseCase;
