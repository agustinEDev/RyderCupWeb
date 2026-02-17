/**
 * Resend Verification Email Use Case
 * Requests a new email verification link for the user
 */
class ResendVerificationEmailUseCase {
  constructor({ authRepository }) {
    this.authRepository = authRepository;
  }

  async execute(email) {
    if (!email?.trim()) {
      throw new Error('Email is required');
    }
    return await this.authRepository.resendVerificationEmail(email);
  }
}

export default ResendVerificationEmailUseCase;
