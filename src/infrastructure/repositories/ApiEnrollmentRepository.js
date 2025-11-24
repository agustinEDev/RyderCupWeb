import IEnrollmentRepository from '../../domain/repositories/IEnrollmentRepository';
import EnrollmentMapper from '../mappers/EnrollmentMapper';
import { getAuthToken } from '../../utils/secureAuth';

/**
 * ApiEnrollmentRepository - Implementación del repositorio con API REST
 *
 * Implementa IEnrollmentRepository usando fetch API.
 * Compatible con backend Python FastAPI.
 *
 * Responsabilidades:
 * - Realizar llamadas HTTP a la API REST
 * - Manejar autenticación con JWT Bearer token
 * - Convertir respuestas de API a entidades del dominio usando EnrollmentMapper
 * - Manejar errores de red y de la API (404, 500, etc.)
 * - Construir URLs y query params correctamente
 *
 * Endpoints del backend:
 * - GET    /api/v1/competitions/{competitionId}/enrollments
 * - POST   /api/v1/competitions/{competitionId}/enrollments
 * - GET    /api/v1/competitions/{competitionId}/enrollments/{enrollmentId}
 * - POST   /api/v1/competitions/{competitionId}/enrollments/{enrollmentId}/approve
 * - POST   /api/v1/competitions/{competitionId}/enrollments/{enrollmentId}/reject
 * - POST   /api/v1/competitions/{competitionId}/enrollments/{enrollmentId}/cancel
 * - POST   /api/v1/competitions/{competitionId}/enrollments/{enrollmentId}/withdraw
 * - PUT    /api/v1/competitions/{competitionId}/enrollments/{enrollmentId}/handicap
 * - POST   /api/v1/competitions/{competitionId}/enrollments/direct
 * - DELETE /api/v1/competitions/{competitionId}/enrollments/{enrollmentId}
 */
class ApiEnrollmentRepository extends IEnrollmentRepository {
  #baseURL;
  #authTokenProvider;

  /**
   * Constructor
   *
   * @param {Object} config
   * @param {string} config.baseURL - Base URL de la API (ej: "http://localhost:8000")
   * @param {Object} config.authTokenProvider - Proveedor de tokens (opcional, usa secureAuth por defecto)
   */
  constructor(config = {}) {
    super();
    this.#baseURL = config.baseURL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    this.#authTokenProvider = config.authTokenProvider || { getToken: () => getAuthToken() };
  }

  // ===========================================
  // MÉTODOS PRIVADOS (HELPERS)
  // ===========================================

  /**
   * Realizar petición HTTP con manejo de errores
   *
   * @param {string} endpoint - Ruta del endpoint (ej: "/api/v1/enrollments")
   * @param {Object} options - Opciones de fetch
   * @returns {Promise<any>} Respuesta parseada
   * @private
   */
  async #request(endpoint, options = {}) {
    const url = `${this.#baseURL}${endpoint}`;
    const token = this.#authTokenProvider.getToken();

    // Headers por defecto
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Manejar respuestas sin contenido (204 No Content)
      if (response.status === 204) {
        return null;
      }

      // Intentar parsear JSON
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        // Si no es JSON válido y la respuesta es OK, retornar null
        if (response.ok) {
          return null;
        }
        throw new Error(`Invalid JSON response from API: ${parseError.message}`);
      }

      // Manejar errores HTTP
      if (!response.ok) {
        const errorMessage = data?.detail || data?.message || `HTTP ${response.status}`;
        throw new Error(errorMessage);
      }

      return data;
    } catch (error) {
      // Re-lanzar con contexto adicional
      if (error.message.includes('fetch')) {
        throw new Error(`Network error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Construir query string desde objeto de filtros
   *
   * @param {Object} filters
   * @returns {string} Query string (ej: "?status=APPROVED&team_id=1")
   * @private
   */
  #buildQueryString(filters) {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params.append(key, value);
      }
    });

    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
  }

  // ===========================================
  // IMPLEMENTACIÓN DE IEnrollmentRepository
  // ===========================================

  /**
   * Guardar un enrollment (crear o actualizar)
   *
   * NOTA: Típicamente no se usa directamente. Se prefieren métodos específicos
   * como requestEnrollment, approve, etc.
   *
   * @param {Enrollment} enrollment
   * @returns {Promise<Enrollment>}
   */
  async save(enrollment) {
    const dto = EnrollmentMapper.toDTO(enrollment);
    const competitionId = enrollment.competitionId;
    const enrollmentId = enrollment.enrollmentId.toString();

    // Si tiene ID, actualizar (PUT). Si no, crear (POST)
    const method = enrollmentId ? 'PUT' : 'POST';
    const endpoint = enrollmentId
      ? `/api/v1/competitions/${competitionId}/enrollments/${enrollmentId}`
      : `/api/v1/competitions/${competitionId}/enrollments`;

    const apiData = await this.#request(endpoint, {
      method,
      body: JSON.stringify(dto),
    });

    return EnrollmentMapper.toDomain(apiData);
  }

  /**
   * Buscar enrollment por ID
   *
   * @param {string} competitionId
   * @param {string} enrollmentId
   * @returns {Promise<Enrollment|null>}
   */
  async findById(competitionId, enrollmentId) {
    try {
      const apiData = await this.#request(
        `/api/v1/competitions/${competitionId}/enrollments/${enrollmentId}`
      );

      if (!apiData) {
        return null;
      }

      return EnrollmentMapper.toDomain(apiData);
    } catch (error) {
      // Si es 404, retornar null en lugar de lanzar error
      if (error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Buscar enrollments de una competición
   *
   * @param {string} competitionId
   * @param {Object} filters - { status?, userId?, teamId? }
   * @returns {Promise<Enrollment[]>}
   */
  async findByCompetition(competitionId, filters = {}) {
    // Mapear camelCase → snake_case para la API
    const apiFilters = {};
    if (filters.status) apiFilters.status = filters.status;
    if (filters.userId) apiFilters.user_id = filters.userId;
    if (filters.teamId) apiFilters.team_id = filters.teamId;

    const queryString = this.#buildQueryString(apiFilters);
    const apiDataArray = await this.#request(
      `/api/v1/competitions/${competitionId}/enrollments${queryString}`
    );

    if (!Array.isArray(apiDataArray)) {
      return [];
    }

    return EnrollmentMapper.toDomainMany(apiDataArray);
  }

  /**
   * Buscar enrollment de un usuario en una competición específica
   *
   * @param {string} competitionId
   * @param {string} userId
   * @returns {Promise<Enrollment|null>}
   */
  async findByCompetitionAndUser(competitionId, userId) {
    const enrollments = await this.findByCompetition(competitionId, { userId });

    // Debería haber máximo 1 enrollment por usuario por competición
    return enrollments.length > 0 ? enrollments[0] : null;
  }

  /**
   * Buscar enrollments de un usuario (todas sus inscripciones)
   *
   * @param {string} userId
   * @param {Object} filters - { status? }
   * @returns {Promise<Enrollment[]>}
   */
  async findByUser(userId, filters = {}) {
    const apiFilters = {
      user_id: userId,
      ...(filters.status && { status: filters.status }),
    };

    const queryString = this.#buildQueryString(apiFilters);
    const apiDataArray = await this.#request(`/api/v1/enrollments${queryString}`);

    if (!Array.isArray(apiDataArray)) {
      return [];
    }

    return EnrollmentMapper.toDomainMany(apiDataArray);
  }

  /**
   * Solicitar inscripción (crear enrollment con estado REQUESTED)
   *
   * @param {string} competitionId
   * @param {Object} data - Datos adicionales (opcional)
   * @returns {Promise<Enrollment>}
   */
  async requestEnrollment(competitionId, data = {}) {
    const apiData = await this.#request(`/api/v1/competitions/${competitionId}/enrollments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });

    return EnrollmentMapper.toDomain(apiData);
  }

  /**
   * Aprobar enrollment
   *
   * @param {string} competitionId
   * @param {string} enrollmentId
   * @param {string|null} teamId
   * @returns {Promise<Enrollment>}
   */
  async approve(competitionId, enrollmentId, teamId = null) {
    const body = teamId ? { team: teamId } : {};

    const apiData = await this.#request(
      `/api/v1/competitions/${competitionId}/enrollments/${enrollmentId}/approve`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    );

    return EnrollmentMapper.toDomain(apiData);
  }

  /**
   * Rechazar enrollment
   *
   * @param {string} competitionId
   * @param {string} enrollmentId
   * @returns {Promise<Enrollment>}
   */
  async reject(competitionId, enrollmentId) {
    const apiData = await this.#request(
      `/api/v1/competitions/${competitionId}/enrollments/${enrollmentId}/reject`,
      {
        method: 'POST',
      }
    );

    return EnrollmentMapper.toDomain(apiData);
  }

  /**
   * Cancelar enrollment (por el usuario)
   *
   * @param {string} competitionId
   * @param {string} enrollmentId
   * @returns {Promise<Enrollment>}
   */
  async cancel(competitionId, enrollmentId) {
    const apiData = await this.#request(
      `/api/v1/competitions/${competitionId}/enrollments/${enrollmentId}/cancel`,
      {
        method: 'POST',
      }
    );

    return EnrollmentMapper.toDomain(apiData);
  }

  /**
   * Retirar enrollment (por el usuario después de estar aprobado)
   *
   * @param {string} competitionId
   * @param {string} enrollmentId
   * @returns {Promise<Enrollment>}
   */
  async withdraw(competitionId, enrollmentId) {
    const apiData = await this.#request(
      `/api/v1/competitions/${competitionId}/enrollments/${enrollmentId}/withdraw`,
      {
        method: 'POST',
      }
    );

    return EnrollmentMapper.toDomain(apiData);
  }

  /**
   * Establecer handicap personalizado
   *
   * @param {string} competitionId
   * @param {string} enrollmentId
   * @param {number} customHandicap
   * @returns {Promise<Enrollment>}
   */
  async setCustomHandicap(competitionId, enrollmentId, customHandicap) {
    const apiData = await this.#request(
      `/api/v1/competitions/${competitionId}/enrollments/${enrollmentId}/handicap`,
      {
        method: 'PUT',
        body: JSON.stringify({ custom_handicap: customHandicap }),
      }
    );

    return EnrollmentMapper.toDomain(apiData);
  }

  /**
   * Inscripción directa por el creador (sin solicitud previa)
   *
   * @param {string} competitionId
   * @param {Object} data - { userId, customHandicap?, teamId? }
   * @returns {Promise<Enrollment>}
   */
  async directEnroll(competitionId, data) {
    const payload = {
      user_id: data.userId,
      ...(data.customHandicap !== null && data.customHandicap !== undefined && {
        custom_handicap: data.customHandicap,
      }),
      ...(data.teamId && { team_id: data.teamId }),
    };

    const apiData = await this.#request(
      `/api/v1/competitions/${competitionId}/enrollments/direct`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );

    return EnrollmentMapper.toDomain(apiData);
  }

  /**
   * Eliminar enrollment (DELETE físico)
   *
   * NOTA: Usar con precaución. Normalmente se prefiere cambiar a estado final.
   *
   * @param {string} competitionId
   * @param {string} enrollmentId
   * @returns {Promise<void>}
   */
  async delete(competitionId, enrollmentId) {
    await this.#request(
      `/api/v1/competitions/${competitionId}/enrollments/${enrollmentId}`,
      {
        method: 'DELETE',
      }
    );
  }
}

export default ApiEnrollmentRepository;
