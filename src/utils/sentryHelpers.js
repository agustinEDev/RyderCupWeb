/**
 * Sentry Helpers - Utilidades para enriquecer el contexto de errores y eventos
 *
 * Este archivo contiene funciones auxiliares para trabajar con Sentry:
 * - Configuración de contexto de usuario
 * - Tags personalizados por módulo
 * - Breadcrumbs para seguimiento de acciones
 * - Contextos de negocio (Business Context)
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
// TAGS - Etiquetas Personalizadas
// ============================================

/**
 * Establece tags personalizados por módulo/feature
 *
 * Los tags ayudan a filtrar errores en Sentry por categorías específicas
 *
 * @param {Object} tags - Objeto con tags clave-valor
 *
 * @example
 * setModuleTags({ module: 'Auth', action: 'Login', feature: 'EmailVerification' });
 */
export const setModuleTags = (tags) => {
  Object.entries(tags).forEach(([key, value]) => {
    Sentry.setTag(key, value);
  });
};

/**
 * Tags predefinidos por módulo de la aplicación
 */
export const ModuleTags = {
  AUTH: { module: 'Auth', bounded_context: 'User' },
  PROFILE: { module: 'Profile', bounded_context: 'User' },
  COMPETITIONS: { module: 'Competitions', bounded_context: 'Competition' },
  ENROLLMENTS: { module: 'Enrollments', bounded_context: 'Competition' },
  HANDICAPS: { module: 'Handicaps', bounded_context: 'User' },
  BROWSE: { module: 'Browse', bounded_context: 'Competition' },
};

/**
 * Establece tags de módulo usando constantes predefinidas
 *
 * @param {string} moduleName - Nombre del módulo (AUTH, PROFILE, COMPETITIONS, etc.)
 * @param {string} action - Acción específica (Login, Register, Create, etc.)
 *
 * @example
 * setModuleContext('AUTH', 'Login');
 * setModuleContext('COMPETITIONS', 'Create');
 */
export const setModuleContext = (moduleName, action = null) => {
  const moduleTags = ModuleTags[moduleName];

  if (!moduleTags) {
    console.warn(`⚠️ Sentry: Unknown module "${moduleName}"`);
    return;
  }

  const tags = { ...moduleTags };
  if (action) {
    tags.action = action;
  }

  setModuleTags(tags);
  console.log(`🏷️ Sentry: Module context set - ${moduleName}${action ? ` (${action})` : ''}`);
};

// ============================================
// BUSINESS CONTEXT - Contexto de Negocio
// ============================================

/**
 * Establece contextos adicionales de negocio
 *
 * Los contextos permiten agregar información estructurada que aparecerá
 * en el panel de Sentry bajo "Additional Data"
 *
 * @param {string} contextName - Nombre del contexto (ej: 'competition', 'enrollment')
 * @param {Object} contextData - Datos del contexto
 *
 * @example
 * setBusinessContext('competition', {
 *   id: 'comp-123',
 *   name: 'Summer Tournament',
 *   status: 'ACTIVE',
 *   maxPlayers: 20,  // Domain property name
 *   enrolled_count: 15
 * });
 */
export const setBusinessContext = (contextName, contextData) => {
  Sentry.setContext(contextName, contextData);
  console.log(`📊 Sentry: Business context set - ${contextName}`, contextData);
};

/**
 * Limpia un contexto específico
 *
 * @param {string} contextName - Nombre del contexto a limpiar
 */
export const clearBusinessContext = (contextName) => {
  Sentry.setContext(contextName, null);
  console.log(`🧹 Sentry: Business context cleared - ${contextName}`);
};

// ============================================
// BREADCRUMBS - Migas de Pan (Historial de Acciones)
// ============================================

/**
 * Agrega un breadcrumb personalizado para seguimiento de acciones del usuario
 *
 * Los breadcrumbs son como "migas de pan" que muestran el historial
 * de acciones antes de que ocurra un error
 *
 * @param {Object} breadcrumb - Objeto de breadcrumb
 * @param {string} breadcrumb.category - Categoría (ui, navigation, http, auth, etc.)
 * @param {string} breadcrumb.message - Mensaje descriptivo
 * @param {string} breadcrumb.level - Nivel (info, warning, error, debug)
 * @param {Object} breadcrumb.data - Datos adicionales (opcional)
 *
 * @example
 * addBreadcrumb({
 *   category: 'auth',
 *   message: 'User attempted login',
 *   level: 'info',
 *   data: { email: 'user@example.com' }
 * });
 */
export const addBreadcrumb = (breadcrumb) => {
  Sentry.addBreadcrumb({
    ...breadcrumb,
    timestamp: Date.now() / 1000, // Sentry requiere timestamp en segundos
  });
};

/**
 * Breadcrumb para navegación entre páginas
 *
 * @param {string} from - Página anterior
 * @param {string} to - Página destino
 *
 * @example
 * addNavigationBreadcrumb('/login', '/dashboard');
 */
export const addNavigationBreadcrumb = (from, to) => {
  addBreadcrumb({
    category: 'navigation',
    message: `Navigated from ${from} to ${to}`,
    level: 'info',
    data: { from, to },
  });
};

/**
 * Breadcrumb para acciones de UI (clicks, submits, etc.)
 *
 * @param {string} action - Acción realizada
 * @param {string} target - Elemento objetivo (botón, formulario, etc.)
 * @param {Object} data - Datos adicionales (opcional)
 *
 * @example
 * addUIBreadcrumb('click', 'Submit Login Button');
 * addUIBreadcrumb('submit', 'Registration Form', { email: 'user@example.com' });
 */
export const addUIBreadcrumb = (action, target, data = {}) => {
  addBreadcrumb({
    category: 'ui',
    message: `User ${action} on ${target}`,
    level: 'info',
    data,
  });
};

/**
 * Breadcrumb para llamadas HTTP (API requests)
 *
 * @param {string} method - Método HTTP (GET, POST, PUT, DELETE)
 * @param {string} url - URL del endpoint
 * @param {number} statusCode - Código de respuesta HTTP
 * @param {Object} data - Datos adicionales (opcional)
 *
 * @example
 * addHTTPBreadcrumb('POST', '/api/v1/auth/login', 200);
 * addHTTPBreadcrumb('GET', '/api/v1/competitions', 500, { error: 'Server error' });
 */
export const addHTTPBreadcrumb = (method, url, statusCode, data = {}) => {
  addBreadcrumb({
    category: 'http',
    message: `${method} ${url} - ${statusCode}`,
    level: statusCode >= 400 ? 'error' : 'info',
    data: {
      method,
      url,
      status_code: statusCode,
      ...data,
    },
  });
};

/**
 * Breadcrumb para autenticación (login, logout, register, etc.)
 *
 * @param {string} action - Acción de autenticación
 * @param {boolean} success - Si la acción fue exitosa
 * @param {Object} data - Datos adicionales (opcional)
 *
 * @example
 * addAuthBreadcrumb('login', true, { email: 'user@example.com' });
 * addAuthBreadcrumb('logout', true);
 */
export const addAuthBreadcrumb = (action, success, data = {}) => {
  addBreadcrumb({
    category: 'auth',
    message: `Auth ${action} - ${success ? 'Success' : 'Failed'}`,
    level: success ? 'info' : 'warning',
    data,
  });
};

// ============================================
// ERROR CAPTURE - Captura Manual de Errores
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

/**
 * Captura un mensaje informativo (no error)
 *
 * @param {string} message - Mensaje a reportar
 * @param {string} level - Nivel (info, warning, error)
 * @param {Object} extra - Datos adicionales
 *
 * @example
 * captureMessage('User completed onboarding', 'info', { user_id: '123' });
 */
export const captureMessage = (message, level = 'info', extra = {}) => {
  Sentry.withScope((scope) => {
    Object.entries(extra).forEach(([key, value]) => {
      scope.setExtra(key, value);
    });
    Sentry.captureMessage(message, level);
  });
};

// ============================================
// PERFORMANCE MONITORING - Transacciones Personalizadas
// ============================================

/**
 * ⚠️ DEPRECATED: startTransaction was removed in Sentry 10
 *
 * Sentry 10 uses automatic performance monitoring via browserTracingIntegration.
 * For manual instrumentation, use Sentry.startSpan() instead.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/react/performance/instrumentation/custom-instrumentation/
 *
 * Migration example:
 * ```
 * // Old (Sentry 7):
 * const transaction = Sentry.startTransaction({ name: 'myTransaction' });
 * transaction.finish();
 *
 * // New (Sentry 10):
 * Sentry.startSpan({ name: 'mySpan', op: 'task' }, async (span) => {
 *   // ... do work ...
 * });
 * ```
 */

// Commented out deprecated functions (not used in codebase)
// export const startTransaction = (name, op = 'task') => {
//   return Sentry.startTransaction({ name, op });
// };

// export const measurePerformance = async (transactionName, asyncFn) => {
//   const transaction = startTransaction(transactionName);
//   try {
//     const result = await asyncFn();
//     transaction.setStatus('ok');
//     return result;
//   } catch (error) {
//     transaction.setStatus('internal_error');
//     throw error;
//   } finally {
//     transaction.finish();
//   }
// };

// ============================================
// HELPERS PARA FILTRAR DATOS SENSIBLES
// ============================================

/**
 * Sanitiza un objeto removiendo campos sensibles
 *
 * @param {Object} obj - Objeto a sanitizar
 * @param {Array<string>} sensitiveFields - Campos a remover
 * @returns {Object} - Objeto sanitizado
 *
 * @example
 * const sanitized = sanitizeSensitiveData(
 *   { email: 'user@example.com', password: '123456', token: 'abc' },
 *   ['password', 'token']
 * );
 * // { email: 'user@example.com' }
 */
export const sanitizeSensitiveData = (obj, sensitiveFields = ['password', 'token', 'access_token', 'refresh_token']) => {
  const sanitized = { ...obj };

  sensitiveFields.forEach(field => {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
};

/**
 * Parametros de query que no pueden salir hacia Sentry.
 *
 * `lat`/`lon` son la posicion de quien busca campos cerca: se redondean en
 * origen (ver `utils/geo.js`), pero "este barrio" repetido en varias sesiones
 * grabadas sigue siendo un dato que Sentry no necesita (FE #385).
 */
const SENSITIVE_QUERY_PARAMS = ['token', 'access_token', 'refresh_token', 'lat', 'lon'];

/**
 * Redacta parametros sensibles de una URL, dejandola legible para depurar.
 *
 * Trabaja sobre el texto y no sobre `URL`, porque aqui llegan tanto URLs
 * absolutas como rutas relativas, y `new URL('/api/...')` lanza.
 *
 * @param {string} url
 * @returns {string} La URL con los valores sensibles como [REDACTED]
 *
 * @example
 * scrubUrl('/api/v1/golf-courses?lat=40.417&lon=-3.704')
 * // '/api/v1/golf-courses?lat=[REDACTED]&lon=[REDACTED]'
 */
export const scrubUrl = (url) => {
  if (typeof url !== 'string' || url === '') return url;

  return SENSITIVE_QUERY_PARAMS.reduce(
    (scrubbed, param) =>
      scrubbed.replace(new RegExp(`([?&]${param}=)[^&#]*`, 'gi'), '$1[REDACTED]'),
    url
  );
};

// ============================================
// EXPORTS
// ============================================

export default {
  // User Context
  setUserContext,
  clearUserContext,

  // Tags
  setModuleTags,
  setModuleContext,
  ModuleTags,

  // Business Context
  setBusinessContext,
  clearBusinessContext,

  // Breadcrumbs
  addBreadcrumb,
  addNavigationBreadcrumb,
  addUIBreadcrumb,
  addHTTPBreadcrumb,
  addAuthBreadcrumb,

  // Error Capture
  captureError,
  captureMessage,

  // Performance (deprecated in Sentry 10 - use Sentry.startSpan instead)
  // startTransaction,
  // measurePerformance,

  // Utilities
  sanitizeSensitiveData,
  scrubUrl,
};
