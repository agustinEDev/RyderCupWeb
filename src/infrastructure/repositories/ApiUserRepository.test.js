import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ApiUserRepository from './ApiUserRepository';
import User from '../../domain/entities/User';

// Mock del módulo api.js centralizado
vi.mock('../../services/api.js', () => ({
  default: vi.fn() // Mockear la función apiRequest
}));

// Importar el mock para poder usarlo en los tests
import apiRequest from '../../services/api.js';

describe('ApiUserRepository', () => {
  let apiUserRepository;

  beforeEach(() => {
    vi.clearAllMocks();

    // Inicializar repositorio SIN authTokenProvider
    // El constructor ya no recibe parámetros (cookies httpOnly manejan auth)
    apiUserRepository = new ApiUserRepository();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getById', () => {
    it('should fetch user from /api/v1/auth/current-user endpoint', async () => {
      // Arrange: Preparar datos de prueba
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

      // Configurar el mock para que retorne los datos
      apiRequest.mockResolvedValueOnce(mockUserData);

      // Act: Ejecutar el método que estamos testeando
      const user = await apiUserRepository.getById(userId);

      // Assert: Verificar que todo funcionó correctamente
      expect(apiRequest).toHaveBeenCalledWith('/api/v1/auth/current-user');
      expect(apiRequest).toHaveBeenCalledTimes(1);
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

      apiRequest.mockResolvedValueOnce(mockUserData);

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

      apiRequest.mockResolvedValueOnce(mockUserData);

      // Act
      const user = await apiUserRepository.getById(userId);

      // Assert
      expect(user).toBeInstanceOf(User);
      expect(user.countryCode).toBeNull();
    });

    it('should throw error if apiRequest fails', async () => {
      // Arrange
      const userId = 'user-123';
      const errorMessage = 'HTTP 500: Internal Server Error';

      // Configurar el mock para que rechace (simular error de API)
      apiRequest.mockRejectedValueOnce(new Error(errorMessage));

      // Act & Assert: Verificar que el error se propaga
      await expect(apiUserRepository.getById(userId))
        .rejects.toThrow(errorMessage);

      expect(apiRequest).toHaveBeenCalledWith('/api/v1/auth/current-user');
    });

    it('should ignore userId parameter and always fetch current user', async () => {
      // Arrange: Preparar dos userId diferentes
      const userId1 = 'user-123';
      const userId2 = 'user-456';

      const mockUserData = {
        id: 'current-user-id',
        email: 'current@example.com',
        first_name: 'Current',
        last_name: 'User',
        country_code: 'ES'
      };

      // Configurar el mock para que SIEMPRE retorne el mismo usuario
      apiRequest.mockResolvedValue(mockUserData);

      // Act: Llamar dos veces con diferentes userId
      const user1 = await apiUserRepository.getById(userId1);
      const user2 = await apiUserRepository.getById(userId2);

      // Assert: Verificar que ambas llamadas fueron al mismo endpoint
      expect(apiRequest).toHaveBeenCalledTimes(2);
      expect(apiRequest).toHaveBeenNthCalledWith(1, '/api/v1/auth/current-user');
      expect(apiRequest).toHaveBeenNthCalledWith(2, '/api/v1/auth/current-user');

      // Verificar que ambas retornan el MISMO usuario (el del token)
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

      apiRequest.mockResolvedValueOnce(mockUpdatedUser);

      // Act
      const user = await apiUserRepository.update(userId, updateData);

      // Assert
      expect(apiRequest).toHaveBeenCalledWith(
        '/api/v1/users/profile',
        {
          method: 'PATCH',
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

      apiRequest.mockRejectedValueOnce(new Error('Update failed'));

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

      apiRequest.mockResolvedValueOnce(mockUpdatedUser);

      // Act
      const user = await apiUserRepository.updateSecurity(userId, securityData);

      // Assert
      expect(apiRequest).toHaveBeenCalledWith(
        '/api/v1/users/security',
        expect.objectContaining({
          method: 'PATCH',
          body: expect.stringContaining('current_password')
        })
      );

      // Verificar el contenido del body (sin importar el orden)
      const [[, options]] = apiRequest.mock.calls;
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
