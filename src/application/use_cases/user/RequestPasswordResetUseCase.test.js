import { describe, it, expect, vi, beforeEach } from 'vitest';
import RequestPasswordResetUseCase from './RequestPasswordResetUseCase';

describe('RequestPasswordResetUseCase', () => {
  let authRepository;
  let requestPasswordResetUseCase;

  beforeEach(() => {
    vi.clearAllMocks();

    authRepository = {
      requestPasswordReset: vi.fn(),
    };

    requestPasswordResetUseCase = new RequestPasswordResetUseCase({ authRepository });
  });

  describe('Successful password reset request', () => {
    it('should successfully request password reset with valid email', async () => {
      // Arrange
      const email = 'test@example.com';
      const mockResponse = {
        message: 'If the email exists, a recovery link has been sent',
      };

      authRepository.requestPasswordReset.mockResolvedValue(mockResponse);

      // Act
      const result = await requestPasswordResetUseCase.execute(email);

      // Assert
      expect(authRepository.requestPasswordReset).toHaveBeenCalledWith(email);
      expect(authRepository.requestPasswordReset).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        success: true,
        message: mockResponse.message,
      });
    });

    it('should return generic message for security (anti-enumeration)', async () => {
      // Arrange
      const email = 'nonexistent@example.com';
      const mockResponse = {
        message: 'If the email exists, a recovery link has been sent',
      };

      authRepository.requestPasswordReset.mockResolvedValue(mockResponse);

      // Act
      const result = await requestPasswordResetUseCase.execute(email);

      // Assert
      // El mensaje debe ser genérico (no debe revelar si el email existe o no)
      expect(result.success).toBe(true);
      expect(result.message).toContain('If the email exists');
      expect(authRepository.requestPasswordReset).toHaveBeenCalledWith(email);
    });
  });

  describe('Validation errors', () => {
    it('should throw error if email is empty', async () => {
      // Act & Assert
      await expect(requestPasswordResetUseCase.execute('')).rejects.toThrow(
        'Email is required'
      );
      expect(authRepository.requestPasswordReset).not.toHaveBeenCalled();
    });

    it('should throw error if email is invalid format', async () => {
      // Act & Assert
      await expect(requestPasswordResetUseCase.execute('invalid-email')).rejects.toThrow(
        'Please enter a valid email address'
      );
      expect(authRepository.requestPasswordReset).not.toHaveBeenCalled();
    });

    it('should throw error if email is too long (>254 chars)', async () => {
      // Arrange
      const longEmail = 'a'.repeat(245) + '@example.com'; // 257 caracteres

      // Act & Assert
      await expect(requestPasswordResetUseCase.execute(longEmail)).rejects.toThrow(
        'Email must not exceed 254 characters'
      );
      expect(authRepository.requestPasswordReset).not.toHaveBeenCalled();
    });

    it('should throw error if email is only whitespace', async () => {
      // Act & Assert
      await expect(requestPasswordResetUseCase.execute('   ')).rejects.toThrow(
        'Email is required'
      );
      expect(authRepository.requestPasswordReset).not.toHaveBeenCalled();
    });
  });

  describe('Repository errors', () => {
    it('should propagate network errors from repository', async () => {
      // Arrange
      const email = 'test@example.com';
      const mockError = new Error('Network error');

      authRepository.requestPasswordReset.mockRejectedValue(mockError);

      // Act & Assert
      await expect(requestPasswordResetUseCase.execute(email)).rejects.toThrow('Network error');
      expect(authRepository.requestPasswordReset).toHaveBeenCalledWith(email);
    });

    it('should propagate rate limiting errors (429)', async () => {
      // Arrange
      const email = 'test@example.com';
      const mockError = new Error('Rate limit exceeded. Please wait 60 minutes.');

      authRepository.requestPasswordReset.mockRejectedValue(mockError);

      // Act & Assert
      await expect(requestPasswordResetUseCase.execute(email)).rejects.toThrow(
        'Rate limit exceeded'
      );
      expect(authRepository.requestPasswordReset).toHaveBeenCalledWith(email);
    });

    it('should propagate server errors (500)', async () => {
      // Arrange
      const email = 'test@example.com';
      const mockError = new Error('Internal server error');

      authRepository.requestPasswordReset.mockRejectedValue(mockError);

      // Act & Assert
      await expect(requestPasswordResetUseCase.execute(email)).rejects.toThrow(
        'Internal server error'
      );
      expect(authRepository.requestPasswordReset).toHaveBeenCalledWith(email);
    });
  });

  describe('Edge cases', () => {
    it('should handle email with special characters', async () => {
      // Arrange
      const email = 'user+tag@sub.example.com';
      const mockResponse = {
        message: 'If the email exists, a recovery link has been sent',
      };

      authRepository.requestPasswordReset.mockResolvedValue(mockResponse);

      // Act
      const result = await requestPasswordResetUseCase.execute(email);

      // Assert
      expect(result.success).toBe(true);
      expect(authRepository.requestPasswordReset).toHaveBeenCalledWith(email);
    });

    it('should handle email with uppercase letters (normalized to lowercase)', async () => {
      // Arrange
      const email = 'TEST@EXAMPLE.COM';
      const mockResponse = {
        message: 'If the email exists, a recovery link has been sent',
      };

      authRepository.requestPasswordReset.mockResolvedValue(mockResponse);

      // Act
      const result = await requestPasswordResetUseCase.execute(email);

      // Assert
      expect(result.success).toBe(true);
      // validateEmail normaliza el email a lowercase
      expect(authRepository.requestPasswordReset).toHaveBeenCalledWith(email);
    });

    it('should return default message if repository returns no message', async () => {
      // Arrange
      const email = 'test@example.com';
      const mockResponse = {}; // Sin campo message

      authRepository.requestPasswordReset.mockResolvedValue(mockResponse);

      // Act
      const result = await requestPasswordResetUseCase.execute(email);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('If the email exists, a recovery link has been sent');
    });
  });
});
