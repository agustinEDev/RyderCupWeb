/**
 * Use Case: List My Avatar Uploads
 *
 * Lists the current user's uploaded photo history (up to 5), so they can
 * switch back to a previous photo without re-uploading.
 */
class ListMyAvatarUploadsUseCase {
  #avatarRepository;

  constructor({ avatarRepository }) {
    if (!avatarRepository) {
      throw new Error('ListMyAvatarUploadsUseCase requires avatarRepository');
    }
    this.#avatarRepository = avatarRepository;
  }

  async execute() {
    return this.#avatarRepository.listMyUploads();
  }
}

export default ListMyAvatarUploadsUseCase;
