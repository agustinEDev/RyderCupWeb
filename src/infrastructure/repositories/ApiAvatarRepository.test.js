import { describe, it, expect, beforeEach, vi } from 'vitest';
import ApiAvatarRepository from './ApiAvatarRepository';
import * as apiModule from '../../services/api';

vi.mock('../../services/api', () => ({
  default: vi.fn(),
}));

describe('ApiAvatarRepository', () => {
  let repository;
  let apiRequestMock;

  beforeEach(() => {
    repository = new ApiAvatarRepository();
    apiRequestMock = apiModule.default;
    vi.clearAllMocks();
  });

  it('listPresets fetches the fixed preset catalog', async () => {
    const presets = [{ id: 1, image_url: '/api/v1/avatar-presets/1/image' }];
    apiRequestMock.mockResolvedValue(presets);

    const result = await repository.listPresets();

    expect(apiRequestMock).toHaveBeenCalledWith('/api/v1/avatar-presets');
    expect(result).toBe(presets);
  });

  it('setPreset posts the chosen preset id', async () => {
    const updatedUser = { avatar_source: 'PRESET', avatar_preset_id: 5 };
    apiRequestMock.mockResolvedValue(updatedUser);

    const result = await repository.setPreset(5);

    expect(apiRequestMock).toHaveBeenCalledWith('/api/v1/users/me/avatar/preset', {
      method: 'POST',
      body: JSON.stringify({ preset_id: 5 }),
    });
    expect(result).toBe(updatedUser);
  });

  it('upload sends the file as multipart FormData', async () => {
    const uploadInfo = { id: 'upload-1', is_active: true };
    apiRequestMock.mockResolvedValue(uploadInfo);
    const file = new File(['fake-bytes'], 'photo.jpg', { type: 'image/jpeg' });

    const result = await repository.upload(file);

    expect(apiRequestMock).toHaveBeenCalledWith(
      '/api/v1/users/me/avatar/upload',
      expect.objectContaining({ method: 'POST' }),
    );
    const [, options] = apiRequestMock.mock.calls[0];
    expect(options.body).toBeInstanceOf(FormData);
    expect(options.body.get('file')).toBe(file);
    expect(result).toBe(uploadInfo);
  });

  it('listMyUploads fetches the upload history', async () => {
    const uploads = [{ id: 'upload-1', is_active: true }];
    apiRequestMock.mockResolvedValue(uploads);

    const result = await repository.listMyUploads();

    expect(apiRequestMock).toHaveBeenCalledWith('/api/v1/users/me/avatar/uploads');
    expect(result).toBe(uploads);
  });

  it('activateUpload posts to the activate endpoint for the given id', async () => {
    const updatedUser = { avatar_source: 'UPLOAD' };
    apiRequestMock.mockResolvedValue(updatedUser);

    const result = await repository.activateUpload('upload-1');

    expect(apiRequestMock).toHaveBeenCalledWith(
      '/api/v1/users/me/avatar/uploads/upload-1/activate',
      { method: 'POST' },
    );
    expect(result).toBe(updatedUser);
  });

  it('remove deletes the active avatar', async () => {
    const updatedUser = { avatar_source: 'NONE' };
    apiRequestMock.mockResolvedValue(updatedUser);

    const result = await repository.remove();

    expect(apiRequestMock).toHaveBeenCalledWith('/api/v1/users/me/avatar', { method: 'DELETE' });
    expect(result).toBe(updatedUser);
  });
});
