import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import customToast from '../utils/toast';
import { useTranslation } from 'react-i18next';
import { validateEmail } from '../utils/validation';
import { requestPasswordResetUseCase } from '../composition';

const ForgotPassword = () => {
  const { t } = useTranslation('auth');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setEmail(e.target.value);
    if (errors.email) {
      setErrors({});
    }
  };

  const validateForm = () => {
    const newErrors = {};

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      newErrors.email = emailValidation.message;
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
      await requestPasswordResetUseCase.execute(email);

      customToast.success(t('forgotPassword.success'));
      setSubmitted(true);

    } catch (error) {
      console.error('Forgot password error:', error);

      // Manejo de rate limiting (429)
      if (error.message.includes('Rate limit') || error.message.includes('Too many')) {
        customToast.error(t('forgotPassword.rateLimitError'), {
          duration: 6000,
        });
      } else {
        customToast.error(error.message || t('forgotPassword.error'), {
          duration: 5000,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Vista después de enviar el email
  if (submitted) {
    return (
      <div className="relative flex min-h-screen w-full bg-white">
        <div className="flex w-full">

          {/* Left Side - Hero (igual que Login) */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary via-primary-600 to-primary-700 overflow-hidden"
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
              <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent rounded-full translate-x-1/2 translate-y-1/2 blur-3xl" />
            </div>

            {/* Background Image */}
            <div
              className="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-20"
              style={{
                backgroundImage: `url("https://images.unsplash.com/photo-1535131749006-b7f58c99034b?q=80&w=2000")`
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
                  <span className="text-sm font-semibold text-accent -mt-1">RCF</span>
                </div>
              </Link>

              {/* Middle Content */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-4xl font-black font-poppins mb-4 leading-tight">
                    {t('forgotPassword.checkEmailTitle')}
                  </h2>
                  <p className="text-xl text-white/90 leading-relaxed">
                    {t('forgotPassword.checkEmailSubtitle')}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="text-white/70 text-sm">
                © 2024 RyderCupFriends - RCF
              </div>
            </div>
          </motion.div>

          {/* Right Side - Success Message */}
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

              {/* Success Card */}
              <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">

                {/* Icon */}
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                    </svg>
                  </div>
                </div>

                {/* Header */}
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-black text-gray-900 font-poppins mb-3">
                    {t('forgotPassword.emailSentTitle')}
                  </h2>
                  <p className="text-gray-600 leading-relaxed">
                    {t('forgotPassword.emailSentMessage')} <strong className="text-gray-900">{email}</strong>,
                    {' '}{t('forgotPassword.emailSentSuffix')}
                  </p>
                </div>

                {/* Instructions */}
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg mb-6">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div className="text-sm text-blue-700">
                      <p className="font-medium mb-1">{t('forgotPassword.nextStepsTitle')}</p>
                      <ul className="list-disc list-inside space-y-1 text-blue-600">
                        <li>{t('forgotPassword.nextStep1')}</li>
                        <li>{t('forgotPassword.nextStep2')}</li>
                        <li>{t('forgotPassword.nextStep3')}</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Warning */}
                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg mb-6">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-yellow-700">
                      <span className="font-medium">{t('forgotPassword.securityWarning')}</span> {t('forgotPassword.securityWarningMessage')}
                    </p>
                  </div>
                </div>

                {/* Back to Login */}
                <Link
                  to="/login"
                  className="block w-full py-3 text-center rounded-lg font-semibold text-primary border-2 border-primary hover:bg-primary hover:text-white transition-all duration-300"
                >
                  {t('forgotPassword.backToLogin')}
                </Link>

              </div>

              {/* Resend Link */}
              <div className="text-center mt-6">
                <button
                  onClick={() => setSubmitted(false)}
                  className="text-sm text-gray-600 hover:text-primary transition-colors font-medium"
                >
                  {t('forgotPassword.didntReceive')}
                </button>
              </div>

            </motion.div>
          </div>

        </div>
      </div>
    );
  }

  // Vista del formulario (continúa en el siguiente fragmento)
  return (
    <div className="relative flex min-h-screen w-full bg-white">
      <div className="flex w-full">

        {/* Left Side - Hero */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary via-primary-600 to-primary-700 overflow-hidden"
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent rounded-full translate-x-1/2 translate-y-1/2 blur-3xl" />
          </div>

          {/* Background Image */}
          <div
            className="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-20"
            style={{
              backgroundImage: `url("https://images.unsplash.com/photo-1535131749006-b7f58c99034b?q=80&w=2000")`
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
                <span className="text-sm font-semibold text-accent -mt-1">RCF</span>
              </div>
            </Link>

            {/* Middle Content */}
            <div className="space-y-6">
              <div>
                <h2 className="text-4xl font-black font-poppins mb-4 leading-tight">
                  {t('forgotPassword.heroTitle')}
                </h2>
                <p className="text-xl text-white/90 leading-relaxed">
                  {t('forgotPassword.heroSubtitle')}
                </p>
              </div>

              {/* Security Features */}
              <div className="space-y-4 mt-8">
                {[
                  { icon: '🔒', text: t('forgotPassword.features.secure') },
                  { icon: '⏱️', text: t('forgotPassword.features.expires') },
                  { icon: '✉️', text: t('forgotPassword.features.checkSpam') },
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
            </div>

            {/* Footer */}
            <div className="text-white/70 text-sm">
              © 2024 RyderCupFriends - RCF
            </div>
          </div>
        </motion.div>

        {/* Right Side - Form */}
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
                  {t('forgotPassword.title')}
                </h2>
                <p className="text-gray-600">
                  {t('forgotPassword.subtitle')}
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('forgotPassword.emailLabel')}
                  </label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    placeholder={t('forgotPassword.emailPlaceholder')}
                    value={email}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                      errors.email
                        ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                        : 'border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20'
                    } outline-none text-gray-900 placeholder:text-gray-400`}
                    disabled={isLoading}
                    autoFocus
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

                {/* Rate Limit Notice */}
                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded-lg">
                  <p className="text-xs text-yellow-700 flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    <span>{t('forgotPassword.rateLimitNotice')}</span>
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
                      : 'bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700 hover:shadow-xl'
                  }`}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t('forgotPassword.sending')}
                    </span>
                  ) : (
                    t('forgotPassword.sendLinkButton')
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

              {/* Back to Login */}
              <div className="text-center">
                <Link
                  to="/login"
                  className="text-sm font-semibold text-primary hover:text-primary-600 transition-colors"
                >
                  {t('forgotPassword.backToLogin')}
                </Link>
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
              <span className="text-sm font-medium">{t('forgotPassword.backToHome')}</span>
            </Link>

          </motion.div>
        </div>

      </div>
    </div>
  );
};

export default ForgotPassword;
