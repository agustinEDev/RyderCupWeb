/**
 * Base API configuration and utilities
 * v1.13.0: Added CSRF Protection for POST/PUT/PATCH/DELETE requests
 */

import { fetchWithTokenRefresh } from '../utils/tokenRefreshInterceptor.js';
import { getCsrfToken } from '../contexts/csrfTokenSync'; // v1.13.0: CSRF Protection
import { handleCsrfLogout } from '../utils/csrfLogout'; // v1.13.0: Centralized CSRF logout
import i18next from 'i18next';

/**
 * La llamada de red, con el aviso de «sin conexión» ya traducido (FE #685).
 *
 * Sin red, `fetch` rechaza con un `TypeError` y el texto del navegador —«Failed
 * to fetch», «Load failed»…—, que 52 toasts enseñaban tal cual. Se cambia por el
 * texto de la app, pero SIGUE SIENDO un `TypeError`: `esFalloDeRed` reconoce así
 * la falta de cobertura, y todo lo que ya la trataba sigue igual. Solo se
 * envuelve la llamada de red, para no disfrazar de cobertura un fallo de otro tipo.
 */
const llamaAlBackend = async (url, config) => {
  try {
    return await fetchWithTokenRefresh(url, config);
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
    throw new TypeError(i18next.t('common:sinConexion.mensaje'), { cause: error });
  }
};

// Prioridad: 1. Runtime config (globalThis.APP_CONFIG) 2. Build-time env 3. Empty string (relative URLs for proxy)
// Si no hay API_URL configurado, usar '' para que las URLs sean relativas (/api/...)
const API_URL = globalThis.APP_CONFIG?.API_BASE_URL || import.meta.env.VITE_API_BASE_URL || '';

/**
 * Get the configured API base URL (for building direct <img>/<a> URLs that
 * don't go through apiRequest, e.g. avatar images).
 * @returns {string}
 */
export const getApiBaseUrl = () => API_URL;

/**
 * Make authenticated API request with httpOnly cookies and automatic token refresh
 * @param {string} endpoint - API endpoint (e.g., '/api/v1/competitions')
 * @param {object} options - Fetch options. Con `topeMs`, la petición se corta
 *   a ese tiempo y se trata como falta de cobertura (FE #624). Cubre la petición
 *   ENTERA: un refresco del token y su reintento, y el cuerpo, que puede
 *   colgarse después de las cabeceras. No se le pasa a `fetch`, y no se combina
 *   con una `signal` propia: si llegan las dos, manda la del tope. Hoy nadie
 *   pasa `signal` a `apiRequest`; quien la necesite tendrá que combinarlas
 * @returns {Promise<any>} - Response data
 *
 * SECURITY:
 * - Authentication uses httpOnly cookies instead of Authorization headers
 * - Browser automatically sends cookies with credentials: 'include'
 * - Protects against XSS attacks (JavaScript cannot access httpOnly cookies)
 * - Automatic token refresh on 401 responses (transparent to caller)
 *
 * AUTOMATIC TOKEN REFRESH:
 * - When access token expires (401), automatically calls /auth/refresh-token
 * - Retries the original request with the new token
 * - Only redirects to login if refresh token also expired
 * - Shares one refresh promise so multiple 401s do not each ask for a refresh
 */
export const apiRequest = async (endpoint, { topeMs, ...options } = {}) => {
  // FormData (file uploads): the browser must set its own Content-Type header
  // with the multipart boundary — setting it manually here would break parsing.
  const isFormData = options.body instanceof FormData;
  const defaultHeaders = isFormData ? {} : {
    'Content-Type': 'application/json',
  };

  // v1.13.0: CSRF Protection - Add X-CSRF-Token header for state-changing requests
  const method = (options.method || 'GET').toUpperCase();
  const requiresCsrf = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  if (requiresCsrf) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      defaultHeaders['X-CSRF-Token'] = csrfToken;
    } else {
      console.warn(`CSRF token missing for ${method} ${endpoint}`);
    }
  }

  // Solo quien lo pide: las demás llamadas esperan a servicios externos lentos
  // —la RFEG, el correo— y cortarlas las daría por fallidas cuando el servidor
  // sí las termina
  const corte = topeMs ? new AbortController() : null;
  const temporizador = corte && setTimeout(() => corte.abort(), topeMs);
  // Lo que se espera compite con el tope, en vez de fiarlo todo a la señal: el
  // interceptor espera al refresco compartido del token sin mirarla, y hay
  // motores —WebKit— que al abortar rechazan con otro error y no con su motivo.
  // Así, al vencer, se rechaza con el motivo pase lo que pase dentro
  const vence = corte && new Promise((_, rechaza) => {
    corte.signal.addEventListener('abort', () => rechaza(corte.signal.reason), { once: true });
  });
  // Si vence mientras se lee el cuerpo de un error, nadie la está esperando
  vence?.catch(() => {});
  const aTiempo = (promesa) => (vence ? Promise.race([promesa, vence]) : promesa);

  const config = {
    ...options,
    ...(corte && { signal: corte.signal }),
    // CRITICAL: credentials: 'include' tells the browser to send httpOnly cookies
    credentials: 'include',
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;

  try {
    // Use interceptor that handles automatic token refresh on 401
    const response = await aTiempo(llamaAlBackend(url, config));

    if (!response.ok) {
      // Try to parse error response from backend
      let errorData = {};
      try {
        errorData = await response.json();
      } catch (jsonError) {
        // If parsing fails, errorData remains empty object
        console.warn('Failed to parse error response as JSON:', jsonError);
      }

      // v1.13.0: Handle CSRF validation errors
      if (response.status === 403 && errorData.error_code === 'CSRF_VALIDATION_FAILED') {
        // Use centralized CSRF logout handler
        handleCsrfLogout(errorData);
        // Throw error after initiating logout (error will be caught by caller).
        // El error va MARCADO: quien vacía la cola de anotaciones necesita
        // distinguirlo de un error sin código cualquiera, porque este vale
        // para toda la sesión y no para una anotación. Sin la marca, cada
        // golpe de la cola disparaba su propio cierre de sesión (FE #521)
        const csrfError = new Error('CSRF validation failed. Please log in again.');
        csrfError.errorCode = 'CSRF_VALIDATION_FAILED';
        throw csrfError;
      }

      // Extract error message with proper fallback chain
      let errorMessage = '';

      if (response.status === 429) {
        // El del backend es técnico y en inglés («Rate limit exceeded: 10 per
        // 1 minute»): se dice el de la app. El `status` sigue en el error, que
        // es por lo que lo reconocen la cola y las pantallas (4 oct 2026)
        errorMessage = i18next.t('common:demasiadasPeticiones');
      } else if (errorData.detail) {
        // FastAPI returns errors in 'detail' field. On 422s it's a list of
        // Pydantic error objects ({ type, loc, msg, input, ctx }) rather than
        // a string — extract `msg` from each so the user sees readable text
        // instead of the raw JSON blob.
        if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail
            .map((err) => err?.msg || JSON.stringify(err))
            .join('; ');
        } else {
          errorMessage = JSON.stringify(errorData.detail);
        }
      } else if (errorData.message) {
        // Some APIs use 'message' field
        errorMessage = errorData.message;
      } else if (errorData.error) {
        // Some APIs use 'error' field
        errorMessage = errorData.error;
      } else {
        // Fallback to HTTP status text
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }

      // Create structured error with status code for better error handling
      const error = new Error(errorMessage);
      error.status = response.status;
      error.statusCode = response.status; // Alias for compatibility
      error.errorCode = errorData.error_code || null;
      // Lo que el servidor manda además del mensaje, para que la pantalla lo
      // diga en su idioma (claves siempre, BE #360)
      error.data = errorData;
      throw error;
    }

    // Handle no content responses (e.g., 204 from DELETE)
    if (response.status === 204) {
      return null;
    }

    // Return parsed JSON
    return await aTiempo(response.json());
  } catch (error) {
    console.error('API Request Error:', error);
    // Se venció el tope: para quien juega, un servidor que no contesta y la
    // falta de cobertura son lo mismo, y así lo trata todo lo que ya la
    // reconoce —la cola guarda el golpe y suelta el cerrojo—. Solo el del
    // propio tope: un error que llegó antes —una sesión caducada en el refresco
    // que se esperaba, o un 409 cuyo cuerpo tardaba— es la respuesta
    if (corte && error === corte.signal.reason) {
      throw new TypeError(i18next.t('common:sinConexion.mensaje'), { cause: error });
    }
    throw error;
  } finally {
    clearTimeout(temporizador);
  }
};

export default apiRequest;
