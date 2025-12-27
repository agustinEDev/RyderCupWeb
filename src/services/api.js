/**
 * Base API configuration and utilities
 */

import { fetchWithTokenRefresh } from '../utils/tokenRefreshInterceptor.js';

// Prioridad: 1. Runtime config (window.APP_CONFIG) 2. Build-time env 3. Empty string (relative URLs for proxy)
// Si no hay API_URL configurado, usar '' para que las URLs sean relativas (/api/...)
const API_URL = window.APP_CONFIG?.API_BASE_URL || import.meta.env.VITE_API_BASE_URL || '';

/**
 * Make authenticated API request with httpOnly cookies and automatic token refresh
 * @param {string} endpoint - API endpoint (e.g., '/api/v1/competitions')
 * @param {object} options - Fetch options
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
 * - Queues multiple 401s to prevent duplicate refresh calls
 */
export const apiRequest = async (endpoint, options = {}) => {
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const config = {
    ...options,
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
    const response = await fetchWithTokenRefresh(url, config);

    if (!response.ok) {
      // Try to parse error response from backend
      let errorData = {};
      try {
        errorData = await response.json();
      } catch (jsonError) {
        // If parsing fails, errorData remains empty object
        console.warn('Failed to parse error response as JSON:', jsonError);
      }

      // Extract error message with proper fallback chain
      let errorMessage = '';

      if (errorData.detail) {
        // FastAPI returns errors in 'detail' field
        errorMessage = typeof errorData.detail === 'string'
          ? errorData.detail
          : JSON.stringify(errorData.detail);
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

      throw new Error(errorMessage);
    }

    // Handle no content responses (e.g., 204 from DELETE)
    if (response.status === 204) {
      return null;
    }

    // Return parsed JSON
    return await response.json();
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
};

export default apiRequest;
