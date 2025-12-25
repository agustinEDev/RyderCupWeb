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

  const minLength = 12; // OWASP ASVS V2.1.1 requirement
  const maxLength = 128; // Prevent DoS attacks via excessive hashing
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  // Calculate strength (0-5)
  let strength = 0;
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (hasUpperCase && hasLowerCase) strength++;
  if (hasNumbers) strength++;
  if (hasSpecialChar) strength++;

  // Validation: Check minimum length (12 characters required)
  if (password.length < minLength) {
    return {
      isValid: false,
      message: `Password must be at least ${minLength} characters`,
      strength
    };
  }

  // Validation: Check maximum length (128 characters)
  if (password.length > maxLength) {
    return {
      isValid: false,
      message: `Password must not exceed ${maxLength} characters`,
      strength
    };
  }

  // Validation: Check complexity (uppercase + lowercase + numbers required)
  if (!(hasUpperCase && hasLowerCase && hasNumbers)) {
    return {
      isValid: false,
      message: 'Password must contain uppercase, lowercase, and numbers',
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
  if (strength >= 4) return 'Strong';
  if (strength >= 3) return 'Medium';
  if (strength >= 2) return 'Weak';
  return 'Very weak';
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
 * Validates password strength and returns detailed feedback
 * Optimized for visual indicator component
 * Updated for v1.8.0: Passwords <12 chars cannot reach green/blue (score 3-4)
 * @param {string} password - Password to validate
 * @returns {Object} - { score: number (0-4), feedback: string }
 */
export const validatePasswordStrength = (password) => {
  if (!password) {
    return { score: 0, feedback: '' };
  }

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  let score = 0;
  let feedback = '';

  // CRITICAL: Passwords <12 chars are INVALID (OWASP ASVS V2.1.1)
  // Don't show green/blue for invalid passwords
  if (password.length < 12) {
    // Score capped at 2 (yellow) for passwords <12 chars
    if (password.length >= 8) score = 1;
    if (password.length >= 10) score = 2; // Slightly better if approaching 12
    feedback = `Need ${12 - password.length} more character${12 - password.length !== 1 ? 's' : ''}`;
    return { score, feedback };
  }

  // For passwords >= 12 chars, calculate full score
  score = 2; // Base score for meeting minimum length

  // Add score for character variety
  if (hasUpperCase && hasLowerCase) score++;
  if (hasNumbers) score++;
  if (hasSpecialChar) score++;

  // Cap at 4
  score = Math.min(score, 4);

  // Generate feedback for valid passwords (>= 12 chars)
  if (score === 2) {
    feedback = 'Add uppercase, lowercase, and numbers';
  } else if (score === 3) {
    feedback = 'Good! Add special characters';
  } else if (score === 4) {
    feedback = 'Excellent!';
  }

  return { score, feedback };
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

  const maxLength = 254; // RFC 5321 maximum email address length

  // Check maximum length
  if (email.length > maxLength) {
    return {
      isValid: false,
      message: `Email must not exceed ${maxLength} characters`
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
 * Escapes HTML special characters to prevent injection attacks
 * @param {string} input - Input to sanitize
 * @returns {string} - Sanitized input
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;

  // HTML entity encoding map
  const htmlEntities = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };

  return input
    .replace(/[&<>"'/]/g, (char) => htmlEntities[char])
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

  const minLength = 2;
  const maxLength = 100; // Increased from 50 to match backend v1.8.0

  if (trimmed.length < minLength) {
    return {
      isValid: false,
      message: `${fieldName} must be at least ${minLength} characters`
    };
  }

  if (trimmed.length > maxLength) {
    return {
      isValid: false,
      message: `${fieldName} must not exceed ${maxLength} characters`
    };
  }

  // Allow only letters, spaces, hyphens, and apostrophes (with accents)
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
