import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HeaderAuth from '../components/layout/HeaderAuth';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Helper function to get message className
const getMessageClassName = (type) => {
  if (type === 'success') return 'bg-green-50 text-green-800 border border-green-200';
  if (type === 'error') return 'bg-red-50 text-red-800 border border-red-200';
  return 'bg-yellow-50 text-yellow-800 border border-yellow-200';
};

const EditProfile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingRFEG, setIsUpdatingRFEG] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

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
    // Check authentication
    const token = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      navigate('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      setFormData({
        firstName: parsedUser.first_name || '',
        lastName: parsedUser.last_name || '',
        email: parsedUser.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        handicap: parsedUser.handicap === null ? '' : parsedUser.handicap.toString()
      });
    } catch (error) {
      console.error('Error parsing user data:', error);
      navigate('/login');
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  const handleRefreshUserData = async () => {
    setIsRefreshing(true);
    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('access_token');
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

      // Update localStorage
      localStorage.setItem('user', JSON.stringify(refreshedUser));

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

      setMessage({ type: 'success', text: 'Profile data refreshed successfully!' });
    } catch (error) {
      console.error('Error refreshing user data:', error);
      setMessage({ type: 'error', text: 'Failed to refresh user data. Please try logging in again.' });
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
    // Clear message when user types
    if (message.text) setMessage({ type: '', text: '' });
  };

  const handleUpdateHandicapManually = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    // Validate handicap
    const handicapValue = Number.parseFloat(formData.handicap);
    if (Number.isNaN(handicapValue) || handicapValue < -10 || handicapValue > 54) {
      setMessage({ type: 'error', text: 'Handicap must be between -10.0 and 54.0' });
      return;
    }

    setIsSaving(true);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_URL}/api/v1/handicaps/update-manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          user_id: user.id,
          handicap: handicapValue
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update handicap');
      }

      const updatedUser = await response.json();

      // Update localStorage and state
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      setMessage({ type: 'success', text: 'Handicap updated successfully!' });
    } catch (error) {
      console.error('Error updating handicap:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to update handicap' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateHandicapRFEG = async () => {
    setMessage({ type: '', text: '' });
    setIsUpdatingRFEG(true);

    try {
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(`${API_URL}/api/v1/handicaps/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          user_id: user.id
          // NOTE: Do NOT send manual_handicap when updating from RFEG
          // Let the backend fetch from RFEG or return error if not found
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Backend sends specific error messages (service unavailable, user not found, etc.)
        throw new Error(errorData.detail || 'Failed to update handicap from RFEG');
      }

      const updatedUser = await response.json();

      // Update localStorage and state
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      // Safely update handicap in form, handle null case
      setFormData(prev => ({ 
        ...prev, 
        handicap: updatedUser.handicap === null ? '' : updatedUser.handicap.toString()
      }));

      // Success message
      setMessage({ 
        type: 'success', 
        text: 'Handicap updated from RFEG successfully!' 
      });
    } catch (error) {
      console.error('Error updating handicap from RFEG:', error);
      
      // Display the specific error message from backend
      // Backend will send messages like:
      // - "RFEG service is currently unavailable"
      // - "User not found in RFEG database"
      // - etc.
      setMessage({ 
        type: 'error', 
        text: error.message || 'Failed to update handicap from RFEG. Please try again later.' 
      });
    } finally {
      setIsUpdatingRFEG(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    // Trim values before validation and comparison
    const trimmedFirstName = formData.firstName.trim();
    const trimmedLastName = formData.lastName.trim();

    // Validate that at least one field has changed
    if (trimmedFirstName === user.first_name && trimmedLastName === user.last_name) {
      setMessage({ type: 'warning', text: 'No changes detected in name or last name.' });
      return;
    }

    // Validate name lengths (must be at least 2 characters if changed)
    if (trimmedFirstName !== user.first_name) {
      if (trimmedFirstName.length < 2) {
        setMessage({ type: 'error', text: 'First name must be at least 2 characters.' });
        return;
      }
    }

    if (trimmedLastName !== user.last_name) {
      if (trimmedLastName.length < 2) {
        setMessage({ type: 'error', text: 'Last name must be at least 2 characters.' });
        return;
      }
    }

    setIsSaving(true);

    try {
      const token = localStorage.getItem('access_token');

      // Build payload with only changed fields (avoid sending null)
      const payload = {};
      if (trimmedFirstName !== user.first_name) {
        payload.first_name = trimmedFirstName;
      }
      if (trimmedLastName !== user.last_name) {
        payload.last_name = trimmedLastName;
      }

      const response = await fetch(`${API_URL}/api/v1/users/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Handle different error formats
        let errorMessage = 'Failed to update profile';
        if (errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail.map(err => err.msg).join(', ');
          } else if (typeof errorData.detail === 'string') {
            errorMessage = errorData.detail;
          } else if (typeof errorData.detail === 'object') {
            errorMessage = JSON.stringify(errorData.detail);
          }
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const updatedUser = data.user;

      // Update localStorage and state
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setFormData(prev => ({
        ...prev,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name
      }));

      setMessage({ type: 'success', text: data.message || 'Profile updated successfully!' });
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateSecurity = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    // Validate current password is provided
    if (!formData.currentPassword) {
      setMessage({ type: 'error', text: 'Current password is required to update security settings.' });
      return;
    }

    // Check if at least one security field is being updated
    // Trim email before validation and comparison
    const trimmedEmail = formData.email.trim();
    const isEmailChanged = trimmedEmail !== '' && trimmedEmail !== user.email;
    const isPasswordChanged = formData.newPassword !== '';

    if (!isEmailChanged && !isPasswordChanged) {
      setMessage({ type: 'warning', text: 'No changes detected in email or password.' });
      return;
    }

    // If changing password, validate new password
    if (isPasswordChanged) {
      if (formData.newPassword.length < 8) {
        setMessage({ type: 'error', text: 'New password must be at least 8 characters.' });
        return;
      }

      if (formData.newPassword !== formData.confirmPassword) {
        setMessage({ type: 'error', text: 'New password and confirmation do not match.' });
        return;
      }
    }

    setIsSaving(true);

    try {
      const token = localStorage.getItem('access_token');

      // Build payload with only changed fields (avoid sending null)
      const requestBody = {
        current_password: formData.currentPassword
      };
      if (isEmailChanged) {
        requestBody.new_email = trimmedEmail;
      }
      if (isPasswordChanged) {
        requestBody.new_password = formData.newPassword;
        requestBody.confirm_password = formData.confirmPassword;
      }

      const response = await fetch(`${API_URL}/api/v1/users/security`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Handle different error formats
        let errorMessage = 'Failed to update security settings';
        if (errorData.detail) {
          // If detail is an array (Pydantic validation errors)
          if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail.map(err => err.msg).join(', ');
          } else if (typeof errorData.detail === 'string') {
            errorMessage = errorData.detail;
          } else if (typeof errorData.detail === 'object') {
            errorMessage = JSON.stringify(errorData.detail);
          }
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const updatedUser = data.user;

      // Update localStorage and state
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      // Clear all security fields after successful update
      setFormData(prev => ({
        ...prev,
        email: updatedUser.email,  // Reset to current email
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));

      setMessage({ type: 'success', text: data.message || 'Security settings updated successfully!' });
    } catch (error) {
      console.error('Error updating security:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to update security settings' });
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

            {/* Message Display */}
            {message.text && (
              <div className={`mx-4 mb-4 p-4 rounded-lg ${getMessageClassName(message.type)}`}>
                {message.text}
              </div>
            )}

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
