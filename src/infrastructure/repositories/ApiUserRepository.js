import User from '../../domain/entities/User.js';
import IUserRepository from '../../domain/repositories/IUserRepository.js';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

class ApiUserRepository extends IUserRepository {
  constructor({ authTokenProvider }) {
    super(); // Llama al constructor de la clase base
    this.authTokenProvider = authTokenProvider;
  }

  /**
   * @override
   */
  async getById(userId) {
    const token = this.authTokenProvider.getToken();
    const response = await fetch(`${API_URL}/api/v1/users/${userId}`, { // Asumiendo este endpoint
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to fetch user with id ${userId}`);
    }

    const data = await response.json();
    return new User(data); // Mapeamos el DTO de la API a nuestra entidad de dominio
  }

  /**
   * @override
   */
  async update(userId, updateData) { // <-- Nueva firma
    const token = this.authTokenProvider.getToken();
    
    // El payload ahora es directamente los datos a actualizar, mapeados al formato de la API
    const payload = {
      first_name: updateData.firstName,
      last_name: updateData.lastName
    };

    const response = await fetch(`${API_URL}/api/v1/users/profile`, { // Endpoint del proyecto actual
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to update user');
    }

    const data = await response.json();
    // La API devuelve el usuario completo con los cambios aplicados
    return new User(data.user); 
  }

  /**
   * @override
   */
  async updateSecurity(userId, securityData) {
    const token = this.authTokenProvider.getToken();

    const payload = {
      current_password: securityData.currentPassword,
    };

    if (securityData.email) {
      payload.new_email = securityData.email;
    }
    if (securityData.newPassword) {
      payload.new_password = securityData.newPassword;
      if (securityData.confirmPassword) {
        payload.confirm_password = securityData.confirmPassword;
      }
    }

    const response = await fetch(`${API_URL}/api/v1/users/security`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      let errorMessage = 'Failed to update security info';
      
      if (errorData.detail) {
        if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail.map(err => `${err.loc[1]}: ${err.msg}`).join('; ');
        } else if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        }
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return new User(data.user);
  }
}

export default ApiUserRepository;