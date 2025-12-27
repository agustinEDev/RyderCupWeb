import { describe, it, expect, vi, beforeEach } from 'vitest';
import ResetPasswordUseCase from './ResetPasswordUseCase';

describe('ResetPasswordUseCase', () => {
  let authRepository;
  let resetPasswordUseCase;

  beforeEach(() => {
    vi.clearAllMocks();

    authRepository = {
      resetPassword: vi.fn(),
    };

    resetPasswordUseCase = new ResetPasswordUseCase({ authRepository });
  });

  describe('Successful password reset', () => {
    it('should successfully reset password with valid token and password', async () => {
      // Arrange
      const token = 'valid_256_bit_token';
      const newPassword = 'NewSecurePass123';
      const mockResponse = {
        message: 'Password has been successfully reset. All sessions have been invalidated.',
      };

      authRepository.resetPassword.mockResolvedValue(mockResponse);

      // Act
      const result = await resetPasswordUseCase.execute(token, newPassword);

      // Assert
      expect(authRepository.resetPassword).toHaveBeenCalledWith(token, newPassword);
      expect(authRepository.resetPassword).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        success: true,
        message: mockResponse.message,
      });
    });

    it('should return default message if repository returns no message', async () => {
      // Arrange
      const token = 'valid_token';
      const newPassword = 'ValidPassword123';
      const mockResponse = {}; // Sin message

      authRepository.resetPassword.mockResolvedValue(mockResponse);

      // Act
      const result = await resetPasswordUseCase.execute(token, newPassword);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe(
        'Contraseña cambiada exitosamente. Por favor, inicia sesión nuevamente.'
      );
    });
  });

  describe('Token validation', () => {
    it('should throw error if token is empty', async () => {
      // Act & Assert
      await expect(resetPasswordUseCase.execute('', 'ValidPassword123')).rejects.toThrow(
        'Reset token is required'
      );
      expect(authRepository.resetPassword).not.toHaveBeenCalled();
    });

    it('should throw error if token is null', async () => {
      // Act & Assert
      await expect(resetPasswordUseCase.execute(null, 'ValidPassword123')).rejects.toThrow(
        'Reset token is required'
      );
      expect(authRepository.resetPassword).not.toHaveBeenCalled();
    });

    it('should throw error if token is undefined', async () => {
      // Act & Assert
      await expect(resetPasswordUseCase.execute(undefined, 'ValidPassword123')).rejects.toThrow(
        'Reset token is required'
      );
      expect(authRepository.resetPassword).not.toHaveBeenCalled();
    });

    it('should throw error if token is only whitespace', async () => {
      // Act & Assert
      await expect(resetPasswordUseCase.execute('   ', 'ValidPassword123')).rejects.toThrow(
        'Reset token is required'
      );
      expect(authRepository.resetPassword).not.toHaveBeenCalled();
    });
  });

  describe('Password validation (OWASP ASVS V2.1)', () => {
    it('should throw error if password is empty', async () => {
      // Act & Assert
      await expect(resetPasswordUseCase.execute('valid_token', '')).rejects.toThrow(
        'Password is required'
      );
      expect(authRepository.resetPassword).not.toHaveBeenCalled();
    });

    it('should throw error if password is too short (<12 chars)', async () => {
      // Act & Assert
      await expect(resetPasswordUseCase.execute('valid_token', 'Short1')).rejects.toThrow(
        'Password must be at least 12 characters'
      );
      expect(authRepository.resetPassword).not.toHaveBeenCalled();
    });

    it('should throw error if password is too long (>128 chars)', async () => {
      // Arrange
      const longPassword = 'A'.repeat(129) + '1a';

      // Act & Assert
      await expect(resetPasswordUseCase.execute('valid_token', longPassword)).rejects.toThrow(
        'Password must not exceed 128 characters'
      );
      expect(authRepository.resetPassword).not.toHaveBeenCalled();
    });

    it('should throw error if password lacks uppercase letters', async () => {
      // Act & Assert
      await expect(
        resetPasswordUseCase.execute('valid_token', 'lowercase123')
      ).rejects.toThrow('uppercase');
      expect(authRepository.resetPassword).not.toHaveBeenCalled();
    });

    it('should throw error if password lacks lowercase letters', async () => {
      // Act & Assert
      await expect(
        resetPasswordUseCase.execute('valid_token', 'UPPERCASE123')
      ).rejects.toThrow('lowercase');
      expect(authRepository.resetPassword).not.toHaveBeenCalled();
    });

    it('should throw error if password lacks numbers', async () => {
      // Act & Assert
      await expect(
        resetPasswordUseCase.execute('valid_token', 'NoNumbersHere')
      ).rejects.toThrow('number');
      expect(authRepository.resetPassword).not.toHaveBeenCalled();
    });

    it('should accept password with exactly 12 characters (minimum)', async () => {
      // Arrange
      const token = 'valid_token';
      const newPassword = 'ValidPass123'; // Exactamente 12 caracteres
      const mockResponse = { message: 'Success' };

      authRepository.resetPassword.mockResolvedValue(mockResponse);

      // Act
      const result = await resetPasswordUseCase.execute(token, newPassword);

      // Assert
      expect(result.success).toBe(true);
      expect(authRepository.resetPassword).toHaveBeenCalledWith(token, newPassword);
    });

    it('should accept password with exactly 128 characters (maximum)', async () => {
      // Arrange
      const token = 'valid_token';
      const newPassword = 'A'.repeat(126) + '1a'; // Exactamente 128 caracteres
      const mockResponse = { message: 'Success' };

      authRepository.resetPassword.mockResolvedValue(mockResponse);

      // Act
      const result = await resetPasswordUseCase.execute(token, newPassword);

      // Assert
      expect(result.success).toBe(true);
      expect(authRepository.resetPassword).toHaveBeenCalledWith(token, newPassword);
    });

    it('should accept password with special characters', async () => {
      // Arrange
      const token = 'valid_token';
      const newPassword = 'Complex!Pass@123';
      const mockResponse = { message: 'Success' };

      authRepository.resetPassword.mockResolvedValue(mockResponse);

      // Act
      const result = await resetPasswordUseCase.execute(token, newPassword);

      // Assert
      expect(result.success).toBe(true);
      expect(authRepository.resetPassword).toHaveBeenCalledWith(token, newPassword);
    });
  });

  describe('Repository errors', () => {
    it('should propagate error when token is invalid', async () => {
      // Arrange
      const token = 'invalid_token';
      const newPassword = 'ValidPassword123';
      const mockError = new Error('Invalid reset token');

      authRepository.resetPassword.mockRejectedValue(mockError);

      // Act & Assert
      await expect(resetPasswordUseCase.execute(token, newPassword)).rejects.toThrow(
        'Invalid reset token'
      );
      expect(authRepository.resetPassword).toHaveBeenCalledWith(token, newPassword);
    });

    it('should propagate error when token is expired', async () => {
      // Arrange
      const token = 'expired_token';
      const newPassword = 'ValidPassword123';
      const mockError = new Error('Reset token has expired');

      authRepository.resetPassword.mockRejectedValue(mockError);

      // Act & Assert
      await expect(resetPasswordUseCase.execute(token, newPassword)).rejects.toThrow(
        'expired'
      );
      expect(authRepository.resetPassword).toHaveBeenCalledWith(token, newPassword);
    });

    it('should propagate error when token has already been used', async () => {
      // Arrange
      const token = 'used_token';
      const newPassword = 'ValidPassword123';
      const mockError = new Error('Reset token has already been used');

      authRepository.resetPassword.mockRejectedValue(mockError);

      // Act & Assert
      await expect(resetPasswordUseCase.execute(token, newPassword)).rejects.toThrow(
        'already been used'
      );
    });

    it('should propagate rate limiting errors (429)', async () => {
      // Arrange
      const token = 'valid_token';
      const newPassword = 'ValidPassword123';
      const mockError = new Error('Rate limit exceeded. Please wait 60 minutes.');

      authRepository.resetPassword.mockRejectedValue(mockError);

      // Act & Assert
      await expect(resetPasswordUseCase.execute(token, newPassword)).rejects.toThrow(
        'Rate limit exceeded'
      );
    });

    it('should propagate network errors', async () => {
      // Arrange
      const token = 'valid_token';
      const newPassword = 'ValidPassword123';
      const mockError = new Error('Network request failed');

      authRepository.resetPassword.mockRejectedValue(mockError);

      // Act & Assert
      await expect(resetPasswordUseCase.execute(token, newPassword)).rejects.toThrow(
        'Network request failed'
      );
    });

    it('should propagate server errors (500)', async () => {
      // Arrange
      const token = 'valid_token';
      const newPassword = 'ValidPassword123';
      const mockError = new Error('Internal server error');

      authRepository.resetPassword.mockRejectedValue(mockError);

      // Act & Assert
      await expect(resetPasswordUseCase.execute(token, newPassword)).rejects.toThrow(
        'Internal server error'
      );
    });
  });

  describe('Security considerations', () => {
    it('should validate password BEFORE calling repository', async () => {
      // Arrange
      const token = 'valid_token';
      const weakPassword = 'weak';

      // Act & Assert
      await expect(resetPasswordUseCase.execute(token, weakPassword)).rejects.toThrow();

      // Repository NO debe ser llamado si la validación falla
      expect(authRepository.resetPassword).not.toHaveBeenCalled();
    });

    it('should call repository only with valid password', async () => {
      // Arrange
      const token = 'valid_token';
      const strongPassword = 'StrongPassword123';
      const mockResponse = { message: 'Success' };

      authRepository.resetPassword.mockResolvedValue(mockResponse);

      // Act
      await resetPasswordUseCase.execute(token, strongPassword);

      // Assert
      // Repository SOLO debe ser llamado si la validación pasa
      expect(authRepository.resetPassword).toHaveBeenCalledTimes(1);
      expect(authRepository.resetPassword).toHaveBeenCalledWith(token, strongPassword);
    });

    it('should not leak whether token is valid before validating password', async () => {
      // Arrange
      const token = 'unknown_token';
      const weakPassword = 'weak';

      // Act & Assert
      // La validación de contraseña debe ocurrir ANTES de llamar al repositorio
      // Esto previene timing attacks (no revelar si el token es válido)
      await expect(resetPasswordUseCase.execute(token, weakPassword)).rejects.toThrow(
        'Password'
      );

      expect(authRepository.resetPassword).not.toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('should handle password with unicode characters', async () => {
      // Arrange
      const token = 'valid_token';
      const newPassword = 'Contraseña123🔒'; // 15 caracteres con emoji
      const mockResponse = { message: 'Success' };

      authRepository.resetPassword.mockResolvedValue(mockResponse);

      // Act
      const result = await resetPasswordUseCase.execute(token, newPassword);

      // Assert
      expect(result.success).toBe(true);
      expect(authRepository.resetPassword).toHaveBeenCalledWith(token, newPassword);
    });

    it('should handle password with accents and special chars', async () => {
      // Arrange
      const token = 'valid_token';
      const newPassword = 'Contraseña@2023';
      const mockResponse = { message: 'Success' };

      authRepository.resetPassword.mockResolvedValue(mockResponse);

      // Act
      const result = await resetPasswordUseCase.execute(token, newPassword);

      // Assert
      expect(result.success).toBe(true);
      expect(authRepository.resetPassword).toHaveBeenCalledWith(token, newPassword);
    });
  });
});
