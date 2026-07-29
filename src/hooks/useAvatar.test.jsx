import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAvatar } from './useAvatar';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
  }),
}));

vi.mock('../composition', () => ({
  listAvatarPresetsUseCase: { execute: vi.fn() },
  setAvatarPresetUseCase: { execute: vi.fn() },
  uploadAvatarUseCase: { execute: vi.fn() },
  listMyAvatarUploadsUseCase: { execute: vi.fn() },
  activateUploadedAvatarUseCase: { execute: vi.fn() },
  removeAvatarUseCase: { execute: vi.fn() },
}));

vi.mock('../utils/toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import {
  listAvatarPresetsUseCase,
  setAvatarPresetUseCase,
  uploadAvatarUseCase,
  listMyAvatarUploadsUseCase,
  activateUploadedAvatarUseCase,
  removeAvatarUseCase,
} from '../composition';
import customToast from '../utils/toast';

const mockUser = { id: 'user-1', avatar_source: 'NONE', avatar_preset_id: null };

describe('useAvatar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listAvatarPresetsUseCase.execute.mockResolvedValue([
      { id: 1, image_url: '/api/v1/avatar-presets/1/image' },
    ]);
    listMyAvatarUploadsUseCase.execute.mockResolvedValue([]);
  });

  it('loads presets and upload history on mount when there is a user', async () => {
    const refetchUser = vi.fn();
    const { result } = renderHook(() => useAvatar(mockUser, refetchUser));

    await waitFor(() => expect(result.current.isLoadingOptions).toBe(false));

    expect(listAvatarPresetsUseCase.execute).toHaveBeenCalled();
    expect(listMyAvatarUploadsUseCase.execute).toHaveBeenCalled();
    expect(result.current.presets).toEqual([
      { id: 1, image_url: '/api/v1/avatar-presets/1/image' },
    ]);
  });

  it('does not fetch options when there is no user yet', async () => {
    const refetchUser = vi.fn();
    const { result } = renderHook(() => useAvatar(null, refetchUser));

    await waitFor(() => expect(result.current.isLoadingOptions).toBe(false));

    expect(listAvatarPresetsUseCase.execute).not.toHaveBeenCalled();
  });

  it('handleSelectPreset activates a preset and refetches the user', async () => {
    const refetchUser = vi.fn();
    setAvatarPresetUseCase.execute.mockResolvedValue({});
    const { result } = renderHook(() => useAvatar(mockUser, refetchUser));
    await waitFor(() => expect(result.current.isLoadingOptions).toBe(false));

    await act(async () => {
      await result.current.handleSelectPreset(4);
    });

    expect(setAvatarPresetUseCase.execute).toHaveBeenCalledWith(4);
    expect(refetchUser).toHaveBeenCalled();
    expect(customToast.success).toHaveBeenCalled();
  });

  it('handleUpload shows a specific toast for oversized files', async () => {
    const refetchUser = vi.fn();
    const error = new Error('FILE_TOO_LARGE');
    uploadAvatarUseCase.execute.mockRejectedValue(error);
    const { result } = renderHook(() => useAvatar(mockUser, refetchUser));
    await waitFor(() => expect(result.current.isLoadingOptions).toBe(false));

    await act(async () => {
      await result.current.handleUpload({ size: 999 });
    });

    expect(customToast.error).toHaveBeenCalledWith('toasts.avatarFileTooLarge');
    expect(refetchUser).not.toHaveBeenCalled();
  });

  it('handleActivateUpload switches to a previous upload', async () => {
    const refetchUser = vi.fn();
    activateUploadedAvatarUseCase.execute.mockResolvedValue({});
    const { result } = renderHook(() => useAvatar(mockUser, refetchUser));
    await waitFor(() => expect(result.current.isLoadingOptions).toBe(false));

    await act(async () => {
      await result.current.handleActivateUpload('upload-1');
    });

    expect(activateUploadedAvatarUseCase.execute).toHaveBeenCalledWith('upload-1');
    expect(refetchUser).toHaveBeenCalled();
  });

  it('handleRemove clears the avatar', async () => {
    const refetchUser = vi.fn();
    removeAvatarUseCase.execute.mockResolvedValue({});
    const { result } = renderHook(() => useAvatar(mockUser, refetchUser));
    await waitFor(() => expect(result.current.isLoadingOptions).toBe(false));

    await act(async () => {
      await result.current.handleRemove();
    });

    expect(removeAvatarUseCase.execute).toHaveBeenCalled();
    expect(refetchUser).toHaveBeenCalled();
    expect(customToast.success).toHaveBeenCalledWith('toasts.avatarRemoved');
  });
});
