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
      expect(result.message).toBe('Token is valid. You can proceed to change your password.');
    });
  });

  // FE #775: la API responde a un token inválido o caducado con 200 y
  // { valid: false }, no con un error. Los tests de abajo lo modelaban como un
  // rechazo, y el caso de uso daba por válido cualquier 200: un enlace caducado
  // enseñaba el formulario.
  //
  //   #   el repositorio devuelve          | el caso de uso
  //   ----|-------------------------------|---------------------------------
  //   V1  { valid: false, message }       | valid: false con ese mensaje
  //   V2  { valid: false } sin mensaje    | valid: false con el mensaje por defecto
  //   V3  sin el campo valid              | valid: false: solo vale un true explícito
  describe('Invalid token answered with 200 (FE #775)', () => {
    it('V1: valid:false from the API is invalid, with its message', async () => {
      authRepository.validateResetToken.mockResolvedValue({
        valid: false,
        message: 'Token de reseteo inválido o expirado. Solicita un nuevo enlace.',
      });

      const result = await validateResetTokenUseCase.execute('a'.repeat(48));

      expect(result).toEqual({
        valid: false,
        message: 'Token de reseteo inválido o expirado. Solicita un nuevo enlace.',
      });
    });

    it('V2: valid:false without a message gets the default invalid message', async () => {
      authRepository.validateResetToken.mockResolvedValue({ valid: false });

      const result = await validateResetTokenUseCase.execute('a'.repeat(48));

      expect(result).toEqual({ valid: false, message: 'The token is invalid or has expired' });
    });

    it('V3: an answer without valid is not a valid token', async () => {
      authRepository.validateResetToken.mockResolvedValue({ message: 'algo' });

      const result = await validateResetTokenUseCase.execute('a'.repeat(48));

      expect(result.valid).toBe(false);
    });
  });

  // El catch: la API no responde a un token inválido con un error (eso va como
  // valid:false, arriba). Aquí llegan la red caída y los errores HTTP, como el
  // 429 del límite de peticiones o un 5xx
  describe('Network and HTTP errors (catch)', () => {
    it('should return valid:false with the error message when rate limited (429)', async () => {
      // Arrange
      const token = 'a'.repeat(48);
      const mockError = new Error('Too many requests');

      authRepository.validateResetToken.mockRejectedValue(mockError);

      // Act
      const result = await validateResetTokenUseCase.execute(token);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Too many requests');
      expect(authRepository.validateResetToken).toHaveBeenCalledWith(token);
    });

    it('should return valid:false with the error message on a server error', async () => {
      // Arrange
      const token = 'a'.repeat(48);
      const mockError = new Error('Error interno del servidor');

      authRepository.validateResetToken.mockRejectedValue(mockError);

      // Act
      const result = await validateResetTokenUseCase.execute(token);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Error interno del servidor');
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
      expect(result.message).toBe('The token is invalid or has expired');
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

    it('should pass tokens with whitespace as-is to repository', async () => {
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
      // Token is sent unchanged - trim is only used for validation check
      expect(authRepository.validateResetToken).toHaveBeenCalledWith(token);
    });
  });
});
