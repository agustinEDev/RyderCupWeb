/**
 * Tests for ApiAuthRepository
 * v1.13.0: Account Lockout handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import ApiAuthRepository from './ApiAuthRepository';
import User from '../../domain/entities/User';
import Email from '../../domain/value_objects/Email';
import Password from '../../domain/value_objects/Password';
import * as api from '../http/api.js';

// Mock api module
vi.mock('../http/api.js', () => ({
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
    it('should throw a LOGIN_LOCKED error for a lockout (HTTP 423)', async () => {
      const email = new Email('locked@example.com');
      const password = new Password('Password123', { validateStrength: false });

      // Mock apiRequest to throw HTTP 423 error with status property
      const error = new Error('Locked');
      error.status = 423;
      mockApiRequest.mockRejectedValue(error);

      // Con su código: el texto lo pone la pantalla, traducido (BE #732)
      await expect(repository.login(email, password)).rejects.toMatchObject({ code: 'LOGIN_LOCKED' });

      expect(mockApiRequest).toHaveBeenCalledWith('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'locked@example.com',
          password: 'Password123',
        }),
      });
    });

    it('should give the same LOGIN_LOCKED code whatever message the backend sends', async () => {
      const email = new Email('test@example.com');
      const password = new Password('Password123', { validateStrength: false });

      const error = new Error('Account locked due to too many failed login attempts');
      error.status = 423;
      mockApiRequest.mockRejectedValue(error);

      await expect(repository.login(email, password)).rejects.toMatchObject({ code: 'LOGIN_LOCKED' });
    });

    it('should distinguish HTTP 423 from HTTP 401', async () => {
      const email = new Email('wrong@example.com');
      const password = new Password('WrongPassword', { validateStrength: false });

      // Mock 401 error (invalid credentials) with status property
      const error = new Error('Unauthorized');
      error.status = 401;
      mockApiRequest.mockRejectedValue(error);

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

// F1: el backend exige `accept_terms: true` en el registro (sin él, 422)
describe('ApiAuthRepository · register con la aceptación de los Términos', () => {
  beforeEach(() => vi.clearAllMocks());

  it('envía accept_terms: true', async () => {
    api.default.mockResolvedValue({ id: 'u-1', email: 'ana@example.com', first_name: 'Ana', last_name: 'Prueba' });

    await new ApiAuthRepository().register({
      firstName: 'Ana',
      lastName: 'Prueba',
      email: new Email('ana@example.com'),
      password: new Password('Valida-Prueba123!'),
      countryCode: null,
      gender: null,
      acceptTerms: true,
    });

    const [ruta, opciones] = api.default.mock.calls[0];
    expect(ruta).toBe('/api/v1/auth/register');
    expect(JSON.parse(opciones.body)).toMatchObject({ accept_terms: true });
  });

  // RyderCupAm #750: el 403 de cuenta desactivada llega a la pantalla con su código
  describe('cuenta desactivada (403 ACCOUNT_DEACTIVATED)', () => {
    const desactivada = () =>
      Object.assign(new Error('This account has been deactivated. Contact an administrator.'), {
        status: 403,
        errorCode: 'ACCOUNT_DEACTIVATED',
      });

    it('el login lo deja pasar con su errorCode', async () => {
      api.default.mockRejectedValue(desactivada());

      await expect(
        new ApiAuthRepository().login(
          new Email('baja@example.com'),
          new Password('Password123', { validateStrength: false })
        )
      ).rejects.toMatchObject({ status: 403, errorCode: 'ACCOUNT_DEACTIVATED' });
    });

    it('la verificación del correo también', async () => {
      api.default.mockRejectedValue(desactivada());

      await expect(new ApiAuthRepository().verifyEmail('token')).rejects.toMatchObject({
        status: 403,
        errorCode: 'ACCOUNT_DEACTIVATED',
      });
    });
  });

  describe('verificar el correo, con la respuesta de antes y la nueva (RyderCupAm #753)', () => {
    it('el backend nuevo solo verifica: sin sesión', async () => {
      api.default.mockResolvedValue({ message: 'Email verified. Please sign in.', email_verified: true });

      await expect(new ApiAuthRepository().verifyEmail('token')).resolves.toEqual({ sesionAbierta: false });
    });

    it('el de antes abre sesión, con su usuario', async () => {
      api.default.mockResolvedValue({
        access_token: 'acceso',
        csrf_token: 'csrf',
        user: { id: 'u-1', email: 'ana@example.com', first_name: 'Ana', last_name: 'Prueba' },
      });

      const resultado = await new ApiAuthRepository().verifyEmail('token');

      expect(resultado.sesionAbierta).toBe(true);
      expect(resultado.user).toBeInstanceOf(User);
      expect(resultado.csrfToken).toBe('csrf');
    });
  });

  describe('reauthenticate (RyderCupAm #753)', () => {
    it('manda la contraseña y devuelve cuánto dura la marca', async () => {
      api.default.mockResolvedValue({ expires_in: 300 });

      const resultado = await new ApiAuthRepository().reauthenticate('Actual123!');

      expect(api.default).toHaveBeenCalledWith('/api/v1/auth/reauthenticate', {
        method: 'POST',
        body: JSON.stringify({ password: 'Actual123!' }),
      });
      expect(resultado).toEqual({ expiresIn: 300 });
    });
  });
});
