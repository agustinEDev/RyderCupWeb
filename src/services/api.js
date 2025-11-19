/**
 * Base API configuration and utilities
 */

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Get auth token from secure storage
 */
  const getAuthToken = () => {
    try {
      const token = sessionStorage.getItem('auth_token');
      if (!token) return null;

      // El token JWT ya viene en formato correcto del backend
      return token;  // ✅ CORREGIDO
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  };

/**
 * Make authenticated API request
 * @param {string} endpoint - API endpoint (e.g., '/api/v1/competitions')
 * @param {object} options - Fetch options
 * @returns {Promise<any>} - Response data
 */
export const apiRequest = async (endpoint, options = {}) => {
  const token = getAuthToken();

  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;

  try {
    const response = await fetch(url, config);

    // Handle 401 Unauthorized
    if (response.status === 401) {
      // Clear auth data and redirect to login
      sessionStorage.clear();
      window.location.href = '/login';
      throw new Error('Session expired. Please login again.');
    }

    // Parse error response
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    // Return parsed JSON
    return await response.json();
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
};

export default apiRequest;
