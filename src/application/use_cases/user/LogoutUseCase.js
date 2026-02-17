/**
 * Logout Use Case
 * Calls the backend to invalidate the user's session
 */
class LogoutUseCase {
  constructor({ authRepository }) {
    this.authRepository = authRepository;
  }

  async execute() {
    await this.authRepository.logout();
    return { success: true };
  }
}

export default LogoutUseCase;
