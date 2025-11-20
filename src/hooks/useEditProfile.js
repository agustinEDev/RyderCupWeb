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

// Importar utilidades de autenticación segura
import { getAuthToken, getUserData, setUserData } from '../utils/secureAuth';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const useEditProfile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingRFEG, setIsUpdatingRFEG] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    handicap: ''
  });

  useEffect(() => {
    // Fetch user data from secure storage (auth already verified by ProtectedRoute)
    const userData = getUserData();

    if (userData) {
      setUser(userData);
      setFormData({
        firstName: userData.first_name || '',
        lastName: userData.last_name || '',
        email: userData.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        handicap: userData.handicap === null ? '' : userData.handicap.toString()
      });
    }
    setIsLoading(false);
  }, []); // El array vacío asegura que esto solo se ejecute una vez

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
      const token = getAuthToken();
      const response = await fetch(`${API_URL}/api/v1/auth/current-user`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to refresh user data');
      }

      const refreshedUser = await response.json();

      // Actualizar el almacenamiento seguro
      setUserData(refreshedUser);

      // Actualizar el estado del hook
      setUser(refreshedUser);
      setFormData({
        firstName: refreshedUser.first_name || '',
        lastName: refreshedUser.last_name || '',
        email: refreshedUser.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        handicap: refreshedUser.handicap === null ? '' : refreshedUser.handicap.toString()
      });

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

      const updatedUserPlain = updatedUserEntity.toPersistence();
      setUserData(updatedUserPlain);
      setUser(updatedUserPlain);

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

      const updatedUserPlain = updatedUserEntity.toPersistence();
      setUserData(updatedUserPlain);
      setUser(updatedUserPlain);
      
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

    if (trimmedFirstName === user.first_name && trimmedLastName === user.last_name) {
      toast.warn('No changes detected in name or last name.');
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
      // Llamada al caso de uso
      const updatedUserEntity = await updateUserProfileUseCase.execute(user.id, {
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
      });

      // Actualizar el almacenamiento seguro y el estado del componente
      // Convertir la entidad de vuelta a un objeto plano compatible con `setUserData`
      const updatedUserPlain = updatedUserEntity.toPersistence(); 
      setUserData(updatedUserPlain);

      setUser(updatedUserPlain); // Actualizar el estado `user` del hook
      setFormData(prev => ({
        ...prev,
        firstName: updatedUserEntity.firstName,
        lastName: updatedUserEntity.lastName,
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
      toast.warn('No changes detected in email or password.');
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

      const updatedUserPlain = updatedUserEntity.toPersistence(); 
      setUserData(updatedUserPlain);
      setUser(updatedUserPlain);

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
