import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import HeaderAuth from '../components/layout/HeaderAuth';
import { useEditProfile } from '../hooks/useEditProfile'; // <- ¡NUEVA IMPORTACIÓN!
import { canUseRFEG, CountryFlag } from '../utils/countryUtils';
import { formatCountryName } from '../services/countries';

const EditProfile = () => {
  const { t, i18n } = useTranslation('profile');
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
    handleRefreshUserData,
    isGoogleLinked,
    hasPassword,
    isUnlinkingGoogle,
    handleLinkGoogle,
    handleUnlinkGoogle,
  } = useEditProfile();

  const navigate = useNavigate();

  // --- LÓGICA DE RENDERIZADO ---
  // (Esta parte no cambia, pero ahora es más fácil de razonar sobre ella)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common:loading')}</p>
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
                {t('edit.title')}
              </p>
              <button
                onClick={handleRefreshUserData}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={t('edit.refreshData')}
              >
                <svg className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {isRefreshing ? t('edit.refreshing') : t('edit.refreshData')}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4">
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-gray-900 font-bold text-lg mb-4">{t('edit.personalInfo.title')}</h3>
                <p className="text-sm text-gray-600 mb-4">
                  {t('edit.personalInfo.subtitle')}
                </p>

                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                      {t('edit.personalInfo.firstName')}
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      placeholder="Enter your first name"
                      maxLength={100}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                      {t('edit.personalInfo.lastName')}
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      placeholder="Enter your last name"
                      maxLength={100}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  {/* Nationality Selector */}
                  <div>
                    <label htmlFor="countryCode" className="block text-sm font-medium text-gray-700 mb-1">
                      {t('edit.personalInfo.nationality')} <span className="text-gray-400 font-normal">{t('edit.personalInfo.nationalityOptional')}</span>
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
                        <option value="">{t('edit.personalInfo.selectNationality')}</option>
                        {countries.map((country) => (
                          <option key={country.code} value={country.code}>
                            {formatCountryName(country, i18n.language)}
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
                      {t('edit.personalInfo.rfegInfo')}
                    </p>
                  </div>

                  {/* Gender Selector */}
                  <div>
                    <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
                      {t('edit.personalInfo.gender')}
                    </label>
                    <div className="relative">
                      <select
                        id="gender"
                        name="gender"
                        value={formData.gender}
                        onChange={handleInputChange}
                        className="w-full py-2 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary bg-white disabled:bg-gray-50 disabled:cursor-not-allowed appearance-none pr-10"
                        disabled={isSaving}
                      >
                        <option value="">{t('edit.personalInfo.genderPlaceholder')}</option>
                        <option value="MALE">{t('edit.personalInfo.genderOptions.MALE')}</option>
                        <option value="FEMALE">{t('edit.personalInfo.genderOptions.FEMALE')}</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? t('edit.personalInfo.updating') : t('edit.personalInfo.update')}
                  </button>
                </form>
              </div>

              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-gray-900 font-bold text-lg mb-4">{t('edit.security.title')}</h3>
                <p className="text-sm text-gray-600 mb-4">
                  {t('edit.security.subtitle')}
                </p>

                <form onSubmit={handleUpdateSecurity} className="space-y-4">
                  <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      {t('edit.security.currentPassword')}
                    </label>
                    <input
                      id="currentPassword"
                      type="password"
                      name="currentPassword"
                      value={formData.currentPassword}
                      onChange={handleInputChange}
                      placeholder={t('edit.security.currentPasswordPlaceholder')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {t('edit.security.currentPasswordHelp')}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-gray-200">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      {t('edit.security.newEmail')}
                    </label>
                    <input
                      id="email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder={t('edit.security.newEmailPlaceholder')}
                      maxLength={254}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {t('edit.security.currentEmail', { email: user.email })}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-gray-200">
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      {t('edit.security.newPassword')}
                    </label>
                    <input
                      id="newPassword"
                      type="password"
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleInputChange}
                      placeholder={t('edit.security.newPasswordPlaceholder')}
                      maxLength={128}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {t('edit.security.newPasswordHelp')}
                    </p>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      {t('edit.security.confirmPassword')}
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder={t('edit.security.confirmPasswordPlaceholder')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? t('edit.security.updating') : t('edit.security.update')}
                  </button>
                </form>
              </div>
            </div>

            <div className="px-4 mt-6">
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-gray-900 font-bold text-lg mb-4">{t('edit.handicap.title')}</h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">{t('edit.handicap.current')}</span>{' '}
                    <span className="text-primary font-bold text-lg">{currentHandicap}</span>
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {t('edit.handicap.lastUpdated', { date: handicapUpdated })}
                  </p>
                </div>

                <form onSubmit={handleUpdateHandicapManually} className="space-y-4">
                  <div>
                    <label htmlFor="handicap" className="block text-sm font-medium text-gray-700 mb-1">
                      {t('edit.handicap.manual')}
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
                      placeholder={t('edit.handicap.manualPlaceholder')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {t('edit.handicap.manualHelp')}
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? t('edit.handicap.updating') : t('edit.handicap.updateManually')}
                  </button>
                </form>

                {/* RFEG Update - Only for Spanish players */}
                {canUseRFEG(user) ? (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600 mb-3">
                      {t('edit.handicap.rfegUpdate')}
                    </p>
                    <button
                      type="button"
                      onClick={handleUpdateHandicapRFEG}
                      disabled={isUpdatingRFEG}
                      className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUpdatingRFEG ? t('edit.handicap.updatingFromRFEG') : t('edit.handicap.updateFromRFEG')}
                    </button>
                    <p className="text-xs text-gray-500 mt-2">
                      {t('edit.handicap.rfegHelp')}
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                      <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="font-semibold mb-1">{t('edit.handicap.rfegOnlySpanish')}</p>
                        <p className="text-xs">
                          {user.country_code
                            ? t('edit.handicap.rfegInfoWithNationality', { countryCode: user.country_code })
                            : t('edit.handicap.rfegInfoNoNationality')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Linked Accounts Section */}
            <div className="px-4 mt-6">
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-gray-900 font-bold text-lg mb-2">{t('edit.linkedAccounts.title')}</h3>
                <p className="text-sm text-gray-600 mb-4">{t('edit.linkedAccounts.subtitle')}</p>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {/* Google icon */}
                    <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    <div>
                      <p className="font-semibold text-gray-900">{t('edit.linkedAccounts.google')}</p>
                      <p className={`text-sm ${isGoogleLinked ? 'text-green-600' : 'text-gray-500'}`}>
                        {isGoogleLinked ? t('edit.linkedAccounts.linked') : t('edit.linkedAccounts.notLinked')}
                      </p>
                    </div>
                  </div>

                  <div>
                    {!isGoogleLinked ? (
                      <button
                        type="button"
                        onClick={handleLinkGoogle}
                        className="px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-semibold rounded-lg transition-colors"
                      >
                        {t('edit.linkedAccounts.link')}
                      </button>
                    ) : hasPassword ? (
                      <button
                        type="button"
                        onClick={handleUnlinkGoogle}
                        disabled={isUnlinkingGoogle}
                        className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isUnlinkingGoogle ? t('edit.linkedAccounts.unlinking') : t('edit.linkedAccounts.unlink')}
                      </button>
                    ) : (
                      <div className="relative group">
                        <button
                          type="button"
                          disabled
                          aria-label={t('edit.linkedAccounts.cannotUnlinkOnly')}
                          title={t('edit.linkedAccounts.cannotUnlinkOnly')}
                          className="px-4 py-2 bg-gray-100 text-gray-400 text-sm font-semibold rounded-lg cursor-not-allowed"
                        >
                          {t('edit.linkedAccounts.unlink')}
                        </button>
                        <div className="absolute bottom-full right-0 mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none">
                          {t('edit.linkedAccounts.cannotUnlinkOnly')}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-stretch">
              <div className="flex flex-1 gap-3 flex flex-wrap px-4 py-6 justify-end">
                <button
                  onClick={() => navigate('/profile')}
                  className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-gray-100 text-gray-900 text-sm font-bold leading-normal tracking-wide hover:bg-gray-200 transition-colors"
                >
                  <span className="truncate">{t('edit.cancel')}</span>
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
