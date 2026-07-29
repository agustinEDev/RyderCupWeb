/**
 * Use Case: Set Avatar Preset
 *
 * Activates one of the 10 preset avatars for the current user.
 */
class SetAvatarPresetUseCase {
  #avatarRepository;

  constructor({ avatarRepository }) {
    if (!avatarRepository) {
      throw new Error('SetAvatarPresetUseCase requires avatarRepository');
    }
    this.#avatarRepository = avatarRepository;
  }

  async execute(presetId) {
    if (!presetId || typeof presetId !== 'number') {
      throw new Error('presetId is required');
    }

    return this.#avatarRepository.setPreset(presetId);
  }
}

export default SetAvatarPresetUseCase;
