/**
 * Use Case: List Avatar Presets
 *
 * Lists the 10 fixed preset avatars (golf photos) available to choose from.
 */
class ListAvatarPresetsUseCase {
  #avatarRepository;

  constructor({ avatarRepository }) {
    if (!avatarRepository) {
      throw new Error('ListAvatarPresetsUseCase requires avatarRepository');
    }
    this.#avatarRepository = avatarRepository;
  }

  async execute() {
    return this.#avatarRepository.listPresets();
  }
}

export default ListAvatarPresetsUseCase;
