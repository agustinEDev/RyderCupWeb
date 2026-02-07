import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import customToast from '../utils/toast';

import {
  updateUserProfileUseCase,
  updateUserSecurityUseCase,
  updateManualHandicapUseCase,
  updateRfegHandicapUseCase,
  fetchCountriesUseCase,
} from '../composition';

import { useAuth } from './useAuth';

export const useEditProfile = () => {
  const { t } = useTranslation('profile');
  const { user: authUser, refetch: refetchUser } = useAuth();

  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingRFEG, setIsUpdatingRFEG] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [countries, setCountries] = useState([]);
  const [isLoadingCountries, setIsLoadingCountries] = useState(true);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    handicap: '',
    countryCode: '',
  });

  // Cargar datos de usuario en el formulario
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (!authUser) {
          setIsLoading(false);
          return;
        }

        setUser(authUser);

        setFormData({
          firstName: authUser.first_name || '',
          lastName: authUser.last_name || '',
          email: authUser.email || '',
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
          handicap:
            authUser.handicap === null ? '' : authUser.handicap.toString(),
          countryCode: authUser.country_code || '',
        });
      } catch (error) {
        console.error('❌ [useEditProfile] Error fetching user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [authUser]);

  // Cargar países
  useEffect(() => {
    const loadCountries = async () => {
      try {
        setIsLoadingCountries(true);
        const countriesData = await fetchCountriesUseCase.execute();
        setCountries(countriesData || []);
      } catch (error) {
        console.error('❌ [useEditProfile] Error loading countries:', error);
        setCountries([]);
      } finally {
        setIsLoadingCountries(false);
      }
    };

    loadCountries();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRefreshUserData = async () => {
    setIsRefreshing(true);
    try {
      await refetchUser();
      // refetchUser actualizará authUser, y por tanto el useEffect
      // recargará user + formData.
    } catch (error) {
      console.error('Error refreshing user data:', error);
      customToast.error(t('toasts.failedToRefreshData'));
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleUpdateHandicapManually = async (e) => {
    if (e?.preventDefault) e.preventDefault();

    if (!user) {
      customToast.error(t('toasts.userNotLoaded'));
      return;
    }

    setIsSaving(true);
    try {
      await updateManualHandicapUseCase.execute({
        userId: user.id,
        handicap: formData.handicap,
      });

      await refetchUser();
      customToast.success(t('toasts.handicapUpdated'));
    } catch (error) {
      console.error('Error updating handicap:', error);
      customToast.error(error.message || t('toasts.failedToUpdateHandicap'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateHandicapRFEG = async () => {
    if (!user) {
      customToast.error(t('toasts.userNotLoaded'));
      return;
    }

    setIsUpdatingRFEG(true);
    try {
      await updateRfegHandicapUseCase.execute({
        userId: user.id,
      });

      await refetchUser();
      // refetchUser updates authUser, which triggers useEffect to update formData

      customToast.success(t('toasts.handicapUpdatedRFEG'));
    } catch (error) {
      console.error('Error updating handicap from RFEG:', error);
      customToast.error(
        error.message || t('toasts.failedToUpdateHandicapRFEG'),
      );
    } finally {
      setIsUpdatingRFEG(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();

    if (!user) {
      customToast.error(t('toasts.userNotLoaded'));
      return;
    }

    const trimmedFirstName = formData.firstName.trim();
    const trimmedLastName = formData.lastName.trim();
    const trimmedCountryCode = formData.countryCode.trim();

    const isNameChanged =
      trimmedFirstName !== user.first_name ||
      trimmedLastName !== user.last_name;
    const isCountryChanged =
      trimmedCountryCode !== (user.country_code || '');

    if (!isNameChanged && !isCountryChanged) {
      customToast.info(t('toasts.noProfileChanges'));
      return;
    }

    if (trimmedFirstName.length < 2) {
      customToast.error(t('toasts.firstNameTooShort'));
      return;
    }

    if (trimmedLastName.length < 2) {
      customToast.error(t('toasts.lastNameTooShort'));
      return;
    }

    setIsSaving(true);
    try {
      const updateData = {
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
      };

      if (isCountryChanged) {
        updateData.countryCode =
          trimmedCountryCode === '' ? null : trimmedCountryCode;
      }

      await updateUserProfileUseCase.execute(
        user.id,
        updateData,
      );

      await refetchUser();
      // refetchUser updates authUser, which triggers useEffect to update formData

      customToast.success(t('toasts.profileUpdated'));
    } catch (error) {
      console.error('Error updating profile:', error);
      customToast.error(error.message || t('toasts.failedToUpdateProfile'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateSecurity = async (e) => {
    e.preventDefault();

    if (!user) {
      customToast.error(t('toasts.userNotLoaded'));
      return;
    }

    if (!formData.currentPassword) {
      customToast.error(t('toasts.currentPasswordRequired'));
      return;
    }

    const trimmedEmail = formData.email.trim();
    const isEmailChanged =
      trimmedEmail !== '' && trimmedEmail !== user.email;
    const isPasswordChanged = formData.newPassword !== '';

    if (!isEmailChanged && !isPasswordChanged) {
      customToast.info(t('toasts.noSecurityChanges'));
      return;
    }

    if (isPasswordChanged) {
      if (formData.newPassword.length < 12) {
        customToast.error(t('toasts.passwordTooShort'));
        return;
      }

      if (formData.newPassword !== formData.confirmPassword) {
        customToast.error(t('toasts.passwordsDoNotMatch'));
        return;
      }
    }

    setIsSaving(true);
    try {
      const securityData = {
        current_password: formData.currentPassword,
      };

      if (isEmailChanged) {
        securityData.new_email = trimmedEmail;
      }

      if (isPasswordChanged) {
        securityData.new_password = formData.newPassword;
        securityData.confirm_password = formData.confirmPassword;
      }

      await updateUserSecurityUseCase.execute({
        userId: user.id,
        securityData,
      });

      await refetchUser();
      // refetchUser updates authUser, which triggers useEffect to update formData

      // Clear password fields manually (not part of user object)
      setFormData((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));

      customToast.success(t('toasts.securityUpdated'));
    } catch (error) {
      console.error('Error updating security:', error);

      // v1.13.0: Handle Password History error
      if (error.message && error.message.includes('last 5 passwords')) {
        customToast.error(
          t('toasts.passwordReused'),
          {
            duration: 8000,
            icon: '🔑',
          }
        );
      } else {
        customToast.error(
          error.message || t('toasts.failedToUpdateSecurity'),
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  return {
    // Public state
    user,
    formData,
    isLoading,
    isSaving,
    isUpdatingRFEG,
    isRefreshing,
    countries,
    isLoadingCountries,

    // Public handlers
    handleInputChange,
    handleRefreshUserData,
    handleUpdateHandicapManually,
    handleUpdateHandicapRFEG,
    handleUpdateProfile,
    handleUpdateSecurity,
  };
};
