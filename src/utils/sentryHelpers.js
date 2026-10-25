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
 * Establece el usuario de la sesión en Sentry: solo su id (25 oct 2026).
 *
 * Sentry es un tercero y para depurar basta con el id, que se cruza con la base
 * de datos si hace falta. Antes salían el correo, el nombre, el país y el
 * hándicap en cada evento, y el correo también en las migas por un
 * `console.log`: Sentry recoge la consola.
 *
 * @param {{ id?: string } | null} user - El usuario de la sesión
 */
export const setUserContext = (user) => {
  Sentry.setUser(user?.id ? { id: user.id } : null);
};

/**
 * Limpia el contexto del usuario (útil en logout)
 *
 * @example
 * clearUserContext(); // Al hacer logout
 */
export const clearUserContext = () => {
  Sentry.setUser(null);
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
