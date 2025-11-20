import { describe, it, expect } from 'vitest';
import Email from './Email';

describe('Email Value Object', () => {
  it('should create a valid email object', () => {
    const email = new Email('test@example.com');
    expect(email).toBeInstanceOf(Email);
    expect(email.getValue()).toBe('test@example.com');
  });

  it('should throw an error for an invalid email address', () => {
    expect(() => new Email('invalid-email')).toThrow('Invalid email address.');
    expect(() => new Email('test@')).toThrow('Invalid email address.');
    expect(() => new Email('@example.com')).toThrow('Invalid email address.');
    expect(() => new Email('test@example')).toThrow('Invalid email address.');
  });

  it('should throw an error for a null, undefined or empty email string', () => {
    // Note: Email.isValid expects a string. Passing null/undefined will result in a TypeError
    // from the regex .test() method if not handled by the regex itself.
    // Our current regex /^[^\s@]+@[^\s@]+\.[^\s@]+$/ will not match null/undefined/empty.

    // Aserciones para casos que lanzan el mismo error de validación
    expect(() => new Email(null)).toThrow('Invalid email address.');
    expect(() => new Email(undefined)).toThrow('Invalid email address.');
    expect(() => new Email('')).toThrow('Invalid email address.');
    expect(() => new Email('   ')).toThrow('Invalid email address.'); // Espacios en blanco
  });

  it('should correctly compare two email objects', () => {
    const email1 = new Email('test@example.com');
    const email2 = new Email('test@example.com');
    const email3 = new Email('another@example.com');

    expect(email1.equals(email2)).toBe(true);
    expect(email1.equals(email3)).toBe(false);
  });

  it('should not be equal to null, undefined or other object types', () => {
    const email = new Email('test@example.com');
    expect(email.equals(null)).toBe(false);
    expect(email.equals(undefined)).toBe(false);
    expect(email.equals('test@example.com')).toBe(false); // Compara con string
    expect(email.equals({ value: 'test@example.com' })).toBe(false); // Compara con objeto plano
  });
});
