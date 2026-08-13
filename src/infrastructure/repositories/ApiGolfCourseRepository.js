import GolfCourse from '../../domain/entities/GolfCourse.js';
import IGolfCourseRepository from '../../domain/repositories/IGolfCourseRepository.js';
import apiRequest from '../../services/api.js';

/**
 * API Implementation of Golf Course Repository
 * Consumes backend Golf Course API v2.0.0
 */
class ApiGolfCourseRepository extends IGolfCourseRepository {
  constructor() {
    super();
  }

  /**
   * @override
   */
  async list(filters = {}) {
    const queryParams = new URLSearchParams();

    if (filters.approvalStatus) {
      queryParams.append('approval_status', filters.approvalStatus);
    }

    if (filters.countryCode) {
      queryParams.append('country_code', filters.countryCode);
    }

    // El nombre se filtra en la base de datos, no aquí: con 802 campos, traerse
    // el catálogo entero para buscar por texto son ~1,6 MB en cada visita
    if (filters.name) {
      queryParams.append('name', filters.name);
    }

    if (filters.limit != null) {
      queryParams.append('limit', String(filters.limit));
    }

    if (filters.offset) {
      queryParams.append('offset', String(filters.offset));
    }

    // Con posición, el backend ordena del más cercano al más lejano y añade la
    // distancia de cada campo. Las dos coordenadas van juntas o no van: media
    // coordenada es un 400. Se comparan contra null porque el meridiano de
    // Greenwich y el ecuador valen 0 y son posiciones válidas.
    if (filters.lat != null && filters.lon != null) {
      queryParams.append('lat', String(filters.lat));
      queryParams.append('lon', String(filters.lon));

      // Sin radio no se corta nada: en media España el campo más cercano está a
      // más de 50 km, y una lista vacía es peor respuesta que "a 78 km"
      if (filters.radiusKm != null) {
        queryParams.append('radius_km', String(filters.radiusKm));
      }
    }

    const queryString = queryParams.toString();
    const url = `/api/v1/golf-courses${queryString ? `?${queryString}` : ''}`;

    const data = await apiRequest(url);

    // `total` son los campos que cumplen el filtro, no los devueltos: es lo que
    // permite saber si hay más de los que caben en la página
    return {
      courses: data.golf_courses.map(courseData => new GolfCourse(courseData)),
      total: data.total ?? data.golf_courses.length,
    };
  }

  /**
   * @override
   */
  async getById(id) {
    const data = await apiRequest(`/api/v1/golf-courses/${id}`);
    return new GolfCourse(data);
  }

  /**
   * @override
   */
  async create(golfCourseData) {
    const payload = this._mapToApiPayload(golfCourseData);

    const data = await apiRequest('/api/v1/golf-courses/request', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return new GolfCourse(data);
  }

  /**
   * @override
   */
  async createAsAdmin(golfCourseData) {
    const payload = this._mapToApiPayload(golfCourseData);

    const data = await apiRequest('/api/v1/golf-courses/admin', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return new GolfCourse(data.golf_course || data);
  }

  /**
   * @override
   */
  async update(id, golfCourseData) {
    const payload = this._mapToApiPayload(golfCourseData);

    const data = await apiRequest(`/api/v1/golf-courses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    // Guard against missing data.golf_course
    if (!data.golf_course) {
      return {
        golfCourse: null,
        pendingUpdate: data.pending_update ? new GolfCourse(data.pending_update) : null,
      };
    }

    return {
      golfCourse: new GolfCourse(data.golf_course),
      pendingUpdate: data.pending_update ? new GolfCourse(data.pending_update) : null,
    };
  }

  /**
   * @override
   */
  async approve(id) {
    const data = await apiRequest(`/api/v1/golf-courses/admin/${id}/approve`, {
      method: 'PUT',
    });

    return new GolfCourse(data.golf_course || data);
  }

  /**
   * @override
   */
  async reject(id, reason) {
    const data = await apiRequest(`/api/v1/golf-courses/admin/${id}/reject?reason=${encodeURIComponent(reason)}`, {
      method: 'PUT',
    });

    return new GolfCourse(data.golf_course || data);
  }

  /**
   * @override
   */
  async approveUpdate(cloneId) {
    const data = await apiRequest(`/api/v1/golf-courses/admin/${cloneId}/approve-update`, {
      method: 'PUT',
    });

    return new GolfCourse(data.updated_golf_course || data.golf_course || data);
  }

  /**
   * @override
   */
  async rejectUpdate(cloneId) {
    const data = await apiRequest(`/api/v1/golf-courses/admin/${cloneId}/reject-update`, {
      method: 'PUT',
    });

    return new GolfCourse(data.original_golf_course || data.golf_course || data);
  }

  /**
   * @override
   */
  async listPending() {
    const data = await apiRequest('/api/v1/golf-courses/admin/pending');
    return data.golf_courses.map(courseData => new GolfCourse(courseData));
  }

  /**
   * Helper: Map domain model to API payload
   * @private
   */
  _mapToApiPayload(golfCourseData) {
    const payload = {
      name: golfCourseData.name,
      country_code: golfCourseData.countryCode || golfCourseData.country_code,
      course_type: golfCourseData.courseType || golfCourseData.course_type,
      tees: (golfCourseData.tees || []).map(tee => ({
        color: tee.color || tee.color,
        identifier: tee.identifier,
        course_rating: tee.courseRating || tee.course_rating,
        slope_rating: tee.slopeRating || tee.slope_rating,
        tee_gender: tee.teeGender ?? tee.tee_gender ?? tee.gender ?? null,
      })),
      holes: (golfCourseData.holes || []).map(hole => ({
        hole_number: hole.holeNumber || hole.hole_number,
        par: hole.par,
        stroke_index: hole.strokeIndex || hole.stroke_index,
      })),
    };

    return payload;
  }
}

export default ApiGolfCourseRepository;
