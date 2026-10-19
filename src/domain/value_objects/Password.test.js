import { describe, it, expect } from 'vitest';
import Password, { PasswordValidationError } from './Password';

describe('Password Value Object', () => {
  it('should create a valid password object for a strong password', () => {
    const password = new Password('StrongPassword123!');
    expect(password).toBeInstanceOf(Password);
    expect(password.getValue()).toBe('StrongPassword123!');
  });

  it('should throw PasswordValidationError for an empty password string', () => {
    expect(() => new Password('')).toThrow(PasswordValidationError);
    expect(() => new Password('')).toThrow('Password cannot be empty.');
  });

  it('should throw PasswordValidationError if password is too short', () => {
    expect(() => new Password('Short12')).toThrow(PasswordValidationError);
    expect(() => new Password('Short12')).toThrow('Password must be at least 12 characters long.');
  });

  it('should throw PasswordValidationError if password is too long', () => {
    const longPassword = 'A'.repeat(127) + '1a';
    expect(() => new Password(longPassword)).toThrow(PasswordValidationError);
    expect(() => new Password(longPassword)).toThrow('Password must not exceed 128 characters.');
  });

  it('should throw PasswordValidationError if password is missing an uppercase letter', () => {
    expect(() => new Password('strongpassword123')).toThrow(PasswordValidationError);
    expect(() => new Password('strongpassword123')).toThrow('Password must contain at least one uppercase letter.');
  });

  it('should throw PasswordValidationError if password is missing a lowercase letter', () => {
    expect(() => new Password('STRONGPASSWORD123')).toThrow(PasswordValidationError);
    expect(() => new Password('STRONGPASSWORD123')).toThrow('Password must contain at least one lowercase letter.');
  });

  it('should throw PasswordValidationError if password is missing a number', () => {
    expect(() => new Password('StrongPasswordABC')).toThrow(PasswordValidationError);
    expect(() => new Password('StrongPasswordABC')).toThrow('Password must contain at least one number.');
  });

  // La misma política que el backend: sin esto el front dejaba enviar lo que
  // el backend rechazaba (hotfix 2.40.1)
  it('rechaza una contraseña sin símbolo', () => {
    expect(() => new Password('StrongPassword123')).toThrow(PasswordValidationError);
    expect(() => new Password('StrongPassword123')).toThrow(
      'Password must contain at least one special character.'
    );
  });

  it('rechaza espacios al principio o al final', () => {
    expect(() => new Password(' StrongPass123!')).toThrow(
      'Password must not start or end with whitespace.'
    );
    expect(() => new Password('StrongPass123! ')).toThrow(
      'Password must not start or end with whitespace.'
    );
  });

  it('cuenta los caracteres como el backend: un emoji es uno', () => {
    expect(() => new Password('Abcdefgh1!😀')).toThrow(
      'Password must be at least 12 characters long.'
    );
  });

  it('aplica la misma regla que validatePassword: la eñe es mayúscula', () => {
    expect(new Password('Ñandúcorre12!').getValue()).toBe('Ñandúcorre12!');
  });

  it('no valida la fortaleza si se le pide que no lo haga', () => {
    expect(new Password('debil', { validateStrength: false }).getValue()).toBe('debil');
  });

  it('should return the correct password value using getValue()', () => {
    const value = 'TestPassword456!';
    const password = new Password(value);
    expect(password.getValue()).toBe(value);
  });

  // Test cases for multiple failures - constructor should throw the first one encountered
  it('should throw the first encountered validation error for multiple failures', () => {
    expect(() => new Password('abc')).toThrow('Password must be at least 12 characters long.');
    // CORRECCIÓN: El primer error para 'ABCDEF1' es la longitud (7 < 12)
    expect(() => new Password('ABCDEF1')).toThrow('Password must be at least 12 characters long.');
    // 'ABCDEFGH1' is 9 chars < 12, so length error is first
    expect(() => new Password('ABCDEFGH1')).toThrow('Password must be at least 12 characters long.');
    // For a 12+ char password missing lowercase, check that specific error
    expect(() => new Password('ABCDEFGHIJK1')).toThrow('Password must contain at least one lowercase letter.');
  });
});
