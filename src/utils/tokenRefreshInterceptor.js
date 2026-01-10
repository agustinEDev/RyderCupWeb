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

import { getCsrfToken, setCsrfTokenGlobal } from '../contexts/AuthContext'; // v1.13.0: CSRF Protection

const API_URL = globalThis.APP_CONFIG?.API_BASE_URL || import.meta.env.VITE_API_BASE_URL || '';

// State management for refresh token flow
let isRefreshing = false;
let failedQueue = [];

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

    if (!response.ok) {
      console.error('❌ [TokenRefresh] Refresh failed:', response.status, response.statusText);

      // Refresh token expired or invalid
      if (response.status === 401) {
        throw new Error('Refresh token expired. Please login again.');
      }

      throw new Error('Failed to refresh token');
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

    return true;
  } catch (error) {
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

    // If not 401, return response immediately
    if (response.status !== 401) {
      return response;
    }

    // Special case: Don't retry refresh token endpoint itself
    if (url.includes('/auth/refresh-token')) {
      console.log('🚫 [TokenRefresh] Refresh endpoint itself returned 401. Session expired.');
      return response;
    }

    // Special case: Don't retry login endpoint - let it fail naturally
    if (url.includes('/auth/login')) {
      console.log('🚫 [TokenRefresh] Login endpoint returned 401. Invalid credentials - not retrying.');
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

      // Token refresh failed - redirect to login
      globalThis.location.href = '/login';

      // Return the original 401 response
      return response;

    } finally {
      isRefreshing = false;
    }

  } catch (error) {
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
  } catch (error) {
    return false;
  }
};

export default fetchWithTokenRefresh;
