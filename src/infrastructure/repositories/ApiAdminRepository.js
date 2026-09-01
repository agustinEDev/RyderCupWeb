import IAdminRepository from '../../domain/repositories/IAdminRepository.js';
import apiRequest from '../../services/api.js';

/**
 * API Implementation of Admin Repository
 * Consumes backend Admin Panel API (/api/v1/admin/*)
 */
class ApiAdminRepository extends IAdminRepository {
  /**
   * @override
   */
  async getStats() {
    const data = await apiRequest('/api/v1/admin/stats');
    return {
      totalUsers: data.total_users,
      totalCompetitions: data.total_competitions,
      totalQuickMatches: data.total_quick_matches,
      totalGolfCoursesApproved: data.total_golf_courses_approved,
      totalGolfCoursesPending: data.total_golf_courses_pending,
    };
  }

  /**
   * @override
   */
  async listUsers(filters = {}) {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.isAdmin !== undefined && filters.isAdmin !== null) {
      params.append('is_admin', filters.isAdmin);
    }
    if (filters.isActive !== undefined && filters.isActive !== null) {
      params.append('is_active', filters.isActive);
    }
    if (filters.emailVerified !== undefined && filters.emailVerified !== null) {
      params.append('email_verified', filters.emailVerified);
    }
    params.append('limit', filters.limit ?? 20);
    params.append('offset', filters.offset ?? 0);

    const data = await apiRequest(`/api/v1/admin/users?${params.toString()}`);

    return {
      users: data.users.map(this._mapUser),
      totalCount: data.total_count,
      limit: data.limit,
      offset: data.offset,
    };
  }

  /**
   * @override
   */
  async updateUser(userId, data) {
    const payload = {};
    if (data.firstName !== undefined) payload.first_name = data.firstName;
    if (data.lastName !== undefined) payload.last_name = data.lastName;
    if (data.email !== undefined) payload.email = data.email;
    if (data.handicap !== undefined) payload.handicap = data.handicap;
    if (data.countryCode !== undefined) payload.country_code = data.countryCode;
    if (data.isAdmin !== undefined) payload.is_admin = data.isAdmin;

    const result = await apiRequest(`/api/v1/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return this._mapUser(result);
  }

  /**
   * @override
   */
  async setUserActive(userId, isActive) {
    await apiRequest(`/api/v1/admin/users/${userId}/active`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: isActive }),
    });
  }

  /**
   * @override
   */
  async deleteUser(userId) {
    await apiRequest(`/api/v1/admin/users/${userId}`, {
      method: 'DELETE',
    });
  }

  _mapUser(userData) {
    return {
      id: userData.id,
      firstName: userData.first_name,
      lastName: userData.last_name,
      // JUNTO al nombre real, nunca en su lugar: quien administra necesita
      // saber de quién es la cuenta. Pero el listado ya se puede buscar por
      // alias (BE #239), así que sin esto una búsqueda por apodo devolvía
      // filas donde no aparece por ningún lado lo que se buscó
      alias: userData.alias ?? null,
      email: userData.email,
      handicap: userData.handicap ?? null,
      isAdmin: userData.is_admin,
      isActive: userData.is_active,
      emailVerified: userData.email_verified,
      createdAt: userData.created_at,
      lastLoginAt: userData.last_login_at ?? null,
    };
  }
}

export default ApiAdminRepository;
