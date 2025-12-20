import { describe, it, expect } from 'vitest';
import { validatePassword, validateEmail, validateName } from './validation';

describe('validation utilities', () => {
  // ========================================
  // validatePassword() tests
  // ========================================
  describe('validatePassword', () => {
    // Test: Minimum length requirement (12 characters)
    it('should reject password with less than 12 characters', () => {
      const result = validatePassword('Short1!');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('at least 12 characters');
    });

    it('should accept password with exactly 12 characters and complexity', () => {
      const result = validatePassword('ValidPass123');
      expect(result.isValid).toBe(true);
      expect(result.message).toBe('Strong password');
    });

    // Test: Maximum length requirement (128 characters)
    it('should reject password with more than 128 characters', () => {
      const longPassword = 'A1' + 'a'.repeat(127); // 129 characters
      const result = validatePassword(longPassword);
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('must not exceed 128 characters');
    });

    it('should accept password with exactly 128 characters and complexity', () => {
      const maxPassword = 'A1' + 'a'.repeat(126); // 128 characters
      const result = validatePassword(maxPassword);
      expect(result.isValid).toBe(true);
    });

    // Test: Complexity requirements (uppercase + lowercase + numbers)
    it('should reject password without uppercase letters', () => {
      const result = validatePassword('alllowercase123');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('uppercase, lowercase, and numbers');
    });

    it('should reject password without lowercase letters', () => {
      const result = validatePassword('ALLUPPERCASE123');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('uppercase, lowercase, and numbers');
    });

    it('should reject password without numbers', () => {
      const result = validatePassword('NoNumbersHere');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('uppercase, lowercase, and numbers');
    });

    it('should accept password with uppercase, lowercase, and numbers', () => {
      const result = validatePassword('ValidPassword123');
      expect(result.isValid).toBe(true);
      expect(result.message).toBe('Strong password');
    });

    // Test: Special characters (optional but increase strength)
    it('should accept password with special characters', () => {
      const result = validatePassword('StrongPass123!@#');
      expect(result.isValid).toBe(true);
      expect(result.strength).toBeGreaterThanOrEqual(4);
    });

    // Test: Empty or null input
    it('should reject empty password', () => {
      const result = validatePassword('');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Password is required');
    });

    it('should reject null password', () => {
      const result = validatePassword(null);
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Password is required');
    });

    // Test: Strength calculation
    it('should calculate correct strength score for weak password', () => {
      const result = validatePassword('weakpassword1'); // 13 chars, no uppercase
      expect(result.strength).toBeLessThan(4);
    });

    it('should calculate correct strength score for strong password', () => {
      const result = validatePassword('StrongP@ssw0rd!'); // 15 chars, all types
      expect(result.strength).toBeGreaterThanOrEqual(4);
    });
  });

  // ========================================
  // validateEmail() tests
  // ========================================
  describe('validateEmail', () => {
    // Test: Valid emails
    it('should accept valid email address', () => {
      const result = validateEmail('user@example.com');
      expect(result.isValid).toBe(true);
      expect(result.message).toBe('');
    });

    it('should accept email with subdomain', () => {
      const result = validateEmail('user@mail.example.com');
      expect(result.isValid).toBe(true);
    });

    it('should accept email with plus sign', () => {
      const result = validateEmail('user+tag@example.com');
      expect(result.isValid).toBe(true);
    });

    // Test: Maximum length (254 characters per RFC 5321)
    it('should reject email with more than 254 characters', () => {
      // Create email with 255 characters
      const longEmail = 'a'.repeat(243) + '@example.com'; // 243 + 12 = 255 chars
      const result = validateEmail(longEmail);
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('must not exceed 254 characters');
    });

    it('should accept email with exactly 254 characters', () => {
      // Create email with exactly 254 characters
      const maxEmail = 'a'.repeat(242) + '@example.com'; // 242 + 12 = 254 chars
      const result = validateEmail(maxEmail);
      expect(result.isValid).toBe(true);
    });

    // Test: Invalid formats
    it('should reject email without @ symbol', () => {
      const result = validateEmail('userexample.com');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('valid email address');
    });

    it('should reject email without domain', () => {
      const result = validateEmail('user@');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('valid email address');
    });

    it('should reject email without local part', () => {
      const result = validateEmail('@example.com');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('valid email address');
    });

    // Test: Empty or null input
    it('should reject empty email', () => {
      const result = validateEmail('');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Email is required');
    });

    it('should reject whitespace-only email', () => {
      const result = validateEmail('   ');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Email is required');
    });
  });

  // ========================================
  // validateName() tests
  // ========================================
  describe('validateName', () => {
    // Test: Valid names
    it('should accept valid name', () => {
      const result = validateName('John', 'First name');
      expect(result.isValid).toBe(true);
      expect(result.message).toBe('');
    });

    it('should accept name with exactly 2 characters', () => {
      const result = validateName('Li', 'First name');
      expect(result.isValid).toBe(true);
    });

    it('should accept name with Spanish accents', () => {
      const result = validateName('José', 'First name');
      expect(result.isValid).toBe(true);
    });

    it('should accept name with multiple accents and ñ', () => {
      const result = validateName('María Peña', 'Full name');
      expect(result.isValid).toBe(true);
    });

    it('should accept name with hyphens', () => {
      const result = validateName('Mary-Jane', 'First name');
      expect(result.isValid).toBe(true);
    });

    it('should accept name with apostrophes', () => {
      const result = validateName("O'Connor", 'Last name');
      expect(result.isValid).toBe(true);
    });

    // Test: Maximum length (100 characters - updated from 50)
    it('should reject name with more than 100 characters', () => {
      const longName = 'A'.repeat(101);
      const result = validateName(longName, 'First name');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('must not exceed 100 characters');
    });

    it('should accept name with exactly 100 characters', () => {
      const maxName = 'A'.repeat(100);
      const result = validateName(maxName, 'First name');
      expect(result.isValid).toBe(true);
    });

    it('should accept long compound Spanish name (51-100 chars)', () => {
      // This name was previously rejected with 50 char limit
      const longSpanishName = 'María del Carmen Fernández-González de la Torre y Habsburgo';
      expect(longSpanishName.length).toBeGreaterThan(50);
      expect(longSpanishName.length).toBeLessThanOrEqual(100);

      const result = validateName(longSpanishName, 'Full name');
      expect(result.isValid).toBe(true);
    });

    // Test: Minimum length (2 characters)
    it('should reject name with less than 2 characters', () => {
      const result = validateName('A', 'First name');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('at least 2 characters');
    });

    // Test: Invalid characters
    it('should reject name with numbers', () => {
      const result = validateName('John123', 'First name');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('invalid characters');
    });

    it('should reject name with special symbols', () => {
      const result = validateName('John@Doe', 'First name');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('invalid characters');
    });

    // Test: Empty or null input
    it('should reject empty name', () => {
      const result = validateName('', 'First name');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('First name is required');
    });

    it('should reject whitespace-only name', () => {
      const result = validateName('   ', 'Last name');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Last name is required');
    });

    // Test: Field name parameter
    it('should use custom field name in error messages', () => {
      const result = validateName('', 'Custom Field');
      expect(result.message).toContain('Custom Field');
    });
  });
});
