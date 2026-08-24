import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import customToast from '../../utils/toast';
import { validateEmail, checkRateLimit, resetRateLimit } from '../../utils/validation';
import { safeLog, resolvePostAuthTarget } from '../../utils/auth';
import PasswordInput from '../ui/PasswordInput';
import GoogleSignInButton from '../ui/GoogleSignInButton';
import { loginUseCase } from '../../composition';
import { useAuthContext } from '../../hooks/useAuthContext';

/**
 * El acceso con correo y contraseña, con Google debajo: el formulario entero y
 * lo que lleva detrás —validación, límite de intentos, sesión y a dónde se va
 * después—, para que lo compartan las pantallas que dan entrada.
 *
 * Vivía dentro de `Login.jsx` cuando esa era la única, y sale de ahí porque la
 * pantalla de arranque de la aplicación instalada pide lo mismo (FE #465). Un
 * segundo formulario copiado habría duplicado el límite de intentos y el
 * borrado de la contraseña al fallar, que son reglas de seguridad, y esas
 * divergen en silencio.
 *
 * No decide su marco: quien lo use pone alrededor la marca, el titular y la
 * salida que corresponda a su pantalla.
 */
const SignInForm = () => {
  const { t } = useTranslation(['auth', 'common']);
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser, updateCsrfToken } = useAuthContext();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

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

    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      newErrors.email = t(emailValidation.messageKey, emailValidation.messageOptions);
    }

    if (!formData.password) {
      newErrors.password = t('validation.passwordRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const rateLimit = checkRateLimit('login', 5, 300000);
    if (!rateLimit.allowed) {
      customToast.error(t('errors.rateLimitSeconds', { seconds: rateLimit.remainingTime }), {
        duration: 5000,
      });
      return;
    }

    setIsLoading(true);

    try {
      // v1.13.0: LoginUseCase now returns { user, csrfToken }
      const { user: authenticatedUser, csrfToken, needsHandicap } = await loginUseCase.execute(formData.email, formData.password);

      // Update auth context with user and CSRF token
      setUser(authenticatedUser);
      updateCsrfToken(csrfToken);

      if (needsHandicap) {
        localStorage.setItem('needs_handicap', 'true');
      } else {
        localStorage.removeItem('needs_handicap');
      }

      resetRateLimit('login');
      customToast.success(t('login.welcomeMessage', { name: authenticatedUser.firstName }));

      if (!authenticatedUser.emailVerified) {
        safeLog('info', 'Email verification required');
        customToast.info(t('login.verifyEmailMessage'), {
          duration: 5000,
        });
      }

      navigate(resolvePostAuthTarget(location.state?.from?.pathname), { replace: true });

    } catch (error) {
      console.error('Login error:', error);

      // Limpiar el password por seguridad (OWASP A07 - Authentication Failures)
      setFormData(prev => ({
        ...prev,
        password: ''
      }));

      // v1.13.0: Handle Account Lockout (HTTP 423) with special UI treatment
      if (error.message && error.message.includes('Account locked')) {
        customToast.error(error.message, {
          duration: 10000, // Longer duration for important security message
          icon: '🔒',
        });
      } else {
        customToast.error(error.message || t('login.error'), {
          duration: 5000,
        });
      }
    } finally {
      // Tambien al entrar bien: el camino de exito no puede dar por hecho que
      // `navigate` desmonte el formulario. En `Login` hoy lo desmonta, pero este
      // componente esta hecho para montarse en otras pantallas, y en una que
      // siguiera en pie el boton se quedaria desactivado girando para siempre
      setIsLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
            {t('login.emailLabel')}
          </label>
          <input
            id="email"
            type="email"
            name="email"
            placeholder={t('login.emailPlaceholder')}
            value={formData.email}
            onChange={handleChange}
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
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
              {t('login.passwordLabel')}
            </label>
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-primary hover:text-primary-600 transition-colors"
            >
              {t('login.forgotPassword')}
            </Link>
          </div>
          <PasswordInput
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder={t('login.passwordPlaceholder')}
            error={!!errors.password}
            disabled={isLoading}
            label=""
            autoComplete="current-password"
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
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {t('loading', { ns: 'common' })}
            </span>
          ) : (
            t('login.signInButton')
          )}
        </motion.button>

      </form>

      {/* Divider: dos rayas y el texto en medio, en vez de una raya tapada por
          una pastilla con el color del fondo. Aquella solo se veia bien sobre
          blanco, y este formulario esta hecho para montarse en pantallas
          distintas —era el unico punto que daba por supuesto su marco—. */}
      <div className="my-6 flex items-center gap-4">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-sm text-gray-500">{t('google.orDivider')}</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      {/* Google Sign In */}
      <GoogleSignInButton flow="login" disabled={isLoading} />

      {/* Register Link */}
      <div className="text-center mt-6">
        <p className="text-gray-600 text-sm">
          {t('login.noAccount')}{' '}
          <Link
            to="/register"
            className="font-semibold text-primary hover:text-primary-600 transition-colors"
          >
            {t('login.signUpLink')}
          </Link>
        </p>
      </div>
    </>
  );
};

export default SignInForm;
