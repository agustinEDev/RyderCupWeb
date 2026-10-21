/**
 * Sentry Helpers: el usuario de la sesión y la captura manual de errores.
 *
 * Las etiquetas por módulo, los contextos de negocio, los breadcrumbs y el
 * saneado de datos que vivían aquí no los usaba nadie y se quitaron (FE #244).
 * El saneado de URLs vive en `scrubUrl.js`.
 */

import * as Sentry from '@sentry/react';

// ============================================
// USER CONTEXT - Contexto del Usuario
// ============================================

/**
 * Establece el contexto del usuario autenticado en Sentry
 *
 * @param {Object} user - Objeto de usuario con datos personales
 * @param {string} user.id - ID único del usuario
 * @param {string} user.email - Email del usuario
 * @param {string} user.first_name - Nombre del usuario
 * @param {string} user.last_name - Apellido del usuario
 * @param {string} user.country_code - Código de país (opcional)
 * @param {boolean} user.email_verified - Estado de verificación de email
 *
 * @example
 * const user = JSON.parse(localStorage.getItem('user'));
 * setUserContext(user);
 */
export const setUserContext = (user) => {
  if (!user) {
    Sentry.setUser(null); // Limpiar contexto si no hay usuario
    return;
  }

  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: `${user.first_name} ${user.last_name}`,
    // Datos adicionales que aparecerán en el panel de Sentry
    first_name: user.first_name,
    last_name: user.last_name,
    country_code: user.country_code || 'N/A',
    email_verified: user.email_verified,
    handicap: user.handicap || 'N/A',
  });

  console.log('✅ Sentry: User context set', user.email);
};

/**
 * Limpia el contexto del usuario (útil en logout)
 *
 * @example
 * clearUserContext(); // Al hacer logout
 */
export const clearUserContext = () => {
  Sentry.setUser(null);
  console.log('🧹 Sentry: User context cleared');
};

// ============================================
// ERRORES
// ============================================

/**
 * Captura un error manualmente con contexto adicional
 *
 * Útil para errores que no son excepciones pero quieres reportar
 *
 * @param {Error|string} error - Error a capturar
 * @param {Object} context - Contexto adicional
 *
 * @example
 * captureError(new Error('Payment failed'), {
 *   level: 'error',
 *   tags: { module: 'Payments' },
 *   extra: { amount: 100, currency: 'USD' }
 * });
 */
export const captureError = (error, context = {}) => {
  const { level = 'error', tags = {}, extra = {} } = context;

  Sentry.withScope((scope) => {
    scope.setLevel(level);

    // Agregar tags
    Object.entries(tags).forEach(([key, value]) => {
      scope.setTag(key, value);
    });

    // Agregar datos extra
    Object.entries(extra).forEach(([key, value]) => {
      scope.setExtra(key, value);
    });

    // Capturar error
    if (error instanceof Error) {
      Sentry.captureException(error);
    } else {
      Sentry.captureMessage(error, level);
    }
  });
};
