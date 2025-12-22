import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

// Importar los casos de uso necesarios para las operaciones
import {
  updateUserProfileUseCase,
  updateUserSecurityUseCase,
  updateManualHandicapUseCase,
  updateRfegHandicapUseCase
} from '../composition';

// Importar el nuevo hook de autenticación
import { useAuth } from './useAuth';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const useEditProfile = () => {
  const navigate = useNavigate();
  const { user: authUser, loading: isLoadingAuth, refetch: refetchUser } = useAuth();
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
    countryCode: ''
  });

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (!authUser) {
          setIsLoading(false);
          return;
        }

        // Use data from httpOnly cookie authentication
        console.log('✅ [useEditProfile] User data from httpOnly cookie:', {
          userId: authUser.id,
          hasCountryCode: 'country_code' in authUser,
          countryCode: authUser.country_code
        });

        setUser(authUser);

        // Update form with user data
        setFormData({
          firstName: authUser.first_name || '',
          lastName: authUser.last_name || '',
          email: authUser.email || '',
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
          handicap: authUser.handicap === null ? '' : authUser.handicap.toString(),
          countryCode: authUser.country_code || ''
        });
      } catch (error) {
        console.error('❌ [useEditProfile] Error fetching user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [authUser]);

  // Cargar lista de países al montar el componente
  useEffect(() => {
    const fetchCountries = async () => {
      setIsLoadingCountries(true);
      try {
        const response = await fetch(`${API_URL}/api/v1/countries?language=en`);
        if (response.ok) {
          const data = await response.json();
          console.log('🌍 Countries loaded:', data.length, 'countries');
          console.log('📋 Sample country:', data[0]); // Ver estructura de datos
          console.log('📋 All countries:', data); // Ver todos los países
          setCountries(data);
        } else {
          console.error('❌ Failed to load countries, status:', response.status);
        }
      } catch (error) {
        console.error('❌ Error loading countries:', error);
      } finally {
        setIsLoadingCountries(false);
      }
    };

    fetchCountries();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRefreshUserData = async () => {
    setIsRefreshing(true);
    
    try {
      // Refetch user data from backend (via httpOnly cookie)
      await refetchUser();

      toast.success('Profile data refreshed successfully!');
    } catch (error) {
      console.error('Error refreshing user data:', error);
      toast.error('Failed to refresh user data. Please try logging in again.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleUpdateHandicapManually = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const updatedUserEntity = await updateManualHandicapUseCase.execute({
        userId: user.id,
        handicap: formData.handicap,
      });

      // Refetch user data to get updated handicap
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
    setIsUpdatingRFEG(true);

    try {
      const updatedUserEntity = await updateRfegHandicapUseCase.execute({ userId: user.id });

      // Refetch user data to get updated handicap
      await refetchUser();
      
      const updatedUserPlain = updatedUserEntity.toPersistence();
      setFormData(prev => ({ 
        ...prev, 
        handicap: updatedUserPlain.handicap === null ? '' : updatedUserPlain.handicap.toString()
      }));

      toast.success('Handicap updated from RFEG successfully!');
    } catch (error) {
      console.error('Error updating handicap from RFEG:', error);
      toast.error(error.message || 'Failed to update handicap from RFEG. Please try again later.');
    } finally {
      setIsUpdatingRFEG(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();

    const trimmedFirstName = formData.firstName.trim();
    const trimmedLastName = formData.lastName.trim();
    const trimmedCountryCode = formData.countryCode.trim();

    // Detectar si hay cambios
    const isNameChanged = trimmedFirstName !== user.first_name || trimmedLastName !== user.last_name;
    const isCountryChanged = trimmedCountryCode !== (user.country_code || '');

    if (!isNameChanged && !isCountryChanged) {
      toast('No changes detected in profile.', {
        icon: '⚠️',
      });
      return;
    }

    // Validaciones básicas de la UI
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
      // Construir updateData solo con campos que cambiaron
      const updateData = {
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
      };

      // Solo incluir countryCode si cambió
      if (isCountryChanged) {
        // Enviar null si el usuario limpia el selector, o el código seleccionado
        updateData.countryCode = trimmedCountryCode === '' ? null : trimmedCountryCode;
      }

      // Llamada al caso de uso
      const updatedUserEntity = await updateUserProfileUseCase.execute(user.id, updateData);

      // Refetch user data to get fresh data from backend
      await refetchUser();

      const updatedUserPlain = updatedUserEntity.toPersistence();
      setFormData(prev => ({
        ...prev,
        firstName: updatedUserPlain.first_name,
        lastName: updatedUserPlain.last_name,
        countryCode: updatedUserPlain.country_code || ''
      }));

      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      // Aquí el error ya viene "limpio" del caso de uso o repositorio
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateSecurity = async (e) => {
    e.preventDefault();
    
    // Validaciones de UI
    if (!formData.currentPassword) {
      toast.error('Current password is required to update security settings.');
      return;
    }

    const trimmedEmail = formData.email.trim();
    const isEmailChanged = trimmedEmail !== '' && trimmedEmail !== user.email;
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
      // Construir los datos de seguridad para el caso de uso
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
        securityData: securityData,
      });

      // Refetch user data to get fresh data from backend
      await refetchUser();

      const updatedUserPlain = updatedUserEntity.toPersistence(); 

      // Limpiar campos de seguridad después de una actualización exitosa
      setFormData(prev => ({
        ...prev,
        email: updatedUserPlain.email,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));

      toast.success('Security settings updated successfully!');
    } catch (error) {
      console.error('Error updating security:', error);
      toast.error(error.message || 'Failed to update security settings');
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
    // También necesitamos los setters para que el resto de la lógica funcione
    setUser,
    setFormData,
    setIsLoading,
    setIsSaving,
    setIsUpdatingRFEG,
    setIsRefreshing,
    navigate,
    handleInputChange,
    handleRefreshUserData,
    handleUpdateHandicapManually,
    handleUpdateHandicapRFEG,
    handleUpdateProfile,
    handleUpdateSecurity,
  };
};
