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

const mockUser = {
  id: 'user-1',
  avatar_source: 'NONE',
  avatar_preset_id: null,
};

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

  it('handleUpload does not show the raw text of a 503 without its code (Q-FE-06)', async () => {
    // Given the server is busy with other images and answers 503 with its text,
    // turned into an Error by apiRequest (message = detail)
    const refetchUser = vi.fn();
    const texto =
      'Ahora mismo se están procesando otras imágenes. Inténtalo de nuevo en unos segundos.';
    const error = Object.assign(new Error(texto), {
      status: 503,
      statusCode: 503,
    });
    uploadAvatarUseCase.execute.mockRejectedValue(error);
    const { result } = renderHook(() => useAvatar(mockUser, refetchUser));
    await waitFor(() => expect(result.current.isLoadingOptions).toBe(false));

    // When the upload fails
    await act(async () => {
      await result.current.handleUpload({ size: 999 });
    });

    // Then the user reads the app's own text: a 5xx is not shown raw
    // (re-audit Q-FE-06); with IMAGES_BUSY it is translated (next test)
    expect(customToast.error).toHaveBeenCalledWith(
      'toasts.failedToUpdateAvatar',
    );
    expect(refetchUser).not.toHaveBeenCalled();
  });

  it('handleUpload translates the busy images 503 by its code (IMAGES_BUSY)', async () => {
    // Given the server answers 503 with its code
    const refetchUser = vi.fn();
    const error = Object.assign(
      new Error(
        'Ahora mismo se están procesando otras imágenes. Inténtalo de nuevo en unos segundos.',
      ),
      { status: 503, errorCode: 'IMAGES_BUSY' },
    );
    uploadAvatarUseCase.execute.mockRejectedValue(error);
    const { result } = renderHook(() => useAvatar(mockUser, refetchUser));
    await waitFor(() => expect(result.current.isLoadingOptions).toBe(false));

    // When the upload fails
    await act(async () => {
      await result.current.handleUpload({ size: 999 });
    });

    // Then the text is the app's, in the user's language
    expect(customToast.error).toHaveBeenCalledWith('toasts.avatarImagesBusy');
  });

  it('handleActivateUpload switches to a previous upload', async () => {
    const refetchUser = vi.fn();
    activateUploadedAvatarUseCase.execute.mockResolvedValue({});
    const { result } = renderHook(() => useAvatar(mockUser, refetchUser));
    await waitFor(() => expect(result.current.isLoadingOptions).toBe(false));

    await act(async () => {
      await result.current.handleActivateUpload('upload-1');
    });

    expect(activateUploadedAvatarUseCase.execute).toHaveBeenCalledWith(
      'upload-1',
    );
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
      () =>
        new Promise((resolve) => {
          resolveMountCall = resolve;
        }),
    );

    const { result } = renderHook(() => useAvatar(mockUser, refetchUser));
    await waitFor(() =>
      expect(listMyAvatarUploadsUseCase.execute).toHaveBeenCalledTimes(1),
    );

    // Mientras la del montaje sigue en el aire, un handler dispara una segunda
    // llamada que sí resuelve (con datos más recientes).
    listMyAvatarUploadsUseCase.execute.mockResolvedValueOnce([
      { id: 'newer-upload', is_active: true },
    ]);

    await act(async () => {
      await result.current.handleActivateUpload('some-upload-id');
    });

    expect(result.current.uploads).toEqual([
      { id: 'newer-upload', is_active: true },
    ]);

    // Ahora resuelve la del montaje (más antigua): no debe pisar el estado
    // ya actualizado por la llamada más reciente.
    await act(async () => {
      resolveMountCall([{ id: 'older-upload', is_active: true }]);
      await Promise.resolve();
    });

    expect(result.current.uploads).toEqual([
      { id: 'newer-upload', is_active: true },
    ]);
  });

  it('discards a stale response from a previous user after switching accounts', async () => {
    const userA = {
      id: 'user-a',
      avatar_source: 'NONE',
      avatar_preset_id: null,
    };
    const userB = {
      id: 'user-b',
      avatar_source: 'NONE',
      avatar_preset_id: null,
    };
    const refetchUser = vi.fn().mockResolvedValue();
    activateUploadedAvatarUseCase.execute.mockResolvedValue({});

    const { result, rerender } = renderHook(
      ({ user }) => useAvatar(user, refetchUser),
      {
        initialProps: { user: userA },
      },
    );
    await waitFor(() => expect(result.current.isLoadingOptions).toBe(false));

    // Una llamada para el usuario A (p.ej. el refresco tras reactivar una foto
    // del historial) se queda pendiente.
    let resolveStaleCall;
    listMyAvatarUploadsUseCase.execute.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveStaleCall = resolve;
        }),
    );
    let staleAction;
    act(() => {
      staleAction = result.current.handleActivateUpload('some-upload-id');
    });
    await waitFor(() => expect(resolveStaleCall).toBeDefined());

    // Antes de que resuelva, la sesión cambia a un usuario distinto.
    listMyAvatarUploadsUseCase.execute.mockResolvedValue([
      { id: 'user-b-photo', is_active: true },
    ]);
    rerender({ user: userB });
    await waitFor(() =>
      expect(result.current.uploads).toEqual([
        { id: 'user-b-photo', is_active: true },
      ]),
    );

    // Ahora resuelve la llamada obsoleta del usuario A: no debe pisar el
    // estado ya cargado para el usuario B.
    await act(async () => {
      resolveStaleCall([{ id: 'user-a-photo', is_active: true }]);
      await staleAction;
    });

    expect(result.current.uploads).toEqual([
      { id: 'user-b-photo', is_active: true },
    ]);
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
