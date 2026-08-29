/**
 * Token Refresh Interceptor
 *
 * Automatically handles token refresh when access tokens expire (401 responses).
 * Uses httpOnly cookies for secure token management.
 *
 * Security Features:
 * - Prevents multiple simultaneous refresh attempts with a request queue
 * - Automatically retries failed requests after refreshing
 * - Handles refresh token expiration with automatic logout
 * - Uses httpOnly cookies (XSS protection)
 * - v1.13.0: Updates CSRF token after refresh
 *
 * @module tokenRefreshInterceptor
 */

import { sinSesionEnRutaPublica } from './rutasPublicas';


import { setCsrfTokenGlobal } from '../contexts/csrfTokenSync'; // v1.13.0: CSRF Protection
import { apuntaRespuestaDelServidor, apuntaFalloDeRed } from '../services/estadoDeConexion';

/**
 * Si un error viene de que la petición no llegó a completarse.
 *
 * Un `fetch` que no sale del dispositivo rechaza con `TypeError`, y no trae ni
 * respuesta ni estado. No basta con mirar que falten esos dos campos: por aquí
 * pasan también errores propios —el `Redirect timeout` de la revocación de
 * dispositivo, un fallo de programación dentro del `try`— y darlos por falta de
 * cobertura declararía la aplicación entera sin conexión sin motivo.
 */
const esFalloDeRed = (error) =>
  error instanceof TypeError && !error?.response && !error?.status;
import {
  isDeviceRevoked,
  isSessionExpired,
  handleDeviceRevocationLogout,
  handleSessionExpiredLogout
} from './deviceRevocationLogout'; // v1.13.1: Device Revocation, v2.0.4: Separated expiration

/**
 * Si queda sesion guardada. Va envuelto porque `localStorage` LANZA en varios
 * sitios reales —Safari bloqueando cookies, un WebView incrustado, politicas de
 * empresa— y esto vive dentro de una funcion cuyo `catch` relanza: sin la
 * envoltura, cualquier 401 dejaria de ser una respuesta y pasaria a ser una
 * excepcion, que acaba echando al usuario a `/login`.
 */
const hayUsuarioGuardado = () => {
  try {
    return Boolean(localStorage.getItem('user'));
  } catch {
    return false;
  }
};

const API_URL = globalThis.APP_CONFIG?.API_BASE_URL || import.meta.env.VITE_API_BASE_URL || '';

// State management for refresh token flow
let isRefreshing = false;
let failedQueue = [];

// Momento del ultimo refresco con exito en esta carga de la pagina, o null si
// todavia no ha habido ninguno. Lo consulta el refresco proactivo, que de otro
// modo solo puede suponer la edad del token: la cookie es httpOnly y no se
// puede consultar desde JavaScript (FE #392).
let lastRefreshAt = null;

/**
 * @returns {number|null} Timestamp del ultimo refresco con exito, o null si no
 * ha habido ninguno desde que se cargo la pagina.
 */
export const getLastRefreshAt = () => lastRefreshAt;

/**
 * Process the queue of failed requests after successful token refresh
 * @param {Error|null} error - Error if refresh failed, null if successful
 */
const processQueue = (error = null) => {
  failedQueue.forEach(promise => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve();
    }
  });

  failedQueue = [];
};

/**
 * Refresh the access token using the refresh token cookie
 * @returns {Promise<boolean>} - True if refresh was successful
 * @throws {Error} - If refresh fails
 */
export const refreshAccessToken = async () => {
  try {
    console.log('🔄 [TokenRefresh] Attempting to refresh access token...');

    const response = await fetch(`${API_URL}/api/v1/auth/refresh-token`, {
      method: 'POST',
      credentials: 'include', // Critical: sends httpOnly cookies
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // El refresco es una petición más: si contesta, hay conexión
    apuntaRespuestaDelServidor();

    if (!response.ok) {
      console.error('❌ [TokenRefresh] Refresh failed:', response.status, response.statusText);

      // Parse error response to get detail message
      let errorData = {};
      try {
        errorData = await response.json();
      } catch {
        // Ignore JSON parse errors
      }

      // Refresh token expired or invalid
      if (response.status === 401) {
        const error = new Error(errorData.detail || 'Refresh token expired. Please login again.');
        error.response = response;
        error.errorData = errorData;
        throw error;
      }

      const error = new Error('Failed to refresh token');
      error.response = response;
      error.errorData = errorData;
      throw error;
    }

    // v1.13.0: Backend now returns new csrf_token on refresh
    const data = await response.json();
    if (data.csrf_token) {
      setCsrfTokenGlobal(data.csrf_token);
      console.log('✅ [TokenRefresh] CSRF token updated');
    }

    console.log('✅ [TokenRefresh] Access token refreshed successfully');

    // Backend sets new access_token cookie automatically (httpOnly)
    // No need to handle token manually

    lastRefreshAt = Date.now();

    return true;
  } catch (error) {
    // También aquí: `useProactiveTokenRefresh` llama a esta función
    // directamente, sin pasar por el interceptor, así que sin esto un refresco
    // que no sale del móvil no levantaba el aviso de sin conexión
    if (esFalloDeRed(error)) {
      apuntaFalloDeRed();
    }
    console.error('❌ [TokenRefresh] Error refreshing token:', error);
    throw error;
  }
};

/**
 * Interceptor for fetch requests that handles 401 responses with automatic token refresh
 *
 * Flow:
 * 1. Execute original request
 * 2. If 401 response:
 *    a. Add request to queue
 *    b. Attempt to refresh token (only once, even if multiple 401s)
 *    c. If refresh succeeds: retry all queued requests
 *    d. If refresh fails: logout and redirect
 *
 * @param {string} url - Request URL
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<Response>} - Fetch response
 */
export const fetchWithTokenRefresh = async (url, options = {}) => {
  // Ensure credentials are always included for httpOnly cookies
  const fetchOptions = {
    ...options,
    credentials: 'include',
  };

  try {
    // Execute original request
    const response = await fetch(url, fetchOptions);

    // Volvió una respuesta: hay conexión, aunque traiga un error del servidor
    apuntaRespuestaDelServidor();

    // If not 401, return response immediately
    if (response.status !== 401) {
      return response;
    }

    // Special case: Don't retry refresh token endpoint itself
    // Must check BEFORE device revocation to avoid infinite promise
    if (url.includes('/auth/refresh-token')) {
      console.log('🚫 [TokenRefresh] Refresh endpoint itself returned 401. Session expired.');
      return response;
    }

    // Special case: Device Revocation (v1.13.1)
    // Check if 401 is due to device revocation (before attempting refresh)
    // Clone response to avoid consuming the body
    const responseClone = response.clone();
    let errorData = {};

    try {
      errorData = await responseClone.json();
      const isRevoked = isDeviceRevoked(response, errorData);

      if (isRevoked) {
        handleDeviceRevocationLogout(errorData);
        // Don't return response (body already consumed by clone)
        // Wait for redirect (happens in 500ms) with safety timeout that rejects
        await Promise.race([
          new Promise(() => {}), // Never resolves - redirect will interrupt
          new Promise((_, reject) => setTimeout(() => reject(new Error('Redirect timeout after device revocation')), 5000))
        ]);
      }
    } catch {
      // If JSON parsing fails, continue with normal refresh flow
    }

    // Special case: Don't retry login endpoint - let it fail naturally
    if (url.includes('/auth/login')) {
      console.log('🚫 [TokenRefresh] Login endpoint returned 401. Invalid credentials - not retrying.');
      return response;
    }

    // Special case: If we're on public pages (login, register, etc), don't attempt refresh
    const currentPath = globalThis.location?.pathname || '';
    // La lista vive en un solo sitio: esta copia iba dos entradas por detras.
    // Y se mira tambien si hay sesion guardada: en una clasificacion compartida
    // —que es publica— un usuario con sesion SI tiene que refrescar.
    const isPublicPage = sinSesionEnRutaPublica(currentPath, hayUsuarioGuardado());
    if (isPublicPage && url.includes('/current-user')) {
      console.log('🚫 [TokenRefresh] On public page, not attempting refresh for current-user check');
      return response;
    }

    console.log('⚠️ [TokenRefresh] Received 401 Unauthorized. Attempting token refresh...');

    // If a refresh is already in progress, queue this request
    if (isRefreshing) {
      console.log('⏳ [TokenRefresh] Refresh already in progress. Queueing request...');

      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: () => {
            // Retry the original request after refresh completes
            console.log('🔄 [TokenRefresh] Retrying queued request...');
            fetch(url, fetchOptions)
              .then(resolve)
              .catch(reject);
          },
          reject,
        });
      });
    }

    // Start refresh process
    isRefreshing = true;

    try {
      // Attempt to refresh the token
      await refreshAccessToken();

      // Refresh successful - process queued requests
      processQueue();

      // Retry the original request
      console.log('🔄 [TokenRefresh] Retrying original request...');
      const retryResponse = await fetch(url, fetchOptions);

      return retryResponse;

    } catch (refreshError) {
      // Refresh failed - reject all queued requests
      processQueue(refreshError);

      // Solo el servidor puede decir que una sesión ya no vale. Un fallo de red
      // o un 5xx significan que no se ha podido preguntar, no que la respuesta
      // sea que no, y tratarlos igual echaba al jugador de la aplicación en
      // mitad de una vuelta cada vez que el campo se quedaba sin cobertura
      // (FE #514). El token de acceso dura 15 minutos y el marcador pregunta
      // cada 10 segundos, así que la ocasión se presentaba muchas veces.
      const respuestaDelServidor = refreshError.response ?? null;
      const credencialesRechazadas = respuestaDelServidor?.status === 401;

      // v2.0.4: Properly differentiate between device revocation and session expiration
      if (respuestaDelServidor && refreshError.errorData) {
        // Check if refresh failed due to EXPLICIT device revocation
        if (isDeviceRevoked(respuestaDelServidor, refreshError.errorData)) {
          console.log('🔒 [TokenRefresh] Device was revoked - logging out with revocation message');
          handleDeviceRevocationLogout(refreshError.errorData);
          throw refreshError;
        }

        // Check if refresh failed due to session expiration (refresh token expired)
        if (isSessionExpired(respuestaDelServidor, refreshError.errorData)) {
          console.log('⏱️ [TokenRefresh] Session expired - logging out with expiration message');
          handleSessionExpiredLogout(refreshError.errorData);
          throw refreshError;
        }
      }

      // Un 401 del propio refresco es la única respuesta que significa "estas
      // credenciales ya no sirven". Se comprueba el estado y no solo el texto
      // porque `isSessionExpired` exige además que el `detail` hable del
      // refresh token, y un 401 con otro mensaje también cierra la sesión
      if (credencialesRechazadas) {
        console.log('⏱️ [TokenRefresh] Refresh rejected with 401 - logging out');
        handleSessionExpiredLogout(refreshError.errorData || null);
      } else {
        // Nadie ha dicho que la sesión no valga: se conserva. El marcador
        // vuelve a preguntar en su siguiente vuelta y lo anotado sin conexión
        // sigue donde estaba
        console.log('📡 [TokenRefresh] Refresh unreachable - keeping the session');
      }

      // Todas las salidas de aquí terminan igual: el error sube a quien llamó.
      // Antes cada rama esperaba a que la redirección interrumpiera, con un
      // tope de cinco segundos. Eso dejaba `isRefreshing` bloqueado ese rato,
      // y cualquier petición que diera 401 mientras tanto se encolaba DESPUÉS
      // de haberse vaciado la cola: su promesa no se resolvía nunca. Peor aún,
      // si el cierre de sesión no llegaba a redirigir —ya estaba marcado como
      // atendido— nadie interrumpía nada y quien llamó recibía a los cinco
      // segundos un 'Redirect timeout' en vez del error de verdad
      throw refreshError;

    } finally {
      isRefreshing = false;
    }

  } catch (error) {
    if (esFalloDeRed(error)) {
      apuntaFalloDeRed();
    }
    console.error('❌ [TokenRefresh] Error in fetch interceptor:', error);
    // Re-throw to let the caller handle the error appropriately
    throw error;
  }
};

/**
 * Check if the current session is valid by attempting a refresh
 * Useful for checking session status on app startup
 *
 * @returns {Promise<boolean>} - True if session is valid
 */
export const isSessionValid = async () => {
  try {
    await refreshAccessToken();
    return true;
  } catch {
    return false;
  }
};

export default fetchWithTokenRefresh;
