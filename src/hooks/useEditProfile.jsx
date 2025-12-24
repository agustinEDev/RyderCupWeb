import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import {
  updateUserProfileUseCase,
  updateUserSecurityUseCase,
  updateManualHandicapUseCase,
  updateRfegHandicapUseCase,
} from '../composition';

import { useAuth } from './useAuth';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const useEditProfile = () => {
  const navigate = useNavigate();
  const { user: authUser, refetch: refetchUser } = useAuth();

  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingRFEG, setIsUpdatingRFEG] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [countries, setCountries] = useState([]);
  const [isLoadingCountries, setIsLoadingCountries] = useState(false);

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
      toast.error('Failed to refresh user data.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleUpdateHandicapManually = async (e) => {
    if (e?.preventDefault) e.preventDefault();

    if (!user) {
      toast.error('User not loaded.');
      return;
    }

    setIsSaving(true);
    try {
      await updateManualHandicapUseCase.execute({
        userId: user.id,
        handicap: formData.handicap,
      });

      await refetchUser();
      toast.success('Handicap updated successfully!');
    } catch (error) {
      console.error('Error updating handicap:', error);
      toast.error(error.message || 'Failed to update handicap');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateHandicapRFEG = async () => {
    if (!user) {
      toast.error('User not loaded.');
      return;
    }

    setIsUpdatingRFEG(true);
    try {
      const updatedUserEntity = await updateRfegHandicapUseCase.execute({
        userId: user.id,
      });

      await refetchUser();

      const updatedUserPlain = updatedUserEntity.toPersistence();

      setFormData((prev) => ({
        ...prev,
        handicap:
          updatedUserPlain.handicap === null
            ? ''
            : updatedUserPlain.handicap.toString(),
      }));

      toast.success('Handicap updated from RFEG successfully!');
    } catch (error) {
      console.error('Error updating handicap from RFEG:', error);
      toast.error(
        error.message ||
          'Failed to update handicap from RFEG. Please try again later.',
      );
    } finally {
      setIsUpdatingRFEG(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();

    if (!user) {
      toast.error('User not loaded.');
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
      toast('No changes detected in profile.', {
        icon: '⚠️',
      });
      return;
    }

    if (trimmedFirstName.length < 2) {
      toast.error('First name must be at least 2 characters.');
      return;
    }

    if (trimmedLastName.length < 2) {
      toast.error('Last name must be at least 2 characters.');
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

      const updatedUserEntity = await updateUserProfileUseCase.execute(
        user.id,
        updateData,
      );

      await refetchUser();

      const updatedUserPlain = updatedUserEntity.toPersistence();

      setFormData((prev) => ({
        ...prev,
        firstName: updatedUserPlain.first_name,
        lastName: updatedUserPlain.last_name,
        countryCode: updatedUserPlain.country_code || '',
      }));

      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateSecurity = async (e) => {
    e.preventDefault();

    if (!user) {
      toast.error('User not loaded.');
      return;
    }

    if (!formData.currentPassword) {
      toast.error(
        'Current password is required to update security settings.',
      );
      return;
    }

    const trimmedEmail = formData.email.trim();
    const isEmailChanged =
      trimmedEmail !== '' && trimmedEmail !== user.email;
    const isPasswordChanged = formData.newPassword !== '';

    if (!isEmailChanged && !isPasswordChanged) {
      toast('No changes detected in email or password.', {
        icon: '⚠️',
      });
      return;
    }

    if (isPasswordChanged) {
      if (formData.newPassword.length < 8) {
        toast.error('New password must be at least 8 characters.');
        return;
      }

      if (formData.newPassword !== formData.confirmPassword) {
        toast.error('New password and confirmation do not match.');
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

      const updatedUserEntity = await updateUserSecurityUseCase.execute({
        userId: user.id,
        securityData,
      });

      await refetchUser();

      const updatedUserPlain = updatedUserEntity.toPersistence();

      setFormData((prev) => ({
        ...prev,
        email: updatedUserPlain.email,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));

      toast.success('Security settings updated successfully!');
    } catch (error) {
      console.error('Error updating security:', error);
      toast.error(
        error.message || 'Failed to update security settings',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return {
    user,
    formData,
    isLoading,
    isSaving,
    isUpdatingRFEG,
    isRefreshing,
    countries,
    isLoadingCountries,

    setUser,
    setFormData,
    setIsLoading,
    setIsSaving,
    setIsUpdatingRFEG,
    setIsRefreshing,
    setCountries,
    setIsLoadingCountries,

    navigate,
    handleInputChange,
    handleRefreshUserData,
    handleUpdateHandicapManually,
    handleUpdateHandicapRFEG,
    handleUpdateProfile,
    handleUpdateSecurity,
  };
};
