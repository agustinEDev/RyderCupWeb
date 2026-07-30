/**
 * Use Case: Activate Uploaded Avatar
 *
 * Reactivates one of the user's already-uploaded photos as the active avatar,
 * without re-uploading.
 */
class ActivateUploadedAvatarUseCase {
  #avatarRepository;

  constructor({ avatarRepository }) {
    if (!avatarRepository) {
      throw new Error('ActivateUploadedAvatarUseCase requires avatarRepository');
    }
    this.#avatarRepository = avatarRepository;
  }

  async execute(uploadId) {
    if (!uploadId || typeof uploadId !== 'string') {
      throw new Error('uploadId is required');
    }

    return this.#avatarRepository.activateUpload(uploadId);
  }
}

export default ActivateUploadedAvatarUseCase;
