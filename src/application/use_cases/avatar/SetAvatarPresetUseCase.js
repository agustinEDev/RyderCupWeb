/**
 * Use Case: Set Avatar Preset
 *
 * Activates one of the 10 preset avatars for the current user.
 */
const AVATAR_PRESET_COUNT = 10;

class SetAvatarPresetUseCase {
  #avatarRepository;

  constructor({ avatarRepository }) {
    if (!avatarRepository) {
      throw new Error('SetAvatarPresetUseCase requires avatarRepository');
    }
    this.#avatarRepository = avatarRepository;
  }

  async execute(presetId) {
    if (
      typeof presetId !== 'number' ||
      !Number.isInteger(presetId) ||
      presetId < 1 ||
      presetId > AVATAR_PRESET_COUNT
    ) {
      throw new Error(`presetId must be an integer between 1 and ${AVATAR_PRESET_COUNT}`);
    }

    return this.#avatarRepository.setPreset(presetId);
  }
}

export default SetAvatarPresetUseCase;
