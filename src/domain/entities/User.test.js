import { describe, it, expect } from 'vitest';
import User from './User';
import Email from '../value_objects/Email';
import { CountryCode } from '../value_objects/CountryCode';

describe('User Entity', () => {
  describe('Constructor', () => {
    it('should create a User with all required fields', () => {
      const userData = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe'
      };

      const user = new User(userData);

      expect(user.id).toBe('user-123');
      expect(user.email).toBeInstanceOf(Email);
      expect(user.email.getValue()).toBe('test@example.com');
      expect(user.firstName).toBe('John');
      expect(user.lastName).toBe('Doe');
    });

    it('should throw error if required fields are missing', () => {
      const userData = {
        email: 'test@example.com',
        first_name: 'John',
        // missing id and last_name
      };

      expect(() => new User(userData)).toThrow('User entity requires id, email, first_name, and last_name');
    });
  });

  describe('country_code field', () => {
    it('should accept country_code as string and create CountryCode VO', () => {
      const userData = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        country_code: 'ES'
      };

      const user = new User(userData);

      expect(user.countryCode).toBeInstanceOf(CountryCode);
      expect(user.countryCode.value()).toBe('ES');
    });

    it('should accept country_code as CountryCode VO', () => {
      const countryCodeVO = new CountryCode('FR');
      const userData = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        country_code: countryCodeVO
      };

      const user = new User(userData);

      expect(user.countryCode).toBeInstanceOf(CountryCode);
      expect(user.countryCode.value()).toBe('FR');
      expect(user.countryCode).toBe(countryCodeVO); // Same instance
    });

    it('should accept country_code as null', () => {
      const userData = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        country_code: null
      };

      const user = new User(userData);

      expect(user.countryCode).toBeNull();
    });

    it('should default country_code to null if not provided', () => {
      const userData = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        // country_code not provided
      };

      const user = new User(userData);

      expect(user.countryCode).toBeNull();
    });

    it('should accept country_code as undefined and treat it as null', () => {
      const userData = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        country_code: undefined
      };

      const user = new User(userData);

      expect(user.countryCode).toBeNull();
    });
  });

  describe('toPersistence', () => {
    it('should convert User entity to plain object with country_code value', () => {
      const userData = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        country_code: 'ES',
        handicap: 15.5,
        email_verified: true,
        created_at: '2025-11-23T10:00:00Z',
        updated_at: '2025-11-23T10:00:00Z'
      };

      const user = new User(userData);
      const plainObject = user.toPersistence();

      expect(plainObject).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        password: undefined,
        first_name: 'John',
        last_name: 'Doe',
        handicap: 15.5,
        handicap_updated_at: null,
        created_at: '2025-11-23T10:00:00Z',
        updated_at: '2025-11-23T10:00:00Z',
        email_verified: true,
        verification_token: null,
        country_code: 'ES', // Extracted from CountryCode VO
        gender: null,
        auth_providers: [],
        has_password: true,
      });
    });

    it('should convert User with null country_code correctly', () => {
      const userData = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        country_code: null
      };

      const user = new User(userData);
      const plainObject = user.toPersistence();

      expect(plainObject.country_code).toBeNull();
    });

    it('should extract country_code value from CountryCode VO', () => {
      const userData = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        country_code: new CountryCode('IT')
      };

      const user = new User(userData);
      const plainObject = user.toPersistence();

      expect(plainObject.country_code).toBe('IT');
      expect(typeof plainObject.country_code).toBe('string');
    });
  });

  describe('gender field', () => {
    it('should accept gender as MALE', () => {
      const user = new User({
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        gender: 'MALE'
      });

      expect(user.gender).toBe('MALE');
    });

    it('should accept gender as FEMALE', () => {
      const user = new User({
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'Jane',
        last_name: 'Doe',
        gender: 'FEMALE'
      });

      expect(user.gender).toBe('FEMALE');
    });

    it('should accept gender as null', () => {
      const user = new User({
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        gender: null
      });

      expect(user.gender).toBeNull();
    });

    it('should default gender to null if not provided', () => {
      const user = new User({
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe'
      });

      expect(user.gender).toBeNull();
    });

    it('should throw error for invalid gender value', () => {
      expect(() => new User({
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        gender: 'OTHER'
      })).toThrow("Invalid gender: OTHER. Must be 'MALE', 'FEMALE', or null");
    });

    it('should include gender in toPersistence output', () => {
      const user = new User({
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        gender: 'MALE'
      });

      const plainObject = user.toPersistence();
      expect(plainObject.gender).toBe('MALE');
    });

    it('should include null gender in toPersistence output', () => {
      const user = new User({
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe'
      });

      const plainObject = user.toPersistence();
      expect(plainObject.gender).toBeNull();
    });
  });

  describe('auth_providers and has_password fields', () => {
    it('should default auth_providers to empty array', () => {
      const user = new User({
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
      });

      expect(user.authProviders).toEqual([]);
    });

    it('should accept auth_providers with google', () => {
      const user = new User({
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        auth_providers: ['google'],
      });

      expect(user.authProviders).toEqual(['google']);
    });

    it('should default has_password to true', () => {
      const user = new User({
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
      });

      expect(user.hasPassword).toBe(true);
    });

    it('should accept has_password as false for OAuth-only users', () => {
      const user = new User({
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        auth_providers: ['google'],
        has_password: false,
      });

      expect(user.hasPassword).toBe(false);
      expect(user.authProviders).toEqual(['google']);
    });

    it('should include auth_providers and has_password in toPersistence', () => {
      const user = new User({
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        auth_providers: ['google'],
        has_password: false,
      });

      const plainObject = user.toPersistence();
      expect(plainObject.auth_providers).toEqual(['google']);
      expect(plainObject.has_password).toBe(false);
    });
  });

  describe('Optional fields', () => {
    it('should handle optional handicap field', () => {
      const userData = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        handicap: 18.5
      };

      const user = new User(userData);

      expect(user.handicap).toBe(18.5);
    });

    it('should default handicap to null if not provided', () => {
      const userData = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe'
      };

      const user = new User(userData);

      expect(user.handicap).toBeNull();
    });

    it('should handle email_verified field', () => {
      const userData = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        email_verified: true
      };

      const user = new User(userData);

      expect(user.emailVerified).toBe(true);
    });

    it('should default email_verified to false if not provided', () => {
      const userData = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe'
      };

      const user = new User(userData);

      expect(user.emailVerified).toBe(false);
    });
  });

  describe('Business methods', () => {
    it('should update handicap with updateHandicap method', () => {
      const userData = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        handicap: 15.0
      };

      const user = new User(userData);
      const newHandicap = 18.5;
      const updatedAt = new Date().toISOString();

      user.updateHandicap(newHandicap, updatedAt);

      expect(user.handicap).toBe(18.5);
      expect(user.handicapUpdatedAt).toBe(updatedAt);
    });

    it('should throw error if handicap is out of valid range', () => {
      const userData = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe'
      };

      const user = new User(userData);

      expect(() => user.updateHandicap(60, new Date().toISOString()))
        .toThrow('Handicap must be between -10.0 and 54.0 or null');

      expect(() => user.updateHandicap(-15, new Date().toISOString()))
        .toThrow('Handicap must be between -10.0 and 54.0 or null');
    });

    it('should mark email as verified with markEmailAsVerified method', () => {
      const userData = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        email_verified: false,
        verification_token: 'some-token'
      };

      const user = new User(userData);

      user.markEmailAsVerified();

      expect(user.emailVerified).toBe(true);
      expect(user.verificationToken).toBeNull();
    });
  });
});
