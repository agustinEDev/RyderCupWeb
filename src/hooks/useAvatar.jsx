import { useState, useEffect, useCallback } from 'react';
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

  const loadUploads = useCallback(async () => {
    try {
      const myUploads = await listMyAvatarUploadsUseCase.execute();
      setUploads(myUploads || []);
    } catch (error) {
      console.error('Error loading avatar uploads:', error);
    }
  }, []);

  useEffect(() => {
    const loadOptions = async () => {
      if (!user) {
        setIsLoadingOptions(false);
        return;
      }

      try {
        const [presetList] = await Promise.all([
          listAvatarPresetsUseCase.execute(),
          loadUploads(),
        ]);
        setPresets(presetList || []);
      } catch (error) {
        console.error('Error loading avatar options:', error);
        customToast.error(t('toasts.failedToLoadAvatarOptions'));
      } finally {
        setIsLoadingOptions(false);
      }
    };

    loadOptions();
  }, [user, loadUploads, t]);

  const handleSelectPreset = async (presetId) => {
    setIsSettingPreset(true);
    try {
      await setAvatarPresetUseCase.execute(presetId);
      await refetchUser();
      await loadUploads();
      customToast.success(t('toasts.avatarUpdated'));
    } catch (error) {
      console.error('Error setting avatar preset:', error);
      customToast.error(error.message || t('toasts.failedToUpdateAvatar'));
    } finally {
      setIsSettingPreset(false);
    }
  };

  const handleUpload = async (file) => {
    if (!file) return;

    setIsUploading(true);
    try {
      await uploadAvatarUseCase.execute(file);
      await refetchUser();
      await loadUploads();
      customToast.success(t('toasts.avatarUpdated'));
    } catch (error) {
      console.error('Error uploading avatar:', error);
      if (error.message === 'FILE_TOO_LARGE') {
        customToast.error(t('toasts.avatarFileTooLarge'));
      } else if (error.status === 400) {
        customToast.error(t('toasts.avatarInvalidImage'));
      } else {
        customToast.error(error.message || t('toasts.failedToUpdateAvatar'));
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleActivateUpload = async (uploadId) => {
    setIsSettingPreset(true);
    try {
      await activateUploadedAvatarUseCase.execute(uploadId);
      await refetchUser();
      await loadUploads();
      customToast.success(t('toasts.avatarUpdated'));
    } catch (error) {
      console.error('Error activating uploaded avatar:', error);
      customToast.error(error.message || t('toasts.failedToUpdateAvatar'));
    } finally {
      setIsSettingPreset(false);
    }
  };

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      await removeAvatarUseCase.execute();
      await refetchUser();
      customToast.success(t('toasts.avatarRemoved'));
    } catch (error) {
      console.error('Error removing avatar:', error);
      customToast.error(error.message || t('toasts.failedToRemoveAvatar'));
    } finally {
      setIsRemoving(false);
    }
  };

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
