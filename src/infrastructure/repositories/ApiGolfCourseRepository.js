import GolfCourse from '../../domain/entities/GolfCourse.js';
import IGolfCourseRepository from '../../domain/repositories/IGolfCourseRepository.js';
import apiRequest from '../../services/api.js';

/**
 * API Implementation of Golf Course Repository
 * Consumes backend Golf Course API v2.0.2
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

    const queryString = queryParams.toString();
    const url = `/api/v1/golf-courses${queryString ? `?${queryString}` : ''}`;

    const data = await apiRequest(url);

    return data.golf_courses.map(courseData => new GolfCourse(courseData));
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
        tee_category: tee.teeCategory || tee.tee_category,
        identifier: tee.identifier,
        course_rating: tee.courseRating || tee.course_rating,
        slope_rating: tee.slopeRating || tee.slope_rating,
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
