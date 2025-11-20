import User from '../../domain/entities/User.js';
import IUserRepository from '../../domain/repositories/IUserRepository.js';
import Email from '../../domain/value_objects/Email';
import Password from '../../domain/value_objects/Password'; // 1. Importar Password VO

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

    const payload = {}; // Iniciar payload vacío y añadir propiedades condicionalmente

    if (securityData.current_password) { // Usar snake_case
      payload.current_password = securityData.current_password.getValue(); // <-- CAMBIO AQUÍ: Usar getValue()
    }

    if (securityData.new_password) { // Usar snake_case
      payload.new_password = securityData.new_password.getValue(); // <-- CAMBIO AQUÍ: Usar getValue()
      // La API puede esperar confirm_password si se actualiza new_password
      if (securityData.confirm_password) { // Si el caso de uso la pasa, que la pase como cadena
        payload.confirm_password = securityData.confirm_password; 
      }
    }
    
    // Si existe new_email, extraer su valor
    if (securityData.new_email) {
      payload.new_email = securityData.new_email.getValue();
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