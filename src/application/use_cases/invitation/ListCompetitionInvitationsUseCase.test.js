import { describe, it, expect, vi, beforeEach } from 'vitest';
import ListCompetitionInvitationsUseCase from './ListCompetitionInvitationsUseCase';
import Invitation from '../../../domain/entities/Invitation';
import InvitationStatus from '../../../domain/value_objects/InvitationStatus';

const mockInvitation = Invitation.fromPersistence({
  id: 'inv-1',
  competitionId: 'comp-1',
  inviterId: 'user-1',
  inviteeEmail: 'player@example.com',
  status: InvitationStatus.pending(),
  expiresAt: '2026-02-25T10:00:00Z',
  createdAt: '2026-02-18T10:00:00Z',
  updatedAt: '2026-02-18T10:00:00Z',
});
mockInvitation._apiData = { competition_name: 'Summer Cup', inviter_name: 'Creator', invitee_name: 'Player' };

describe('ListCompetitionInvitationsUseCase', () => {
  let useCase;
  let mockRepo;

  beforeEach(() => {
    mockRepo = {
      getCompetitionInvitations: vi.fn().mockResolvedValue({
        invitations: [mockInvitation],
        totalCount: 1,
      }),
    };
    useCase = new ListCompetitionInvitationsUseCase({ invitationRepository: mockRepo });
  });

  it('should throw if invitationRepository is missing', () => {
    expect(() => new ListCompetitionInvitationsUseCase({})).toThrow('requires invitationRepository');
  });

  it('should throw for invalid competitionId', async () => {
    await expect(useCase.execute('')).rejects.toThrow('competitionId is required');
  });

  it('should list competition invitations and return DTOs', async () => {
    const result = await useCase.execute('comp-1', { status: 'PENDING' });

    expect(mockRepo.getCompetitionInvitations).toHaveBeenCalledWith('comp-1', { status: 'PENDING' });
    expect(result.invitations).toHaveLength(1);
    expect(result.invitations[0].inviteeName).toBe('Player');
    expect(result.totalCount).toBe(1);
  });
});
