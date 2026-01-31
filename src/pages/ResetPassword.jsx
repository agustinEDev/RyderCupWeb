import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import customToast from '../utils/toast';
import { useTranslation } from 'react-i18next';
import { validatePassword } from '../utils/validation';
import PasswordInput from '../components/ui/PasswordInput';
import PasswordStrengthIndicator from '../components/ui/PasswordStrengthIndicator';
import {
  validateResetTokenUseCase,
  resetPasswordUseCase,
} from '../composition';

/**
 * ResetPasswordPage Component
 *
 * Permite al usuario cambiar su contraseña usando un token de reset recibido por email.
 *
 * Flujo:
 * 1. Usuario llega con token en URL: /reset-password/:token o /reset-password?token=xxx
 * 2. Pre-validación automática del token (useEffect)
 * 3. Si token válido: muestra formulario
 * 4. Si token inválido/expirado: muestra error y link a /forgot-password
 * 5. Usuario ingresa nueva contraseña (2 inputs: nueva + confirmar)
 * 6. Validación OWASP: 12+ chars, complejidad
 * 7. Submit → resetPasswordUseCase → redirección a /login
 *
 * Seguridad:
 * - Token 256-bit del backend
 * - Expiración 24h
 * - Single-use token (backend invalida tras uso exitoso)
 * - Backend invalida TODAS las sesiones activas tras reset
 * - Password policy OWASP ASVS V2.1 (12+ chars)
 * - Rate limiting 3 intentos/hora (backend)
 */
const ResetPassword = () => {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const params = useParams();

  // Soportar ambos formatos: /reset-password/:token y /reset-password?token=xxx
  const token = params.token || searchParams.get('token');

  // Estados del token
  const [tokenState, setTokenState] = useState('validating'); // 'validating' | 'valid' | 'invalid'
  const [tokenMessage, setTokenMessage] = useState('');

  // Estados del formulario
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

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

  /**
   * Pre-validación del token al montar el componente
   * Mejora UX: usuario sabe si el token es válido antes de llenar el formulario
   */
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setTokenState('invalid');
        setTokenMessage(t('resetPassword.tokenInvalidMessage'));
        return;
      }

      try {
        const result = await validateResetTokenUseCase.execute(token);

        if (result.valid) {
          setTokenState('valid');
          setTokenMessage(result.message);
        } else {
          setTokenState('invalid');
          setTokenMessage(result.message);
        }
      } catch (error) {
        console.error('Token validation error:', error);
        setTokenState('invalid');
        setTokenMessage(
          error.message || t('resetPassword.tokenInvalidMessage')
        );
      }
    };

    validateToken();
  }, [token, t]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Limpiar error al escribir
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Validación 1: Nueva contraseña con requisitos OWASP
    const passwordValidation = validatePassword(formData.newPassword);
    if (!passwordValidation.isValid) {
      newErrors.newPassword = passwordValidation.message;
    }

    // Validación 2: Confirmación de contraseña
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t('validation.confirmPasswordRequired', { ns: 'auth' });
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = t('validation.passwordsDoNotMatch', { ns: 'auth' });
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
      await resetPasswordUseCase.execute(token, formData.newPassword);

      customToast.success(t('resetPassword.success'), {
        duration: 5000,
      });

      // Redireccionar a login tras 2 segundos
      // Guardar timer ID para cleanup (prevenir memory leak)
      navigationTimerRef.current = setTimeout(() => {
        navigate('/login', {
          replace: true,
          state: { message: t('resetPassword.successMessage') },
        });
      }, 2000);
    } catch (error) {
      console.error('Reset password error:', error);

      // Manejo de errores específicos
      if (error.message.includes('Rate limit') || error.message.includes('Too many')) {
        customToast.error(t('resetPassword.rateLimitError'), {
          duration: 6000,
        });
      } else if (error.message.includes('invalid') || error.message.includes('expired')) {
        customToast.error(t('resetPassword.tokenInvalidMessage'), {
          duration: 6000,
        });
        // Marcar token como inválido para mostrar UI de error
        setTokenState('invalid');
        setTokenMessage(error.message);
      } else {
        customToast.error(error.message || t('resetPassword.error'), {
          duration: 5000,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * UI: Loading State (validando token)
   */
  if (tokenState === 'validating') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
        >
          <div className="flex justify-center mb-4">
            <svg
              className="animate-spin h-12 w-12 text-primary"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t('resetPassword.validatingToken')}</h2>
          <p className="text-gray-600">{t('resetPassword.validatingMessage')}</p>
        </motion.div>
      </div>
    );
  }

  /**
   * UI: Invalid Token State
   */
  if (tokenState === 'invalid') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full"
        >
          {/* Error Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          </div>

          {/* Error Message */}
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-3">{t('resetPassword.invalidTokenTitle')}</h2>
          <p className="text-gray-600 text-center mb-6">{tokenMessage}</p>

          {/* Actions */}
          <div className="space-y-3">
            <Link
              to="/forgot-password"
              className="block w-full py-3 px-4 bg-primary hover:bg-primary-600 text-white font-semibold rounded-lg transition-colors text-center"
            >
              {t('resetPassword.requestNewLink')}
            </Link>
            <Link
              to="/login"
              className="block w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors text-center"
            >
              {t('resetPassword.backToLoginButton')}
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  /**
   * UI: Valid Token - Reset Password Form
   */
  return (
    <div className="relative flex min-h-screen w-full bg-white">
      <div className="flex w-full">
        {/* Left Side - Hero Image/Brand (Hidden on Mobile) */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="hidden lg:flex lg:w-1/2 relative bg-primary overflow-hidden"
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
              backgroundImage: `url("https://images.unsplash.com/photo-1535131749006-b7f58c99034b?q=80&w=2000")`,
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
                  {t('resetPassword.heroTitle')}
                </h2>
                <p className="text-xl text-white/90 leading-relaxed">
                  {t('resetPassword.heroSubtitle')}
                </p>
              </div>

              {/* Security Tips */}
              <div className="space-y-4 mt-8">
                {[
                  { icon: '🔒', text: t('resetPassword.securityTips.tip1') },
                  { icon: '🔤', text: t('resetPassword.securityTips.tip2') },
                  { icon: '🔢', text: t('resetPassword.securityTips.tip3') },
                  { icon: '⚡', text: t('resetPassword.securityTips.tip4') },
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
            <div className="text-white/70 text-sm">© 2024 RyderCupFriends - RCF</div>
          </div>
        </motion.div>

        {/* Right Side - Reset Form */}
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
              <div className="mb-6">
                <h2 className="text-3xl font-black text-gray-900 font-poppins mb-2">
                  {t('resetPassword.title')}
                </h2>
                <p className="text-gray-600">
                  {t('resetPassword.subtitle')}
                </p>
              </div>

              {/* Password Requirements */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-semibold text-blue-900 mb-2">{t('resetPassword.requirementsTitle')}</p>
                <ul className="space-y-1 text-sm text-blue-700">
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {t('resetPassword.requirement1')}
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {t('resetPassword.requirement2')}
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {t('resetPassword.requirement3')}
                  </li>
                </ul>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* New Password */}
                <div>
                  <PasswordInput
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    placeholder={t('resetPassword.newPasswordPlaceholder')}
                    error={!!errors.newPassword}
                    disabled={isLoading}
                    label={t('resetPassword.newPasswordLabel')}
                    autoComplete="new-password"
                    className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                      errors.newPassword
                        ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                        : 'border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20'
                    } outline-none`}
                  />

                  {/* Password Strength Indicator */}
                  {formData.newPassword && <PasswordStrengthIndicator password={formData.newPassword} />}

                  {errors.newPassword && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-500 text-xs mt-2 flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {errors.newPassword}
                    </motion.p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <PasswordInput
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder={t('resetPassword.confirmPasswordPlaceholder')}
                    error={!!errors.confirmPassword}
                    disabled={isLoading}
                    label={t('resetPassword.confirmPasswordLabel')}
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
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {errors.confirmPassword}
                    </motion.p>
                  )}
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
                      : 'bg-primary hover:bg-primary-600 hover:shadow-xl'
                  }`}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="animate-spin h-5 w-5"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      {t('resetPassword.resetting')}
                    </span>
                  ) : (
                    t('resetPassword.resetButton')
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
                <p className="text-gray-600 text-sm">
                  {t('resetPassword.rememberPassword')}{' '}
                  <Link
                    to="/login"
                    className="font-semibold text-primary hover:text-primary-600 transition-colors"
                  >
                    {t('resetPassword.backToLogin')}
                  </Link>
                </p>
              </div>
            </div>

            {/* Back to Home */}
            <Link
              to="/"
              className="flex items-center justify-center gap-2 mt-6 text-gray-600 hover:text-primary transition-colors group"
            >
              <svg
                className="w-4 h-4 group-hover:-translate-x-1 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              <span className="text-sm font-medium">{t('resetPassword.backToHome')}</span>
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
