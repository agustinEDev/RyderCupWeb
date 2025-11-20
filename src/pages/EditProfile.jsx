import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HeaderAuth from '../components/layout/HeaderAuth';
import { getAuthToken, getUserData, setUserData } from '../utils/secureAuth';
import toast from 'react-hot-toast'; // Nueva importación
import { updateUserProfileUseCase, updateUserSecurityUseCase, updateManualHandicapUseCase, updateRfegHandicapUseCase } from '../composition';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const EditProfile = () => {
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
  }, []);

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

      // Update secure storage
      setUserData(refreshedUser);

      // Update state
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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

      setUser(updatedUserPlain); // Actualizar el estado `user` del componente
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
    
    // Validaciones de UI (permanecen en el componente)
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
        currentPassword: formData.currentPassword,
      };
      if (isEmailChanged) {
        securityData.email = trimmedEmail;
      }
      if (isPasswordChanged) {
        securityData.newPassword = formData.newPassword;
        securityData.confirmPassword = formData.confirmPassword; // <-- CORRECCIÓN
      }

      // Llamada al caso de uso (la lógica de API y manejo de token está encapsulada)
      const updatedUserEntity = await updateUserSecurityUseCase.execute({
        userId: user.id,
        securityData: securityData,
      });

      // Actualizar el almacenamiento seguro y el estado del componente
      const updatedUserPlain = updatedUserEntity.toPersistence(); 
      setUserData(updatedUserPlain);
      setUser(updatedUserPlain);

      // Limpiar campos de seguridad después de una actualización exitosa
      setFormData(prev => ({
        ...prev,
        email: updatedUserPlain.email,  // Restablecer al email actual
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));

      toast.success('Security settings updated successfully!');
    } catch (error) {
      console.error('Error updating security:', error);
      // El error ya viene "limpio" del caso de uso/repositorio
      toast.error(error.message || 'Failed to update security settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const fullName = `${user.first_name} ${user.last_name}`;

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const currentHandicap = user.handicap !== null && user.handicap !== undefined
    ? user.handicap
    : 'Not set';
  const handicapUpdated = formatDate(user.handicap_updated_at);

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-white">
      <div className="layout-container flex h-full grow flex-col">
        <HeaderAuth user={user} />

        <div className="px-4 md:px-40 flex flex-1 justify-center py-5">
          <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
            {/* Page Title */}
            <div className="flex flex-wrap justify-between gap-3 p-4 items-center">
              <p className="text-gray-900 tracking-tight text-3xl md:text-[32px] font-bold leading-tight min-w-72">
                Edit Profile
              </p>
              <button
                onClick={handleRefreshUserData}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh profile data from server"
              >
                <svg className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
              </button>
            </div>

            {/* Message Display is now handled by react-hot-toast */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4">
              {/* Personal Profile Section */}
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-gray-900 font-bold text-lg mb-4">Personal Information</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Update your name and last name. No password required.
                </p>

                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      placeholder="Enter your first name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      placeholder="Enter your last name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? 'Updating...' : 'Update Personal Info'}
                  </button>
                </form>
              </div>

              {/* Security Settings Section */}
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-gray-900 font-bold text-lg mb-4">Security Settings</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Update your email and/or password. Current password required.
                </p>

                <form onSubmit={handleUpdateSecurity} className="space-y-4">
                  <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      Current Password *
                    </label>
                    <input
                      id="currentPassword"
                      type="password"
                      name="currentPassword"
                      value={formData.currentPassword}
                      onChange={handleInputChange}
                      placeholder="Required to update security settings"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter your current password to authorize changes
                    </p>
                  </div>

                  <div className="pt-3 border-t border-gray-200">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      New Email (optional)
                    </label>
                    <input
                      id="email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Enter new email to change"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Current: <span className="font-medium">{user.email}</span>
                    </p>
                  </div>

                  <div className="pt-3 border-t border-gray-200">
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      New Password (optional)
                    </label>
                    <input
                      id="newPassword"
                      type="password"
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleInputChange}
                      placeholder="Leave empty to keep current password"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Must be at least 8 characters if changing
                    </p>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="Confirm your new password"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? 'Updating...' : 'Update Security Settings'}
                  </button>
                </form>
              </div>

            </div>

            {/* Handicap Section - Full Width Row */}
            <div className="px-4 mt-6">
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-gray-900 font-bold text-lg mb-4">Handicap Management</h3>

                {/* Current Handicap Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Current Handicap:</span>{' '}
                    <span className="text-primary font-bold text-lg">{currentHandicap}</span>
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Last updated: {handicapUpdated}
                  </p>
                </div>

                <form onSubmit={handleUpdateHandicapManually} className="space-y-4">
                  <div>
                    <label htmlFor="handicap" className="block text-sm font-medium text-gray-700 mb-1">
                      Handicap (Manual)
                    </label>
                    <input
                      id="handicap"
                      type="number"
                      name="handicap"
                      value={formData.handicap}
                      onChange={handleInputChange}
                      step="0.1"
                      min="-10"
                      max="54"
                      placeholder="Enter handicap (-10.0 to 54.0)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Range: -10.0 to 54.0 (RFEG/EGA standard)
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? 'Updating...' : 'Update Manually'}
                  </button>
                </form>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-3">
                    Or update automatically from RFEG:
                  </p>
                  <button
                    type="button"
                    onClick={handleUpdateHandicapRFEG}
                    disabled={isUpdatingRFEG}
                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdatingRFEG ? 'Updating from RFEG...' : 'Update from RFEG'}
                  </button>
                  <p className="text-xs text-gray-500 mt-2">
                    This will look up your handicap using your registered name in the RFEG database.
                    If not found, you can provide a manual fallback above.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-stretch">
              <div className="flex flex-1 gap-3 flex-wrap px-4 py-6 justify-end">
                <button
                  onClick={() => navigate('/profile')}
                  className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-gray-100 text-gray-900 text-sm font-bold leading-normal tracking-wide hover:bg-gray-200 transition-colors"
                >
                  <span className="truncate">Cancel</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProfile;
