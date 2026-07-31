import { describe, it, expect, vi, beforeEach } from 'vitest';
import ListAvatarPresetsUseCase from './ListAvatarPresetsUseCase';
import SetAvatarPresetUseCase from './SetAvatarPresetUseCase';
import UploadAvatarUseCase from './UploadAvatarUseCase';
import ListMyAvatarUploadsUseCase from './ListMyAvatarUploadsUseCase';
import ActivateUploadedAvatarUseCase from './ActivateUploadedAvatarUseCase';
import RemoveAvatarUseCase from './RemoveAvatarUseCase';

describe('Avatar Use Cases', () => {
  let avatarRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    avatarRepository = {
      listPresets: vi.fn(),
      setPreset: vi.fn(),
      upload: vi.fn(),
      listMyUploads: vi.fn(),
      activateUpload: vi.fn(),
      remove: vi.fn(),
    };
  });

  describe('ListAvatarPresetsUseCase', () => {
    it('delegates to the repository', async () => {
      const presets = [{ id: 1, image_url: '/api/v1/avatar-presets/1/image' }];
      avatarRepository.listPresets.mockResolvedValue(presets);
      const useCase = new ListAvatarPresetsUseCase({ avatarRepository });

      const result = await useCase.execute();

      expect(avatarRepository.listPresets).toHaveBeenCalled();
      expect(result).toBe(presets);
    });

    it('throws when avatarRepository is missing', () => {
      expect(() => new ListAvatarPresetsUseCase({})).toThrow();
    });
  });

  describe('SetAvatarPresetUseCase', () => {
    it('activates a preset by id', async () => {
      const updatedUser = { avatar_source: 'PRESET', avatar_preset_id: 3 };
      avatarRepository.setPreset.mockResolvedValue(updatedUser);
      const useCase = new SetAvatarPresetUseCase({ avatarRepository });

      const result = await useCase.execute(3);

      expect(avatarRepository.setPreset).toHaveBeenCalledWith(3);
      expect(result).toBe(updatedUser);
    });

    it('rejects a missing presetId', async () => {
      const useCase = new SetAvatarPresetUseCase({ avatarRepository });

      await expect(useCase.execute()).rejects.toThrow(/must be an integer between 1 and 10/);
      expect(avatarRepository.setPreset).not.toHaveBeenCalled();
    });

    it.each([
      ['zero', 0],
      ['negative', -1],
      ['fractional', 3.5],
      ['above range', 11],
      ['non-numeric', '3'],
    ])('rejects an invalid presetId (%s)', async (_label, invalidPresetId) => {
      const useCase = new SetAvatarPresetUseCase({ avatarRepository });

      await expect(useCase.execute(invalidPresetId)).rejects.toThrow(
        /must be an integer between 1 and 10/,
      );
      expect(avatarRepository.setPreset).not.toHaveBeenCalled();
    });
  });

  describe('UploadAvatarUseCase', () => {
    it('uploads a file within the size limit', async () => {
      const file = { size: 1024 };
      const uploadInfo = { id: 'upload-1', is_active: true };
      avatarRepository.upload.mockResolvedValue(uploadInfo);
      const useCase = new UploadAvatarUseCase({ avatarRepository });

      const result = await useCase.execute(file);

      expect(avatarRepository.upload).toHaveBeenCalledWith(file);
      expect(result).toBe(uploadInfo);
    });

    it('rejects files over 10MB without calling the repository', async () => {
      const oversizedFile = { size: 10 * 1024 * 1024 + 1 };
      const useCase = new UploadAvatarUseCase({ avatarRepository });

      await expect(useCase.execute(oversizedFile)).rejects.toThrow('FILE_TOO_LARGE');
      expect(avatarRepository.upload).not.toHaveBeenCalled();
    });

    it('rejects when no file is given', async () => {
      const useCase = new UploadAvatarUseCase({ avatarRepository });

      await expect(useCase.execute(null)).rejects.toThrow('file is required');
    });
  });

  describe('ListMyAvatarUploadsUseCase', () => {
    it('delegates to the repository', async () => {
      const uploads = [{ id: 'upload-1', is_active: true }];
      avatarRepository.listMyUploads.mockResolvedValue(uploads);
      const useCase = new ListMyAvatarUploadsUseCase({ avatarRepository });

      const result = await useCase.execute();

      expect(result).toBe(uploads);
    });
  });

  describe('ActivateUploadedAvatarUseCase', () => {
    it('activates a previous upload by id', async () => {
      const updatedUser = { avatar_source: 'UPLOAD' };
      avatarRepository.activateUpload.mockResolvedValue(updatedUser);
      const useCase = new ActivateUploadedAvatarUseCase({ avatarRepository });

      const result = await useCase.execute('upload-1');

      expect(avatarRepository.activateUpload).toHaveBeenCalledWith('upload-1');
      expect(result).toBe(updatedUser);
    });

    it('rejects a missing uploadId', async () => {
      const useCase = new ActivateUploadedAvatarUseCase({ avatarRepository });

      await expect(useCase.execute()).rejects.toThrow('uploadId is required');
    });
  });

  describe('RemoveAvatarUseCase', () => {
    it('clears the active avatar', async () => {
      const updatedUser = { avatar_source: 'NONE' };
      avatarRepository.remove.mockResolvedValue(updatedUser);
      const useCase = new RemoveAvatarUseCase({ avatarRepository });

      const result = await useCase.execute();

      expect(avatarRepository.remove).toHaveBeenCalled();
      expect(result).toBe(updatedUser);
    });
  });
});
