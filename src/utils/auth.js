/**
 * Authentication and Security Utilities
 * Provides token validation, sanitization, and security helpers
 */

/**
 * Checks if a JWT token is expired
 * @param {string} token - JWT token to validate
 * @returns {boolean} - True if expired, false otherwise
 */
export const isTokenExpired = (token) => {
  if (!token) return true;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));

    // Validate that exp exists and is a finite number
    if (!payload.exp || !Number.isFinite(Number(payload.exp))) {
      if (import.meta.env.DEV) {
        console.error('Token has invalid or missing exp claim:', payload.exp);
      }
      return true; // Treat as expired if exp is missing or invalid
    }

    // Add 30 second buffer to account for clock skew
    return payload.exp * 1000 < (Date.now() + 30000);
  } catch (error) {
    // If we can't decode the token, consider it expired
    if (import.meta.env.DEV) {
      console.error('Error decoding token:', error);
    }
    return true;
  }
};

/**
 * Validates a token and cleans up localStorage if invalid
 * @param {string} token - Token to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export const validateToken = (token) => {
  if (!token) {
    clearAuthData();
    return false;
  }

  if (isTokenExpired(token)) {
    clearAuthData();
    return false;
  }

  return true;
};

/**
 * Clears authentication data from localStorage
 */
export const clearAuthData = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
};

/**
 * Gets the current authenticated user
 * @returns {Object|null} - User object or null if not authenticated
 */
export const getCurrentUser = () => {
  const token = localStorage.getItem('access_token');
  const userData = localStorage.getItem('user');

  if (!validateToken(token) || !userData) {
    return null;
  }

  try {
    return JSON.parse(userData);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error parsing user data:', error);
    }
    clearAuthData();
    return null;
  }
};

/**
 * Gets the current auth token if valid
 * @returns {string|null} - Token or null if invalid
 */
export const getAuthToken = () => {
  const token = localStorage.getItem('access_token');
  return validateToken(token) ? token : null;
};

/**
 * Checks if user is authenticated
 * @returns {boolean}
 */
export const isAuthenticated = () => {
  return !!getAuthToken();
};

/**
 * Safe logging utility that only logs in development
 * @param {string} level - Log level (info, warn, error)
 * @param {string} message - Message to log
 * @param {any} data - Data to log (will be sanitized)
 */
export const safeLog = (level, message, data = null) => {
  if (!import.meta.env.DEV) return;

  // Sanitize sensitive data
  let sanitizedData = data;
  if (data && typeof data === 'object') {
    sanitizedData = { ...data };
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'access_token', 'refresh_token'];
    sensitiveFields.forEach(field => {
      if (field in sanitizedData) {
        sanitizedData[field] = '[REDACTED]';
      }
    });
  }

  const logFn = console[level] || console.log;
  if (sanitizedData) {
    logFn(`[${level.toUpperCase()}]`, message, sanitizedData);
  } else {
    logFn(`[${level.toUpperCase()}]`, message);
  }
};
