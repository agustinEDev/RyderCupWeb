import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { updateUserProfileUseCase, updateManualHandicapUseCase, fetchCountriesUseCase } from '../composition';
import { CountryFlag } from '../utils/countryUtils';
import { formatCountryName } from '../services/countries';
import customToast from '../utils/toast';

const CompleteProfile = () => {
  const { t, i18n } = useTranslation('auth');
  const navigate = useNavigate();
  const { user, refetch: refetchUser } = useAuth();

  const [formData, setFormData] = useState({
    countryCode: '',
    gender: '',
    handicap: '',
  });
  const [countries, setCountries] = useState([]);
  const [isLoadingCountries, setIsLoadingCountries] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load countries on mount
  useEffect(() => {
    const loadCountries = async () => {
      try {
        setIsLoadingCountries(true);
        const countriesData = await fetchCountriesUseCase.execute();
        setCountries(countriesData || []);
      } catch (error) {
        console.error('Error loading countries:', error);
        setCountries([]);
      } finally {
        setIsLoadingCountries(false);
      }
    };
    loadCountries();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!user) return;

    setIsSaving(true);
    try {
      const updateData = {};

      if (formData.countryCode) {
        updateData.countryCode = formData.countryCode;
      }
      if (formData.gender) {
        updateData.gender = formData.gender;
      }

      // Update profile if there are changes
      if (Object.keys(updateData).length > 0) {
        await updateUserProfileUseCase.execute(user.id, updateData);
      }

      // Update handicap if provided
      if (formData.handicap !== '') {
        await updateManualHandicapUseCase.execute({
          userId: user.id,
          handicap: formData.handicap,
        });
      }

      await refetchUser();
      customToast.success(t('google.completeProfile.success'));
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('Error completing profile:', error);
      customToast.error(error.message || t('google.genericError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 font-poppins">
              {t('google.completeProfile.title')}
            </h2>
            <p className="text-gray-600 mt-2">
              {t('google.completeProfile.subtitle')}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-5">
            {/* Country */}
            <div>
              <label htmlFor="countryCode" className="block text-sm font-semibold text-gray-700 mb-2">
                {t('google.completeProfile.countryLabel')}
              </label>
              <div className="relative">
                <select
                  id="countryCode"
                  name="countryCode"
                  value={formData.countryCode}
                  onChange={handleChange}
                  className={`w-full py-3 rounded-lg border-2 border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-gray-900 bg-white disabled:bg-gray-50 disabled:cursor-not-allowed appearance-none pr-10 ${
                    formData.countryCode ? 'pl-12' : 'pl-4'
                  }`}
                  disabled={isSaving || isLoadingCountries}
                >
                  <option value="">{t('google.completeProfile.countryPlaceholder')}</option>
                  {countries.map((country) => (
                    <option key={country.code} value={country.code}>
                      {formatCountryName(country, i18n.language)}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                {formData.countryCode && (
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <CountryFlag countryCode={formData.countryCode} style={{ width: '24px', height: 'auto' }} />
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {t('google.completeProfile.countryHint')}
              </p>
            </div>

            {/* Gender */}
            <div>
              <label htmlFor="gender" className="block text-sm font-semibold text-gray-700 mb-2">
                {t('google.completeProfile.genderLabel')}
              </label>
              <div className="relative">
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full py-3 px-4 rounded-lg border-2 border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-gray-900 bg-white disabled:bg-gray-50 disabled:cursor-not-allowed appearance-none pr-10"
                  disabled={isSaving}
                >
                  <option value="">{t('google.completeProfile.genderPlaceholder')}</option>
                  <option value="MALE">{t('google.completeProfile.genderOptions.MALE')}</option>
                  <option value="FEMALE">{t('google.completeProfile.genderOptions.FEMALE')}</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Handicap */}
            <div>
              <label htmlFor="handicap" className="block text-sm font-semibold text-gray-700 mb-2">
                {t('google.completeProfile.handicapLabel')}
              </label>
              <input
                id="handicap"
                type="number"
                name="handicap"
                value={formData.handicap}
                onChange={handleChange}
                step="0.1"
                min="-10"
                max="54"
                placeholder={t('google.completeProfile.handicapPlaceholder')}
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-gray-900 placeholder:text-gray-400"
                disabled={isSaving}
              />
              <p className="text-xs text-gray-500 mt-2">
                {t('google.completeProfile.handicapHint')}
              </p>
            </div>

            {/* Save Button */}
            <motion.button
              type="submit"
              disabled={isSaving}
              whileHover={{ scale: isSaving ? 1 : 1.02 }}
              whileTap={{ scale: isSaving ? 1 : 0.98 }}
              className={`w-full py-3.5 rounded-lg font-bold text-white transition-all duration-300 shadow-lg ${
                isSaving
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-primary hover:bg-primary/90 hover:shadow-xl'
              }`}
            >
              {isSaving ? t('google.completeProfile.saving') : t('google.completeProfile.saveButton')}
            </motion.button>

            {/* Skip Button */}
            <button
              type="button"
              onClick={handleSkip}
              disabled={isSaving}
              className="w-full py-3 rounded-lg font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              {t('google.completeProfile.skipButton')}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default CompleteProfile;
