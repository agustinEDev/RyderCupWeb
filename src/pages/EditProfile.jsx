import React from 'react';
import { useNavigate } from 'react-router-dom';
import HeaderAuth from '../components/layout/HeaderAuth';
import { useEditProfile } from '../hooks/useEditProfile'; // <- ¡NUEVA IMPORTACIÓN!
import { canUseRFEG, CountryFlag } from '../utils/countryUtils';

const EditProfile = () => {
  // eslint-disable-next-line sonar/todo-tag
  // Toda la lógica ahora reside en el hook. Obtenemos todo lo que necesitamos de él.
  const {
    user,
    formData,
    isLoading,
    isSaving,
    isUpdatingRFEG,
    isRefreshing,
    countries,
    isLoadingCountries,
    handleInputChange,
    handleUpdateProfile,
    handleUpdateSecurity,
    handleUpdateHandicapManually,
    handleUpdateHandicapRFEG,
    handleRefreshUserData
  } = useEditProfile();

  const navigate = useNavigate();

  // --- LÓGICA DE RENDERIZADO ---
  // (Esta parte no cambia, pero ahora es más fácil de razonar sobre ella)

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
  
  // El JSX que sigue es idéntico al de antes, pero ahora consume los
  // estados y manejadores del hook.
  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-white">
      <div className="layout-container flex h-full grow flex-col">
        <HeaderAuth user={user} />

        <div className="px-4 md:px-40 flex flex-1 justify-center py-5">
          <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4">
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

                  {/* Nationality Selector */}
                  <div>
                    <label htmlFor="countryCode" className="block text-sm font-medium text-gray-700 mb-1">
                      Nationality <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <select
                        id="countryCode"
                        name="countryCode"
                        value={formData.countryCode}
                        onChange={handleInputChange}
                        className={`w-full py-2 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary bg-white disabled:bg-gray-50 disabled:cursor-not-allowed appearance-none pr-10 ${
                          formData.countryCode ? 'pl-12' : 'pl-3'
                        }`}
                        disabled={isSaving || isLoadingCountries}
                      >
                        <option value="">No nationality selected</option>
                        {countries.map((country) => (
                          <option key={country.code} value={country.code}>
                            {country.name_en || country.name || country.code}
                          </option>
                        ))}
                      </select>
                      {/* Dropdown icon */}
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                      {/* Show flag if country is selected */}
                      {formData.countryCode && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          <CountryFlag countryCode={formData.countryCode} style={{ width: '24px', height: 'auto' }} />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      Select Spain (ES) to enable RFEG handicap updates
                    </p>
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

            <div className="px-4 mt-6">
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-gray-900 font-bold text-lg mb-4">Handicap Management</h3>
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

                {/* RFEG Update - Only for Spanish players */}
                {canUseRFEG(user) ? (
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
                ) : (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                      <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="font-semibold mb-1">RFEG updates only available for Spanish players</p>
                        <p className="text-xs">
                          {user.country_code
                            ? `Your nationality is set to ${user.country_code}. Only players with Spanish nationality can update their handicap from RFEG.`
                            : 'To enable RFEG handicap updates, please set your nationality to Spain in your profile.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-stretch">
              <div className="flex flex-1 gap-3 flex flex-wrap px-4 py-6 justify-end">
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
