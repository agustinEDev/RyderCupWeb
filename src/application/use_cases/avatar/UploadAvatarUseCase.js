/**
 * Use Case: Upload Avatar
 *
 * Uploads a new photo and activates it as avatar. Mirrors the backend limit
 * (10MB raw upload; the server resizes/compresses it before storing) so the
 * user gets instant feedback without a round trip for obviously-too-big files.
 */
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

class UploadAvatarUseCase {
  #avatarRepository;

  constructor({ avatarRepository }) {
    if (!avatarRepository) {
      throw new Error('UploadAvatarUseCase requires avatarRepository');
    }
    this.#avatarRepository = avatarRepository;
  }

  async execute(file) {
    if (!file) {
      throw new Error('file is required');
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error('FILE_TOO_LARGE');
    }

    return this.#avatarRepository.upload(file);
  }
}

export default UploadAvatarUseCase;
