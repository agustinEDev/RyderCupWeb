import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAvatar } from './useAvatar';

// `t` estable entre renders, como el `t` real de react-i18next (memoizado
// mientras no cambie el idioma) — un `t` nuevo en cada render re-dispararía
// el efecto de carga inicial (está en sus dependencias) en cada actualización
// de estado, algo que no ocurre con la librería real.
const stableT = (key) => key;
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: stableT,
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

  it('still reports success when the persisted action worked but the post-refresh fails', async () => {
    const refetchUser = vi.fn().mockRejectedValue(new Error('network blip'));
    setAvatarPresetUseCase.execute.mockResolvedValue({});
    const { result } = renderHook(() => useAvatar(mockUser, refetchUser));
    await waitFor(() => expect(result.current.isLoadingOptions).toBe(false));

    await act(async () => {
      await result.current.handleSelectPreset(4);
    });

    // El cambio ya se guardó en el servidor: un fallo al refrescar el estado
    // local no debe reportarse como si la acción principal hubiera fallado.
    expect(customToast.success).toHaveBeenCalledWith('toasts.avatarUpdated');
    expect(customToast.error).not.toHaveBeenCalled();
    expect(result.current.isSettingPreset).toBe(false);
  });

  it('does not let a stale in-flight loadUploads response overwrite a newer one', async () => {
    const refetchUser = vi.fn().mockResolvedValue();
    activateUploadedAvatarUseCase.execute.mockResolvedValue({});

    // La llamada a loadUploads() del efecto de montaje se queda pendiente
    // (simula una respuesta lenta que resolverá más tarde, fuera de orden).
    let resolveMountCall;
    listMyAvatarUploadsUseCase.execute.mockImplementationOnce(
      () => new Promise((resolve) => { resolveMountCall = resolve; }),
    );

    const { result } = renderHook(() => useAvatar(mockUser, refetchUser));
    await waitFor(() => expect(listMyAvatarUploadsUseCase.execute).toHaveBeenCalledTimes(1));

    // Mientras la del montaje sigue en el aire, un handler dispara una segunda
    // llamada que sí resuelve (con datos más recientes).
    listMyAvatarUploadsUseCase.execute.mockResolvedValueOnce([
      { id: 'newer-upload', is_active: true },
    ]);

    await act(async () => {
      await result.current.handleActivateUpload('some-upload-id');
    });

    expect(result.current.uploads).toEqual([{ id: 'newer-upload', is_active: true }]);

    // Ahora resuelve la del montaje (más antigua): no debe pisar el estado
    // ya actualizado por la llamada más reciente.
    await act(async () => {
      resolveMountCall([{ id: 'older-upload', is_active: true }]);
      await Promise.resolve();
    });

    expect(result.current.uploads).toEqual([{ id: 'newer-upload', is_active: true }]);
  });

  it('does not update state after unmounting mid-load', async () => {
    const refetchUser = vi.fn();
    let resolvePresets;
    listAvatarPresetsUseCase.execute.mockReturnValue(
      new Promise((resolve) => {
        resolvePresets = resolve;
      }),
    );

    const { unmount } = renderHook(() => useAvatar(mockUser, refetchUser));
    unmount();

    // Resolver la carga después de desmontar no debe lanzar ni intentar
    // actualizar estado de un componente ya desmontado.
    await act(async () => {
      resolvePresets([{ id: 1, image_url: '/api/v1/avatar-presets/1/image' }]);
      await Promise.resolve();
    });
  });
});
