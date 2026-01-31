import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import customToast from '../utils/toast';
import { useTranslation } from 'react-i18next';
import { validateEmail, validateName, validatePassword } from '../utils/validation';
import PasswordInput from '../components/ui/PasswordInput';
import PasswordRequirements from '../components/ui/PasswordRequirements';
import PasswordStrengthMeter from '../components/ui/PasswordStrengthMeter';
import { registerUseCase } from '../composition'; // NUEVO import
import { CountryFlag } from '../utils/countryUtils';
import { formatCountryName } from '../services/countries';

const API_URL = import.meta.env.VITE_API_BASE_URL || '';

const Register = () => {
  const { t, i18n } = useTranslation('auth');
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    countryCode: '' // Campo opcional para nacionalidad
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [countries, setCountries] = useState([]);
  const [isLoadingCountries, setIsLoadingCountries] = useState(false);

  // Ref para cleanup del timer de navegación (prevenir memory leak)
  const navigationTimerRef = useRef(null);

  /**
   * Cleanup: limpiar timer de navegación al desmontar
   * Previene memory leak si el componente se desmonta antes de que se ejecute setTimeout
   */
  useEffect(() => {
    return () => {
      if (navigationTimerRef.current) {
        clearTimeout(navigationTimerRef.current);
      }
    };
  }, []);

  // Cargar lista de países al montar el componente
  useEffect(() => {
    const fetchCountries = async () => {
      setIsLoadingCountries(true);
      try {
        const response = await fetch(`${API_URL}/api/v1/countries?language=en`);
        if (response.ok) {
          const data = await response.json();
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    const firstNameValidation = validateName(formData.firstName, 'First name');
    if (!firstNameValidation.isValid) {
      newErrors.firstName = firstNameValidation.message;
    }

    const lastNameValidation = validateName(formData.lastName, 'Last name');
    if (!lastNameValidation.isValid) {
      newErrors.lastName = lastNameValidation.message;
    }

    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      newErrors.email = emailValidation.message;
    }

    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.message;
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t('validation.confirmPasswordRequired');
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('validation.passwordsDoNotMatch');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      await registerUseCase.execute({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        countryCode: formData.countryCode || null // Enviar countryCode si existe, sino null
      });

      customToast.success(t('register.success'));

      // Guardar timer ID para cleanup (prevenir memory leak)
      navigationTimerRef.current = setTimeout(() => {
        navigate('/login', {
          state: {
            message: t('register.successMessage')
          }
        });
      }, 1000);

    } catch (error) {
      customToast.error(error.message || t('register.error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full bg-white">
      <div className="flex w-full">

        {/* Left Side - Hero Image/Brand (Hidden on Mobile) */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="hidden lg:flex lg:w-1/2 relative bg-accent overflow-hidden"
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary rounded-full -translate-x-1/2 translate-y-1/2 blur-3xl" />
          </div>

          {/* Background Image */}
          <div
            className="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-20"
            style={{
              backgroundImage: `url("https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?q=80&w=1000")`
            }}
          />

          {/* Content */}
          <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="size-10">
                <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M13.8261 17.4264C16.7203 18.1174 20.2244 18.5217 24 18.5217C27.7756 18.5217 31.2797 18.1174 34.1739 17.4264C36.9144 16.7722 39.9967 15.2331 41.3563 14.1648L24.8486 40.6391C24.4571 41.267 23.5429 41.267 23.1514 40.6391L6.64374 14.1648C8.00331 15.2331 11.0856 16.7722 13.8261 17.4264Z"
                    fill="white"
                  />
                </svg>
              </div>
              <div className="flex flex-col group-hover:opacity-80 transition-opacity">
                <h1 className="text-2xl font-bold font-poppins">RyderCupFriends</h1>
                <span className="text-sm font-semibold text-white/90 -mt-1">RCF</span>
              </div>
            </Link>

            {/* Middle Content */}
            <div className="space-y-6">
              <div>
                <h2 className="text-4xl font-black font-poppins mb-4 leading-tight">
                  {t('register.heroTitle')}
                </h2>
                <p className="text-xl text-white/90 leading-relaxed">
                  {t('register.heroSubtitle')}
                </p>
              </div>

              {/* Benefits */}
              <div className="space-y-4 mt-8">
                {[
                  { icon: '⚡', text: t('register.benefits.quickSetup') },
                  { icon: '🎯', text: t('register.benefits.fairHandicap') },
                  { icon: '📱', text: t('register.benefits.mobileFriendly') },
                  { icon: '🤝', text: t('register.benefits.friendships') }
                ].map((item, idx) => (
                  <motion.div
                    key={item.text}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + idx * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center text-xl">
                      {item.icon}
                    </div>
                    <span className="text-white/90">{item.text}</span>
                  </motion.div>
                ))}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6 pt-8 mt-8 border-t border-white/20">
                <div>
                  <div className="text-3xl font-bold font-poppins">500+</div>
                  <div className="text-sm text-white/70 mt-1">{t('register.stats.tournaments')}</div>
                </div>
                <div>
                  <div className="text-3xl font-bold font-poppins">2K+</div>
                  <div className="text-sm text-white/70 mt-1">{t('register.stats.players')}</div>
                </div>
                <div>
                  <div className="text-3xl font-bold font-poppins">98%</div>
                  <div className="text-sm text-white/70 mt-1">{t('register.stats.satisfaction')}</div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-white/70 text-sm">
              © 2024 RyderCupFriends - RCF
            </div>
          </div>
        </motion.div>

        {/* Right Side - Register Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >

            {/* Mobile Logo */}
            <Link to="/" className="flex lg:hidden items-center gap-3 mb-8 justify-center group">
              <div className="size-10">
                <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M13.8261 17.4264C16.7203 18.1174 20.2244 18.5217 24 18.5217C27.7756 18.5217 31.2797 18.1174 34.1739 17.4264C36.9144 16.7722 39.9967 15.2331 41.3563 14.1648L24.8486 40.6391C24.4571 41.267 23.5429 41.267 23.1514 40.6391L6.64374 14.1648C8.00331 15.2331 11.0856 16.7722 13.8261 17.4264Z"
                    fill="#2d7b3e"
                  />
                </svg>
              </div>
              <div className="flex flex-col group-hover:opacity-80 transition-opacity">
                <h1 className="text-2xl font-bold font-poppins text-gray-900">RyderCupFriends</h1>
                <span className="text-sm font-semibold text-primary -mt-1">RCF</span>
              </div>
            </Link>

            {/* Form Card */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">

              {/* Header */}
              <div className="mb-8">
                <h2 className="text-3xl font-black text-gray-900 font-poppins mb-2">
                  {t('register.title')}
                </h2>
                <p className="text-gray-600">
                  {t('register.subtitle')}
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">

                {/* Name Fields - Side by Side */}
                <div className="grid grid-cols-2 gap-4">
                  {/* First Name */}
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('register.firstNameLabel')}
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      name="firstName"
                      placeholder={t('register.firstNamePlaceholder')}
                      value={formData.firstName}
                      onChange={handleChange}
                      maxLength={100}
                      className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                        errors.firstName
                          ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                          : 'border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20'
                      } outline-none text-gray-900 placeholder:text-gray-400`}
                      disabled={isLoading}
                    />
                    {errors.firstName && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-500 text-xs mt-2 flex items-center gap-1"
                      >
                        <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.firstName}
                      </motion.p>
                    )}
                  </div>

                  {/* Last Name */}
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('register.lastNameLabel')}
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      name="lastName"
                      placeholder={t('register.lastNamePlaceholder')}
                      value={formData.lastName}
                      onChange={handleChange}
                      maxLength={100}
                      className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                        errors.lastName
                          ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                          : 'border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20'
                      } outline-none text-gray-900 placeholder:text-gray-400`}
                      disabled={isLoading}
                    />
                    {errors.lastName && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-500 text-xs mt-2 flex items-center gap-1"
                      >
                        <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.lastName}
                      </motion.p>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('register.emailLabel')}
                  </label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    placeholder={t('register.emailPlaceholder')}
                    value={formData.email}
                    onChange={handleChange}
                    maxLength={254}
                    className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                      errors.email
                        ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                        : 'border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20'
                    } outline-none text-gray-900 placeholder:text-gray-400`}
                    disabled={isLoading}
                  />
                  {errors.email && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-500 text-xs mt-2 flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.email}
                    </motion.p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('register.passwordLabel')}
                  </label>
                  <PasswordInput
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder={t('register.passwordPlaceholder')}
                    maxLength={128}
                    error={!!errors.password}
                    disabled={isLoading}
                    label=""
                    autoComplete="new-password"
                    className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                      errors.password
                        ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                        : 'border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20'
                    } outline-none`}
                  />
                  {errors.password && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-500 text-xs mt-2 flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.password}
                    </motion.p>
                  )}
                  {/* Password Requirements */}
                  <PasswordRequirements password={formData.password} />
                  {/* Password Strength Meter */}
                  <PasswordStrengthMeter password={formData.password} />
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('register.confirmPasswordLabel')}
                  </label>
                  <PasswordInput
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder={t('register.confirmPasswordPlaceholder')}
                    maxLength={128}
                    error={!!errors.confirmPassword}
                    disabled={isLoading}
                    label=""
                    autoComplete="new-password"
                    className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                      errors.confirmPassword
                        ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                        : 'border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20'
                    } outline-none`}
                  />
                  {errors.confirmPassword && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-500 text-xs mt-2 flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.confirmPassword}
                    </motion.p>
                  )}
                </div>

                {/* Nationality (Optional) */}
                <div>
                  <label htmlFor="countryCode" className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('register.countryLabel')} <span className="text-gray-400 font-normal">{t('register.countryOptional')}</span>
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
                      disabled={isLoading || isLoadingCountries}
                    >
                      <option value="">{t('register.countryPlaceholder')}</option>
                      {countries.map((country) => (
                        <option key={country.code} value={country.code}>
                          {formatCountryName(country, i18n.language)}
                        </option>
                      ))}
                    </select>
                    {/* Icono de dropdown personalizado */}
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    {/* Mostrar bandera del país seleccionado */}
                    {formData.countryCode && (
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <CountryFlag countryCode={formData.countryCode} style={{ width: '24px', height: 'auto' }} />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    {t('register.countryHint')}
                  </p>
                </div>

                {/* Terms & Conditions */}
                <div className="flex items-start gap-2 pt-2">
                  <div className="flex items-center h-5">
                    <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-xs text-gray-600">
                    {t('register.termsPrefix')}{' '}
                    <a href="#terms" className="text-primary hover:text-primary-600 font-semibold">
                      {t('register.termsLink')}
                    </a>
                    {' '}{t('register.termsAnd')}{' '}
                    <a href="#privacy" className="text-primary hover:text-primary-600 font-semibold">
                      {t('register.privacyLink')}
                    </a>
                  </p>
                </div>

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  disabled={isLoading}
                  whileHover={{ scale: isLoading ? 1 : 1.02 }}
                  whileTap={{ scale: isLoading ? 1 : 0.98 }}
                  className={`w-full py-3.5 rounded-lg font-bold text-white transition-all duration-300 shadow-lg ${
                    isLoading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-accent hover:bg-accent-600 hover:shadow-xl'
                  }`}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t('register.creatingAccount')}
                    </span>
                  ) : (
                    t('register.createAccountButton')
                  )}
                </motion.button>

              </form>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">or</span>
                </div>
              </div>

              {/* Login Link */}
              <div className="text-center">
                <p className="text-gray-600 text-sm">
                  {t('register.alreadyHaveAccount')}{' '}
                  <Link
                    to="/login"
                    className="font-semibold text-primary hover:text-primary-600 transition-colors"
                  >
                    {t('register.signInLink')}
                  </Link>
                </p>
              </div>

            </div>

            {/* Back to Home */}
            <Link
              to="/"
              className="flex items-center justify-center gap-2 mt-6 text-gray-600 hover:text-primary transition-colors group"
            >
              <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="text-sm font-medium">{t('register.backToHome')}</span>
            </Link>

          </motion.div>
        </div>

      </div>
    </div>
  );
};

export default Register;
