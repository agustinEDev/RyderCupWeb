import { describe, it, expect, vi, beforeEach } from 'vitest';
import ListMyInvitationsUseCase from './ListMyInvitationsUseCase';
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
mockInvitation._apiData = { competition_name: 'Summer Cup', inviter_name: 'Creator' };

describe('ListMyInvitationsUseCase', () => {
  let useCase;
  let mockRepo;

  beforeEach(() => {
    mockRepo = {
      getMyInvitations: vi.fn().mockResolvedValue({
        invitations: [mockInvitation],
        totalCount: 1,
      }),
    };
    useCase = new ListMyInvitationsUseCase({ invitationRepository: mockRepo });
  });

  it('should throw if invitationRepository is missing', () => {
    expect(() => new ListMyInvitationsUseCase({})).toThrow('requires invitationRepository');
  });

  it('should list invitations and return DTOs', async () => {
    const result = await useCase.execute({ status: 'PENDING' });

    expect(mockRepo.getMyInvitations).toHaveBeenCalledWith({ status: 'PENDING' });
    expect(result.invitations).toHaveLength(1);
    expect(result.invitations[0].id).toBe('inv-1');
    expect(result.totalCount).toBe(1);
  });

  it('should handle empty result', async () => {
    mockRepo.getMyInvitations.mockResolvedValue({ invitations: [], totalCount: 0 });

    const result = await useCase.execute();

    expect(result.invitations).toHaveLength(0);
    expect(result.totalCount).toBe(0);
  });
});
