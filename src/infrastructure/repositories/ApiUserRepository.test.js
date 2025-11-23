import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ApiUserRepository from './ApiUserRepository';
import User from '../../domain/entities/User';

// Mock global fetch
global.fetch = vi.fn();

describe('ApiUserRepository', () => {
  let authTokenProvider;
  let apiUserRepository;
  const mockToken = 'mock-jwt-token';
  const API_URL = 'http://localhost:8000';

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock authTokenProvider
    authTokenProvider = {
      getToken: vi.fn().mockReturnValue(mockToken)
    };

    apiUserRepository = new ApiUserRepository({ authTokenProvider });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getById', () => {
    it('should fetch user from /api/v1/auth/current-user endpoint', async () => {
      // Arrange
      const userId = 'user-123';
      const mockUserData = {
        id: userId,
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        country_code: 'ES',
        handicap: 15.5,
        email_verified: true,
        created_at: '2025-11-23T10:00:00Z',
        updated_at: '2025-11-23T10:00:00Z'
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUserData
      });

      // Act
      const user = await apiUserRepository.getById(userId);

      // Assert
      expect(authTokenProvider.getToken).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_URL}/api/v1/auth/current-user`,
        {
          headers: {
            'Authorization': `Bearer ${mockToken}`
          }
        }
      );
      expect(user).toBeInstanceOf(User);
      expect(user.id).toBe(userId);
      expect(user.email.getValue()).toBe('test@example.com');
      expect(user.countryCode.value()).toBe('ES');
    });

    it('should create User entity with country_code correctly', async () => {
      // Arrange
      const userId = 'user-123';
      const mockUserData = {
        id: userId,
        email: 'test@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
        country_code: 'FR',
        handicap: 12.3
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUserData
      });

      // Act
      const user = await apiUserRepository.getById(userId);

      // Assert
      expect(user).toBeInstanceOf(User);
      expect(user.countryCode).toBeDefined();
      expect(user.countryCode.value()).toBe('FR');
    });

    it('should create User entity with null country_code if not provided', async () => {
      // Arrange
      const userId = 'user-123';
      const mockUserData = {
        id: userId,
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        country_code: null
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUserData
      });

      // Act
      const user = await apiUserRepository.getById(userId);

      // Assert
      expect(user).toBeInstanceOf(User);
      expect(user.countryCode).toBeNull();
    });

    it('should return null if response status is 404', async () => {
      // Arrange
      const userId = 'user-123';

      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      // Act
      const user = await apiUserRepository.getById(userId);

      // Assert
      expect(user).toBeNull();
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_URL}/api/v1/auth/current-user`,
        expect.any(Object)
      );
    });

    it('should return null if response status is 401 (Unauthorized)', async () => {
      // Arrange
      const userId = 'user-123';

      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401
      });

      // Act
      const user = await apiUserRepository.getById(userId);

      // Assert
      expect(user).toBeNull();
    });

    it('should throw error for other HTTP error codes', async () => {
      // Arrange
      const userId = 'user-123';

      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      // Act & Assert
      await expect(apiUserRepository.getById(userId))
        .rejects.toThrow('Failed to fetch current user');
    });

    it('should use JWT token from authTokenProvider', async () => {
      // Arrange
      const userId = 'user-123';
      const customToken = 'custom-token-xyz';
      authTokenProvider.getToken.mockReturnValueOnce(customToken);

      const mockUserData = {
        id: userId,
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe'
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUserData
      });

      // Act
      await apiUserRepository.getById(userId);

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        {
          headers: {
            'Authorization': `Bearer ${customToken}`
          }
        }
      );
    });

    it('should ignore userId parameter and always fetch current user', async () => {
      // Arrange
      const userId1 = 'user-123';
      const userId2 = 'user-456';

      const mockUserData = {
        id: 'current-user-id',
        email: 'current@example.com',
        first_name: 'Current',
        last_name: 'User',
        country_code: 'ES'
      };

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockUserData
      });

      // Act
      const user1 = await apiUserRepository.getById(userId1);
      const user2 = await apiUserRepository.getById(userId2);

      // Assert
      // Both calls should hit the same endpoint
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.fetch).toHaveBeenNthCalledWith(1, `${API_URL}/api/v1/auth/current-user`, expect.any(Object));
      expect(global.fetch).toHaveBeenNthCalledWith(2, `${API_URL}/api/v1/auth/current-user`, expect.any(Object));

      // Both should return the same user (current user from token)
      expect(user1.id).toBe('current-user-id');
      expect(user2.id).toBe('current-user-id');
    });
  });

  describe('update', () => {
    it('should update user profile with firstName and lastName', async () => {
      // Arrange
      const userId = 'user-123';
      const updateData = {
        firstName: 'Jane',
        lastName: 'Smith'
      };

      const mockUpdatedUser = {
        user: {
          id: userId,
          email: 'test@example.com',
          first_name: 'Jane',
          last_name: 'Smith',
          country_code: 'ES'
        }
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUpdatedUser
      });

      // Act
      const user = await apiUserRepository.update(userId, updateData);

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_URL}/api/v1/users/profile`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockToken}`
          },
          body: JSON.stringify({
            first_name: 'Jane',
            last_name: 'Smith'
          })
        }
      );
      expect(user).toBeInstanceOf(User);
      expect(user.firstName).toBe('Jane');
      expect(user.lastName).toBe('Smith');
    });

    it('should throw error if update fails', async () => {
      // Arrange
      const userId = 'user-123';
      const updateData = {
        firstName: 'Jane',
        lastName: 'Smith'
      };

      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ detail: 'Update failed' })
      });

      // Act & Assert
      await expect(apiUserRepository.update(userId, updateData))
        .rejects.toThrow('Update failed');
    });
  });

  describe('updateSecurity', () => {
    it('should update user security settings', async () => {
      // Arrange
      const userId = 'user-123';
      const securityData = {
        current_password: {
          getValue: () => 'OldPassword123!'
        },
        new_email: {
          getValue: () => 'newemail@example.com'
        },
        new_password: {
          getValue: () => 'NewPassword123!'
        },
        confirm_password: 'NewPassword123!'
      };

      const mockUpdatedUser = {
        user: {
          id: userId,
          email: 'newemail@example.com',
          first_name: 'John',
          last_name: 'Doe'
        }
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUpdatedUser
      });

      // Act
      const user = await apiUserRepository.updateSecurity(userId, securityData);

      // Assert
      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [[url, options]] = global.fetch.mock.calls;

      expect(url).toBe(`${API_URL}/api/v1/users/security`);
      expect(options.method).toBe('PATCH');
      expect(options.headers).toEqual({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mockToken}`
      });

      // Parse and verify body content (order-independent)
      const bodyData = JSON.parse(options.body);
      expect(bodyData).toEqual(expect.objectContaining({
        current_password: 'OldPassword123!',
        new_email: 'newemail@example.com',
        new_password: 'NewPassword123!',
        confirm_password: 'NewPassword123!'
      }));

      expect(user).toBeInstanceOf(User);
      expect(user.email.getValue()).toBe('newemail@example.com');
    });
  });
});
