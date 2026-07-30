/**
 * Use Case: Remove Avatar
 *
 * Clears the current user's active avatar (falls back to default placeholder).
 * Does not delete the upload history.
 */
class RemoveAvatarUseCase {
  #avatarRepository;

  constructor({ avatarRepository }) {
    if (!avatarRepository) {
      throw new Error('RemoveAvatarUseCase requires avatarRepository');
    }
    this.#avatarRepository = avatarRepository;
  }

  async execute() {
    return this.#avatarRepository.remove();
  }
}

export default RemoveAvatarUseCase;
