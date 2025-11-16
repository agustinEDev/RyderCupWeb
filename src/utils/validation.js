/**
 * Input Validation and Sanitization Utilities
 */

/**
 * Validates password strength
 * @param {string} password - Password to validate
 * @returns {Object} - { isValid: boolean, message: string, strength: number }
 */
export const validatePassword = (password) => {
  if (!password) {
    return {
      isValid: false,
      message: 'Password is required',
      strength: 0
    };
  }

  const minLength = 12;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  // Calculate strength (0-4)
  let strength = 0;
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (hasUpperCase && hasLowerCase) strength++;
  if (hasNumbers) strength++;
  if (hasSpecialChar) strength++;

  // Validation
  if (password.length < 8) {
    return {
      isValid: false,
      message: 'Password must be at least 8 characters',
      strength
    };
  }

  if (password.length < minLength) {
    return {
      isValid: true, // Minimum for now, but warn
      message: 'Consider using at least 12 characters for better security',
      strength
    };
  }

  if (!(hasUpperCase && hasLowerCase && hasNumbers)) {
    return {
      isValid: true, // Minimum for now
      message: 'Stronger password recommended (use uppercase, lowercase, and numbers)',
      strength
    };
  }

  return {
    isValid: true,
    message: 'Strong password',
    strength
  };
};

/**
 * Get password strength level name
 * @param {number} strength - Strength score (0-4)
 * @returns {string} - Strength level name
 */
export const getPasswordStrengthLabel = (strength) => {
  if (strength >= 4) return 'Fuerte';
  if (strength >= 3) return 'Media';
  if (strength >= 2) return 'Débil';
  return 'Muy débil';
};

/**
 * Get password strength color
 * @param {number} strength - Strength score (0-4)
 * @returns {string} - Tailwind color class
 */
export const getPasswordStrengthColor = (strength) => {
  if (strength >= 4) return 'bg-green-500';
  if (strength >= 3) return 'bg-yellow-500';
  if (strength >= 2) return 'bg-orange-500';
  return 'bg-red-500';
};

/**
 * Validates email format
 * @param {string} email - Email to validate
 * @returns {Object} - { isValid: boolean, message: string }
 */
export const validateEmail = (email) => {
  if (!email || !email.trim()) {
    return {
      isValid: false,
      message: 'Email is required'
    };
  }

  // RFC 5322 compliant regex (simplified)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return {
      isValid: false,
      message: 'Please enter a valid email address'
    };
  }

  return {
    isValid: true,
    message: ''
  };
};

/**
 * Sanitizes string input to prevent XSS
 * @param {string} input - Input to sanitize
 * @returns {string} - Sanitized input
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;

  return input
    .replace(/[<>]/g, '') // Remove < and >
    .trim();
};

/**
 * Validates handicap value
 * @param {number|string} handicap - Handicap to validate
 * @returns {Object} - { isValid: boolean, message: string, value: number }
 */
export const validateHandicap = (handicap) => {
  const value = Number.parseFloat(handicap);

  if (Number.isNaN(value)) {
    return {
      isValid: false,
      message: 'Please enter a valid number',
      value: null
    };
  }

  if (value < -10 || value > 54) {
    return {
      isValid: false,
      message: 'Handicap must be between -10.0 and 54.0',
      value
    };
  }

  return {
    isValid: true,
    message: '',
    value
  };
};

/**
 * Validates name (first name or last name)
 * @param {string} name - Name to validate
 * @param {string} fieldName - Field name for error messages
 * @returns {Object} - { isValid: boolean, message: string }
 */
export const validateName = (name, fieldName = 'Name') => {
  const trimmed = name.trim();

  if (!trimmed) {
    return {
      isValid: false,
      message: `${fieldName} is required`
    };
  }

  if (trimmed.length < 2) {
    return {
      isValid: false,
      message: `${fieldName} must be at least 2 characters`
    };
  }

  if (trimmed.length > 50) {
    return {
      isValid: false,
      message: `${fieldName} must not exceed 50 characters`
    };
  }

  // Allow only letters, spaces, hyphens, and apostrophes
  const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/;
  if (!nameRegex.test(trimmed)) {
    return {
      isValid: false,
      message: `${fieldName} contains invalid characters`
    };
  }

  return {
    isValid: true,
    message: ''
  };
};

/**
 * Rate limiting utility for form submissions
 * @param {string} key - Unique key for the rate limiter
 * @param {number} maxAttempts - Maximum number of attempts
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Object} - { allowed: boolean, remainingTime: number }
 */
export const checkRateLimit = (key, maxAttempts = 5, windowMs = 60000) => {
  const storageKey = `ratelimit_${key}`;
  const now = Date.now();

  let rateLimitData = localStorage.getItem(storageKey);
  if (rateLimitData) {
    try {
      rateLimitData = JSON.parse(rateLimitData);
    } catch {
      rateLimitData = null;
    }
  }

  if (!rateLimitData) {
    rateLimitData = {
      attempts: 0,
      resetTime: now + windowMs
    };
  }

  // Reset if window has passed
  if (now >= rateLimitData.resetTime) {
    rateLimitData = {
      attempts: 0,
      resetTime: now + windowMs
    };
  }

  // Check if allowed
  if (rateLimitData.attempts >= maxAttempts) {
    return {
      allowed: false,
      remainingTime: Math.ceil((rateLimitData.resetTime - now) / 1000)
    };
  }

  // Increment attempts
  rateLimitData.attempts++;
  localStorage.setItem(storageKey, JSON.stringify(rateLimitData));

  return {
    allowed: true,
    remainingTime: 0
  };
};

/**
 * Resets rate limit for a key
 * @param {string} key - Unique key for the rate limiter
 */
export const resetRateLimit = (key) => {
  const storageKey = `ratelimit_${key}`;
  localStorage.removeItem(storageKey);
};
