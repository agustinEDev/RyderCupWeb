import { describe, it, expect, beforeEach, vi } from 'vitest';
import ApiAdminRepository from './ApiAdminRepository';
import * as apiModule from '../../services/api';

vi.mock('../../services/api', () => ({
  default: vi.fn(),
}));

describe('ApiAdminRepository', () => {
  let repository;
  let apiRequestMock;

  beforeEach(() => {
    repository = new ApiAdminRepository();
    apiRequestMock = apiModule.default;
    vi.clearAllMocks();
  });

  describe('getStats', () => {
    it('should fetch and map platform stats', async () => {
      apiRequestMock.mockResolvedValue({
        total_users: 9,
        total_competitions: 1,
        total_quick_matches: 25,
        total_golf_courses_approved: 1,
        total_golf_courses_pending: 0,
      });

      const result = await repository.getStats();

      expect(apiRequestMock).toHaveBeenCalledWith('/api/v1/admin/stats');
      expect(result).toEqual({
        totalUsers: 9,
        totalCompetitions: 1,
        totalQuickMatches: 25,
        totalGolfCoursesApproved: 1,
        totalGolfCoursesPending: 0,
      });
    });
  });

  describe('listUsers', () => {
    it('should build query params from filters and map the response', async () => {
      apiRequestMock.mockResolvedValue({
        users: [
          {
            id: 'u1',
            first_name: 'Agus',
            last_name: 'Estevez',
            email: 'agus@test.com',
            handicap: 17.7,
            is_admin: true,
            is_active: true,
            email_verified: true,
            created_at: '2026-07-27T00:00:00Z',
          },
        ],
        total_count: 1,
        limit: 20,
        offset: 0,
      });

      const result = await repository.listUsers({
        search: 'agus',
        isAdmin: true,
        isActive: true,
        emailVerified: false,
        limit: 20,
        offset: 0,
      });

      const [url] = apiRequestMock.mock.calls[0];
      expect(url).toContain('/api/v1/admin/users?');
      expect(url).toContain('search=agus');
      expect(url).toContain('is_admin=true');
      expect(url).toContain('is_active=true');
      expect(url).toContain('email_verified=false');
      expect(url).toContain('limit=20');
      expect(url).toContain('offset=0');

      expect(result.totalCount).toBe(1);
      expect(result.users).toHaveLength(1);
      expect(result.users[0]).toEqual({
        id: 'u1',
        firstName: 'Agus',
        lastName: 'Estevez',
        email: 'agus@test.com',
        handicap: 17.7,
        isAdmin: true,
        isActive: true,
        emailVerified: true,
        createdAt: '2026-07-27T00:00:00Z',
      });
    });

    it('should omit undefined/null filters from the query string', async () => {
      apiRequestMock.mockResolvedValue({ users: [], total_count: 0, limit: 20, offset: 0 });

      await repository.listUsers({});

      const [url] = apiRequestMock.mock.calls[0];
      expect(url).not.toContain('search=');
      expect(url).not.toContain('is_admin=');
      expect(url).not.toContain('is_active=');
      expect(url).not.toContain('email_verified=');
      expect(url).toContain('limit=20');
      expect(url).toContain('offset=0');
    });
  });

  describe('updateUser', () => {
    it('should send only defined fields and map the response', async () => {
      apiRequestMock.mockResolvedValue({
        id: 'u1',
        first_name: 'Agus',
        last_name: 'Estevez',
        email: 'agus@test.com',
        handicap: 17.7,
        is_admin: false,
        is_active: true,
        email_verified: true,
        created_at: '2026-07-27T00:00:00Z',
      });

      const result = await repository.updateUser('u1', { firstName: 'Agus', isAdmin: false });

      expect(apiRequestMock).toHaveBeenCalledWith('/api/v1/admin/users/u1', {
        method: 'PUT',
        body: JSON.stringify({ first_name: 'Agus', is_admin: false }),
      });
      expect(result.firstName).toBe('Agus');
      expect(result.isAdmin).toBe(false);
    });
  });

  describe('setUserActive', () => {
    it('should send the active flag', async () => {
      apiRequestMock.mockResolvedValue(null);

      await repository.setUserActive('u1', false);

      expect(apiRequestMock).toHaveBeenCalledWith('/api/v1/admin/users/u1/active', {
        method: 'PUT',
        body: JSON.stringify({ is_active: false }),
      });
    });
  });

  describe('deleteUser', () => {
    it('should call the delete endpoint', async () => {
      apiRequestMock.mockResolvedValue(null);

      await repository.deleteUser('u1');

      expect(apiRequestMock).toHaveBeenCalledWith('/api/v1/admin/users/u1', {
        method: 'DELETE',
      });
    });

    it('should propagate a 409 conflict when the user has activity', async () => {
      const error = new Error('Cannot permanently delete this account: has created one or more quick matches');
      error.status = 409;
      apiRequestMock.mockRejectedValue(error);

      await expect(repository.deleteUser('u1')).rejects.toMatchObject({ status: 409 });
    });
  });
});
