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
  const [message, setMessage] = useState({ type: '', text: '' });

  const [formData, setFormData] = useState({
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
          user_id: user.id,
          manual_handicap: formData.handicap ? Number.parseFloat(formData.handicap) : null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
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

      setMessage({ type: 'success', text: 'Handicap updated from RFEG successfully!' });
    } catch (error) {
      console.error('Error updating handicap from RFEG:', error);
      setMessage({ 
        type: 'error', 
        text: error.message || 'Failed to update handicap from RFEG. Make sure your name is registered in RFEG.' 
      });
    } finally {
      setIsUpdatingRFEG(false);
    }
  };

  const handleUpdateEmailPassword = async (e) => {
    e.preventDefault();
    setMessage({ type: 'warning', text: 'Email and password updates are not yet implemented in the backend API.' });
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
            <div className="flex flex-wrap justify-between gap-3 p-4">
              <p className="text-gray-900 tracking-tight text-3xl md:text-[32px] font-bold leading-tight min-w-72">
                Edit Profile
              </p>
            </div>

            {/* Message Display */}
            {message.text && (
              <div className={`mx-4 mb-4 p-4 rounded-lg ${getMessageClassName(message.type)}`}>
                {message.text}
              </div>
            )}

            {/* User Info Display */}
            <div className="p-4">
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-gray-700 text-sm mb-2">
                  <span className="font-semibold">Name:</span> {fullName}
                </p>
                <p className="text-gray-700 text-sm">
                  <span className="font-semibold">Current Email:</span> {user.email}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4">
              {/* Email & Password Section */}
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-gray-900 font-bold text-lg mb-4">Account Settings</h3>
                <p className="text-sm text-yellow-700 bg-yellow-50 p-3 rounded mb-4">
                  ⚠️ Email and password updates are not yet implemented in the backend API.
                </p>

                <form onSubmit={handleUpdateEmailPassword} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      New Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-gray-100 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      Current Password
                    </label>
                    <input
                      id="currentPassword"
                      type="password"
                      name="currentPassword"
                      value={formData.currentPassword}
                      onChange={handleInputChange}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-gray-100 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      New Password
                    </label>
                    <input
                      id="newPassword"
                      type="password"
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleInputChange}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-gray-100 cursor-not-allowed"
                    />
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
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-gray-100 cursor-not-allowed"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled
                    className="w-full bg-gray-300 text-gray-500 font-bold py-2 px-4 rounded-lg cursor-not-allowed"
                  >
                    Update Account (Coming Soon)
                  </button>
                </form>
              </div>

              {/* Handicap Section */}
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
