import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import customToast from '../utils/toast';
import {
  listAvatarPresetsUseCase,
  setAvatarPresetUseCase,
  uploadAvatarUseCase,
  listMyAvatarUploadsUseCase,
  activateUploadedAvatarUseCase,
  removeAvatarUseCase,
} from '../composition';

/**
 * useAvatar - Avatar picker state and handlers for the Edit Profile page.
 *
 * Takes `user`/`refetchUser` from the caller (useEditProfile) instead of
 * calling useAuth() itself, to avoid a second parallel /current-user fetch.
 */
export const useAvatar = (user, refetchUser) => {
  const { t } = useTranslation('profile');

  const [presets, setPresets] = useState([]);
  const [uploads, setUploads] = useState([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [isSettingPreset, setIsSettingPreset] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  // `loadUploads` se llama tanto desde el efecto de montaje como directamente
  // desde cada handler de refresco: dos llamadas pueden quedar en vuelo a la
  // vez y resolver en desorden. Un contador monotónico descarta cualquier
  // respuesta que ya no sea la de la llamada más reciente.
  const uploadsRequestIdRef = useRef(0);
  // Además del orden, hay que evitar que una respuesta de OTRO usuario (p.ej.
  // si esta misma instancia del hook sigue viva tras un cambio de sesión) se
  // cuele en el estado: se compara también contra el usuario activo en el
  // momento de aplicar la respuesta, no solo en el momento de pedirla.
  const currentUserIdRef = useRef(user?.id ?? null);

  useEffect(() => {
    currentUserIdRef.current = user?.id ?? null;
    // Al cambiar de usuario, no dejar restos del historial del usuario
    // anterior visibles ni un instante mientras se carga el nuevo. Se difiere
    // a un microtask (en vez de llamar a setUploads directamente aquí) para
    // no disparar un re-render síncrono en cascada dentro del propio efecto.
    Promise.resolve().then(() => setUploads([]));
  }, [user]);

  const loadUploads = useCallback(async () => {
    const requestId = ++uploadsRequestIdRef.current;
    const requestedForUserId = currentUserIdRef.current;
    try {
      const myUploads = await listMyAvatarUploadsUseCase.execute();
      const isStillCurrent =
        requestId === uploadsRequestIdRef.current &&
        requestedForUserId === currentUserIdRef.current;
      if (isStillCurrent) {
        setUploads(myUploads || []);
      }
    } catch (error) {
      console.error('Error loading avatar uploads:', error);
    }
  }, []);

  useEffect(() => {
    // Evita actualizar estado si el efecto quedó obsoleto (el componente se
    // desmontó, o `user`/dependencias cambiaron y ya hay una ejecución más
    // reciente en curso) mientras la carga todavía estaba en el aire.
    let ignore = false;

    const loadOptions = async () => {
      if (!user) {
        if (!ignore) setIsLoadingOptions(false);
        return;
      }

      try {
        const [presetList] = await Promise.all([
          listAvatarPresetsUseCase.execute(),
          loadUploads(),
        ]);
        if (!ignore) setPresets(presetList || []);
      } catch (error) {
        console.error('Error loading avatar options:', error);
        if (!ignore) customToast.error(t('toasts.failedToLoadAvatarOptions'));
      } finally {
        if (!ignore) setIsLoadingOptions(false);
      }
    };

    loadOptions();

    return () => {
      ignore = true;
    };
  }, [user, loadUploads, t]);

  /**
   * Ejecuta la acción principal (persistir el cambio de avatar) y, solo si
   * tiene éxito, refresca el estado local (refetchUser + opcionalmente
   * loadUploads). Un fallo en el refresco posterior NO se reporta como fallo
   * de la acción principal — el cambio ya se guardó en el servidor.
   */
  const runAvatarAction = async ({
    setBusy,
    action,
    mapError,
    refreshUploads,
    successMessage,
  }) => {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      console.error('Error updating avatar:', error);
      customToast.error(
        mapError ? mapError(error) : error.message || t('toasts.failedToUpdateAvatar'),
      );
      setBusy(false);
      return;
    }

    customToast.success(successMessage || t('toasts.avatarUpdated'));

    try {
      await refetchUser();
      if (refreshUploads) await loadUploads();
    } catch (error) {
      console.error('Error refreshing after avatar update:', error);
    } finally {
      setBusy(false);
    }
  };

  const handleSelectPreset = (presetId) =>
    runAvatarAction({
      setBusy: setIsSettingPreset,
      action: () => setAvatarPresetUseCase.execute(presetId),
      refreshUploads: true,
    });

  const handleUpload = (file) => {
    if (!file) return Promise.resolve();

    return runAvatarAction({
      setBusy: setIsUploading,
      action: () => uploadAvatarUseCase.execute(file),
      refreshUploads: true,
      mapError: (error) => {
        if (error.message === 'FILE_TOO_LARGE') return t('toasts.avatarFileTooLarge');
        if (error.status === 400) return t('toasts.avatarInvalidImage');
        return error.message || t('toasts.failedToUpdateAvatar');
      },
    });
  };

  const handleActivateUpload = (uploadId) =>
    runAvatarAction({
      setBusy: setIsSettingPreset,
      action: () => activateUploadedAvatarUseCase.execute(uploadId),
      refreshUploads: true,
    });

  const handleRemove = () =>
    runAvatarAction({
      setBusy: setIsRemoving,
      action: () => removeAvatarUseCase.execute(),
      mapError: (error) => error.message || t('toasts.failedToRemoveAvatar'),
      successMessage: t('toasts.avatarRemoved'),
    });

  return {
    presets,
    uploads,
    isLoadingOptions,
    isSettingPreset,
    isUploading,
    isRemoving,
    handleSelectPreset,
    handleUpload,
    handleActivateUpload,
    handleRemove,
  };
};

export default useAvatar;
