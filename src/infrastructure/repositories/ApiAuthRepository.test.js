/**
 * Tests for ApiAuthRepository
 * v1.13.0: Account Lockout handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import ApiAuthRepository from './ApiAuthRepository';
import User from '../../domain/entities/User';
import Email from '../../domain/value_objects/Email';
import Password from '../../domain/value_objects/Password';
import * as api from '../../services/api';

// Mock api module
vi.mock('../../services/api', () => ({
  default: vi.fn(),
}));

describe('ApiAuthRepository - Account Lockout', () => {
  let repository;
  let mockApiRequest;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new ApiAuthRepository();
    mockApiRequest = api.default;
  });

  describe('login - HTTP 423 Account Lockout', () => {
    it('should throw specific error message for account lockout (HTTP 423)', async () => {
      const email = new Email('locked@example.com');
      const password = new Password('Password123', { validateStrength: false });

      // Mock apiRequest to throw HTTP 423 error
      mockApiRequest.mockRejectedValue(
        new Error('HTTP 423: Locked')
      );

      await expect(repository.login(email, password)).rejects.toThrow(
        'Account locked due to too many failed login attempts. Please try again after 30 minutes.'
      );

      expect(mockApiRequest).toHaveBeenCalledWith('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'locked@example.com',
          password: 'Password123',
        }),
      });
    });

    it('should handle HTTP 423 with full error message from backend', async () => {
      const email = new Email('test@example.com');
      const password = new Password('Password123', { validateStrength: false });

      mockApiRequest.mockRejectedValue(
        new Error('HTTP 423: Account locked due to too many failed login attempts')
      );

      await expect(repository.login(email, password)).rejects.toThrow(
        'Account locked due to too many failed login attempts. Please try again after 30 minutes.'
      );
    });

    it('should distinguish HTTP 423 from HTTP 401', async () => {
      const email = new Email('wrong@example.com');
      const password = new Password('WrongPassword', { validateStrength: false });

      // Mock 401 error (invalid credentials)
      mockApiRequest.mockRejectedValue(
        new Error('HTTP 401: Unauthorized')
      );

      await expect(repository.login(email, password)).rejects.toThrow(
        'Incorrect email or password'
      );
    });

    it('should successfully login after account is unlocked', async () => {
      const email = new Email('unlocked@example.com');
      const password = new Password('Password123', { validateStrength: false });

      const mockUser = {
        id: '123',
        email: 'unlocked@example.com',
        first_name: 'John',
        last_name: 'Doe',
        email_verified: true,
      };

      mockApiRequest.mockResolvedValue({
        user: mockUser,
        access_token: 'token123',
        csrf_token: 'csrf123',
      });

      const result = await repository.login(email, password);

      expect(result.user).toBeInstanceOf(User);
      expect(result.user.email.getValue()).toBe('unlocked@example.com');
      expect(result.csrfToken).toBe('csrf123');
    });
  });

  describe('login - Other error scenarios', () => {
    it('should handle network errors', async () => {
      const email = new Email('test@example.com');
      const password = new Password('Password123', { validateStrength: false });

      mockApiRequest.mockRejectedValue(
        new Error('Network error: Failed to fetch')
      );

      await expect(repository.login(email, password)).rejects.toThrow(
        'Network error: Failed to fetch'
      );
    });

    it('should handle server errors (500)', async () => {
      const email = new Email('test@example.com');
      const password = new Password('Password123', { validateStrength: false });

      mockApiRequest.mockRejectedValue(
        new Error('HTTP 500: Internal Server Error')
      );

      await expect(repository.login(email, password)).rejects.toThrow(
        'HTTP 500: Internal Server Error'
      );
    });
  });
});
