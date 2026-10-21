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

  // FE #785: la API no responde a un token inválido con un error (eso va como
  // valid:false, arriba). Lo que llega como error —la red caída, el 429 del
  // límite, un 5xx— no dice nada del enlace: el caso de uso lo deja pasar tal
  // cual y la página lo clasifica (utils/sinCobertura), en vez de convertirlo
  // en «enlace no válido».
  //
  //   #   el repositorio lanza          | el caso de uso
  //   ----|-----------------------------|---------------------------------
  //   E1  TypeError (sin conexión)      | lo relanza, el mismo
  //   E2  Error con status 429          | lo relanza, con su status
  //   E3  Error con status 500          | lo relanza, el mismo
  //   E4  Error sin status ni mensaje   | lo relanza: tampoco es un enlace malo
  describe('Network and HTTP errors are rethrown (FE #785)', () => {
    it('E1: a network failure is rethrown, not turned into valid:false', async () => {
      const error = new TypeError('common:sinConexion.mensaje');
      authRepository.validateResetToken.mockRejectedValue(error);

      await expect(validateResetTokenUseCase.execute('a'.repeat(48))).rejects.toBe(error);
      expect(authRepository.validateResetToken).toHaveBeenCalledWith('a'.repeat(48));
    });

    it('E2: a 429 is rethrown with its status', async () => {
      const error = Object.assign(new Error('common:demasiadasPeticiones'), { status: 429 });
      authRepository.validateResetToken.mockRejectedValue(error);

      await expect(validateResetTokenUseCase.execute('a'.repeat(48))).rejects.toMatchObject({
        status: 429,
      });
    });

    it('E3: a server error is rethrown', async () => {
      const error = Object.assign(new Error('Internal Server Error'), { status: 500 });
      authRepository.validateResetToken.mockRejectedValue(error);

      await expect(validateResetTokenUseCase.execute('a'.repeat(48))).rejects.toBe(error);
    });

    it('E4: an unknown error is rethrown too', async () => {
      const error = new Error();
      authRepository.validateResetToken.mockRejectedValue(error);

      await expect(validateResetTokenUseCase.execute('a'.repeat(48))).rejects.toBe(error);
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
