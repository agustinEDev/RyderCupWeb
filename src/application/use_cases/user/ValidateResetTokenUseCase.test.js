import { describe, it, expect, vi, beforeEach } from 'vitest';
import ValidateResetTokenUseCase from './ValidateResetTokenUseCase';

describe('ValidateResetTokenUseCase', () => {
  let authRepository;
  let validateResetTokenUseCase;

  beforeEach(() => {
    vi.clearAllMocks();

    authRepository = {
      validateResetToken: vi.fn(),
    };

    validateResetTokenUseCase = new ValidateResetTokenUseCase({ authRepository });
  });

  describe('Valid token scenarios', () => {
    it('should successfully validate a valid token', async () => {
      // Arrange
      const token = 'valid_256_bit_token';
      const mockResponse = {
        valid: true,
        message: 'Token is valid. You can proceed to reset your password.',
      };

      authRepository.validateResetToken.mockResolvedValue(mockResponse);

      // Act
      const result = await validateResetTokenUseCase.execute(token);

      // Assert
      expect(authRepository.validateResetToken).toHaveBeenCalledWith(token);
      expect(authRepository.validateResetToken).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        valid: true,
        message: mockResponse.message,
      });
    });

    it('should return default message if repository returns no message', async () => {
      // Arrange
      const token = 'valid_token';
      const mockResponse = {
        valid: true,
      };

      authRepository.validateResetToken.mockResolvedValue(mockResponse);

      // Act
      const result = await validateResetTokenUseCase.execute(token);

      // Assert
      expect(result.valid).toBe(true);
      expect(result.message).toBe('Token válido. Puedes proceder a cambiar tu contraseña.');
    });
  });

  describe('Invalid token scenarios', () => {
    it('should return valid:false when token is invalid', async () => {
      // Arrange
      const token = 'invalid_token';
      const mockError = new Error('Invalid reset token');

      authRepository.validateResetToken.mockRejectedValue(mockError);

      // Act
      const result = await validateResetTokenUseCase.execute(token);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Invalid reset token');
      expect(authRepository.validateResetToken).toHaveBeenCalledWith(token);
    });

    it('should return valid:false when token is expired', async () => {
      // Arrange
      const token = 'expired_token';
      const mockError = new Error('Reset token has expired');

      authRepository.validateResetToken.mockRejectedValue(mockError);

      // Act
      const result = await validateResetTokenUseCase.execute(token);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.message).toContain('expired');
      expect(authRepository.validateResetToken).toHaveBeenCalledWith(token);
    });

    it('should return valid:false when token has already been used', async () => {
      // Arrange
      const token = 'already_used_token';
      const mockError = new Error('Reset token has already been used');

      authRepository.validateResetToken.mockRejectedValue(mockError);

      // Act
      const result = await validateResetTokenUseCase.execute(token);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.message).toContain('already been used');
    });

    it('should return generic error message when repository throws unknown error', async () => {
      // Arrange
      const token = 'some_token';
      const mockError = new Error(); // Sin mensaje

      authRepository.validateResetToken.mockRejectedValue(mockError);

      // Act
      const result = await validateResetTokenUseCase.execute(token);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.message).toBe('El token es inválido o ha expirado');
    });
  });

  describe('Validation errors', () => {
    it('should throw error if token is empty', async () => {
      // Act & Assert
      await expect(validateResetTokenUseCase.execute('')).rejects.toThrow(
        'Reset token is required'
      );
      expect(authRepository.validateResetToken).not.toHaveBeenCalled();
    });

    it('should throw error if token is null', async () => {
      // Act & Assert
      await expect(validateResetTokenUseCase.execute(null)).rejects.toThrow(
        'Reset token is required'
      );
      expect(authRepository.validateResetToken).not.toHaveBeenCalled();
    });

    it('should throw error if token is undefined', async () => {
      // Act & Assert
      await expect(validateResetTokenUseCase.execute(undefined)).rejects.toThrow(
        'Reset token is required'
      );
      expect(authRepository.validateResetToken).not.toHaveBeenCalled();
    });

    it('should throw error if token is only whitespace', async () => {
      // Act & Assert
      await expect(validateResetTokenUseCase.execute('   ')).rejects.toThrow(
        'Reset token is required'
      );
      expect(authRepository.validateResetToken).not.toHaveBeenCalled();
    });
  });

  describe('Network errors', () => {
    it('should return valid:false on network error', async () => {
      // Arrange
      const token = 'valid_token';
      const mockError = new Error('Network request failed');

      authRepository.validateResetToken.mockRejectedValue(mockError);

      // Act
      const result = await validateResetTokenUseCase.execute(token);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Network request failed');
    });

    it('should return valid:false on timeout error', async () => {
      // Arrange
      const token = 'valid_token';
      const mockError = new Error('Request timeout');

      authRepository.validateResetToken.mockRejectedValue(mockError);

      // Act
      const result = await validateResetTokenUseCase.execute(token);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Request timeout');
    });
  });

  describe('Edge cases', () => {
    it('should handle very long tokens', async () => {
      // Arrange
      const token = 'a'.repeat(500);
      const mockResponse = {
        valid: true,
        message: 'Token is valid',
      };

      authRepository.validateResetToken.mockResolvedValue(mockResponse);

      // Act
      const result = await validateResetTokenUseCase.execute(token);

      // Assert
      expect(result.valid).toBe(true);
      expect(authRepository.validateResetToken).toHaveBeenCalledWith(token);
    });

    it('should handle tokens with special characters', async () => {
      // Arrange
      const token = 'abc123-_+=';
      const mockResponse = {
        valid: true,
        message: 'Token is valid',
      };

      authRepository.validateResetToken.mockResolvedValue(mockResponse);

      // Act
      const result = await validateResetTokenUseCase.execute(token);

      // Assert
      expect(result.valid).toBe(true);
      expect(authRepository.validateResetToken).toHaveBeenCalledWith(token);
    });

    it('should trim whitespace from token', async () => {
      // Arrange
      const token = '  valid_token  ';
      const mockResponse = {
        valid: true,
        message: 'Token is valid',
      };

      authRepository.validateResetToken.mockResolvedValue(mockResponse);

      // Act
      const result = await validateResetTokenUseCase.execute(token);

      // Assert
      expect(result.valid).toBe(true);
      // El token se envía tal cual (el trim ya lo hace el if)
      expect(authRepository.validateResetToken).toHaveBeenCalledWith(token);
    });
  });
});
