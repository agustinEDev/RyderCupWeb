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
    console.log('🔍 [ApiUserRepository.getById] Fetching user:', userId);
    const token = this.authTokenProvider.getToken();

    // Usar current-user en lugar de /users/{userId}
    // El userId se ignora porque obtenemos el usuario del token JWT
    const response = await fetch(`${API_URL}/api/v1/auth/current-user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.error('❌ [ApiUserRepository.getById] Failed to fetch user:', response.status);
      if (response.status === 404 || response.status === 401) return null;
      throw new Error(`Failed to fetch current user`);
    }

    const data = await response.json();
    console.log('🔍 [ApiUserRepository.getById] API response data:', {
      userId: data.id,
      hasCountryCode: 'country_code' in data,
      countryCodeValue: data.country_code,
      countryCodeType: typeof data.country_code,
      allKeys: Object.keys(data)
    });

    const userEntity = new User(data);
    console.log('🔍 [ApiUserRepository.getById] User entity created:', {
      hasCountryCode: !!userEntity.countryCode,
      countryCodeType: userEntity.countryCode ? typeof userEntity.countryCode : 'undefined',
      countryCodeValue: userEntity.countryCode?.value ? userEntity.countryCode.value() : 'no value() method'
    });

    return userEntity; // Mapeamos el DTO de la API a nuestra entidad de dominio
  }

  /**
   * @override
   */
  async update(userId, updateData) { // <-- Nueva firma
    const token = this.authTokenProvider.getToken();

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