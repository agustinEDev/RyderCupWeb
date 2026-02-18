import { describe, it, expect, vi, beforeEach } from 'vitest';
import ApiInvitationRepository from './ApiInvitationRepository';

vi.mock('../../domain/repositories/IInvitationRepository.js', () => ({
  default: class IInvitationRepository {},
}));

vi.mock('../../services/api.js', () => ({
  default: vi.fn(),
}));

import apiRequest from '../../services/api.js';

const mockInvitationApi = {
  id: 'inv-1',
  competition_id: 'comp-1',
  competition_name: 'Summer Cup',
  inviter_id: 'user-1',
  inviter_name: 'Creator',
  invitee_email: 'player@example.com',
  invitee_user_id: 'user-2',
  invitee_name: 'Player',
  status: 'PENDING',
  personal_message: 'Join us!',
  expires_at: '2026-02-25T10:00:00Z',
  responded_at: null,
  created_at: '2026-02-18T10:00:00Z',
  updated_at: '2026-02-18T10:00:00Z',
};

describe('ApiInvitationRepository', () => {
  let repo;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new ApiInvitationRepository();
  });

  describe('sendInvitation', () => {
    it('should POST to /competitions/{id}/invitations with user ID', async () => {
      apiRequest.mockResolvedValue(mockInvitationApi);

      const result = await repo.sendInvitation('comp-1', 'user-2', 'Join us!');

      expect(apiRequest).toHaveBeenCalledWith(
        '/api/v1/competitions/comp-1/invitations',
        {
          method: 'POST',
          body: JSON.stringify({ invitee_user_id: 'user-2', personal_message: 'Join us!' }),
        }
      );
      expect(result.id).toBe('inv-1');
      expect(result.status.toString()).toBe('PENDING');
    });
  });

  describe('sendInvitationByEmail', () => {
    it('should POST to /competitions/{id}/invitations/by-email', async () => {
      apiRequest.mockResolvedValue(mockInvitationApi);

      const result = await repo.sendInvitationByEmail('comp-1', 'player@example.com', null);

      expect(apiRequest).toHaveBeenCalledWith(
        '/api/v1/competitions/comp-1/invitations/by-email',
        {
          method: 'POST',
          body: JSON.stringify({ invitee_email: 'player@example.com' }),
        }
      );
      expect(result.inviteeEmail).toBe('player@example.com');
    });
  });

  describe('getMyInvitations', () => {
    it('should GET /invitations/me with filters', async () => {
      apiRequest.mockResolvedValue({
        invitations: [mockInvitationApi],
        total_count: 1,
      });

      const result = await repo.getMyInvitations({ status: 'PENDING' });

      expect(apiRequest).toHaveBeenCalledWith('/api/v1/invitations/me?status=PENDING');
      expect(result.invitations).toHaveLength(1);
      expect(result.totalCount).toBe(1);
    });

    it('should handle empty response', async () => {
      apiRequest.mockResolvedValue({ invitations: [], total_count: 0 });

      const result = await repo.getMyInvitations();

      expect(result.invitations).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });
  });

  describe('respondToInvitation', () => {
    it('should POST to /invitations/{id}/respond with action', async () => {
      const acceptedApi = { ...mockInvitationApi, status: 'ACCEPTED', responded_at: '2026-02-19T10:00:00Z' };
      apiRequest.mockResolvedValue(acceptedApi);

      const result = await repo.respondToInvitation('inv-1', 'ACCEPT');

      expect(apiRequest).toHaveBeenCalledWith(
        '/api/v1/invitations/inv-1/respond',
        {
          method: 'POST',
          body: JSON.stringify({ action: 'ACCEPT' }),
        }
      );
      expect(result.status.toString()).toBe('ACCEPTED');
    });
  });

  describe('getCompetitionInvitations', () => {
    it('should GET /competitions/{id}/invitations', async () => {
      apiRequest.mockResolvedValue({
        invitations: [mockInvitationApi],
        total_count: 1,
      });

      const result = await repo.getCompetitionInvitations('comp-1', { status: 'PENDING' });

      expect(apiRequest).toHaveBeenCalledWith(
        '/api/v1/competitions/comp-1/invitations?status=PENDING'
      );
      expect(result.invitations).toHaveLength(1);
      expect(result.totalCount).toBe(1);
    });
  });
});
