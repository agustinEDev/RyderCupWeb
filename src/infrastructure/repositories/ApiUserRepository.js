/* eslint-disable no-unused-vars */
import User from '../../domain/entities/User.js';
import IUserRepository from '../../domain/repositories/IUserRepository.js';
import apiRequest from '../../services/api.js';

class ApiUserRepository extends IUserRepository {
  constructor() {
    super(); // Llama al constructor de la clase base
    // httpOnly cookies manejan la autenticación automáticamente
  }

  /**
   * @override
   */
  async getById(userId) {
    // Usar current-user en lugar de /users/{userId}
    // El userId se ignora porque obtenemos el usuario del token JWT
    const data = await apiRequest('/api/v1/auth/current-user');

    const userEntity = new User(data);

    return userEntity; // Mapeamos el DTO de la API a nuestra entidad de dominio
  }

  /**
   * @override
   */
  async update(userId, updateData) {
    // El payload ahora es directamente los datos a actualizar, mapeados al formato de la API
    const payload = {};

    // Solo agregar campos que están presentes en updateData
    if (updateData.firstName !== undefined) {
      payload.first_name = updateData.firstName;
    }
    if (updateData.lastName !== undefined) {
      payload.last_name = updateData.lastName;
    }
    if (updateData.countryCode !== undefined) {
      // Convertir a snake_case para la API
      // Si countryCode es null, se envía null (permitir limpiar la nacionalidad)
      payload.country_code = updateData.countryCode;
    }

    const data = await apiRequest('/api/v1/users/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });

    // La API devuelve el usuario completo con los cambios aplicados
    return new User(data.user);
  }

  /**
   * @override
   */
  async updateSecurity(userId, securityData) {
    const payload = {}; // Iniciar payload vacío y añadir propiedades condicionalmente

    if (securityData.current_password) {
      payload.current_password = securityData.current_password.getValue();
    }

    if (securityData.new_password) {
      payload.new_password = securityData.new_password.getValue();
      // La API puede esperar confirm_password si se actualiza new_password
      if (securityData.confirm_password) {
        payload.confirm_password = securityData.confirm_password;
      }
    }

    // Si existe new_email, extraer su valor
    if (securityData.new_email) {
      payload.new_email = securityData.new_email.getValue();
    }

    const data = await apiRequest('/api/v1/users/security', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });

    return new User(data.user);
  }

  /**
   * @override
   */
  async getUserRoles(competitionId) {
    const data = await apiRequest(`/api/v1/users/me/roles/${competitionId}`);

    return {
      is_admin: data.is_admin,
      is_creator: data.is_creator,
      is_player: data.is_player,
    };
  }

  /**
   * @override
   */
  async assignRole(userId, roleName) {
    await apiRequest(`/api/v1/admin/users/${userId}/roles`, {
      method: 'POST',
      body: JSON.stringify({ role_name: roleName }),
    });
  }

  /**
   * @override
   */
  async removeRole(userId, roleName) {
    await apiRequest(`/api/v1/admin/users/${userId}/roles/${roleName}`, {
      method: 'DELETE',
    });
  }

  /**
   * @override
   */
  async list() {
    const data = await apiRequest('/api/v1/admin/users');

    // Mapear cada usuario del array a una instancia de User
    return data.users.map(userData => new User(userData));
  }
}

export default ApiUserRepository;
