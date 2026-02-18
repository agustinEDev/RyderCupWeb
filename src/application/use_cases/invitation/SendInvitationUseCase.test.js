import { describe, it, expect, vi, beforeEach } from 'vitest';
import SendInvitationUseCase from './SendInvitationUseCase';
import Invitation from '../../../domain/entities/Invitation';
import InvitationStatus from '../../../domain/value_objects/InvitationStatus';

const mockInvitation = Invitation.fromPersistence({
  id: 'inv-1',
  competitionId: 'comp-1',
  inviterId: 'user-1',
  inviteeEmail: 'player@example.com',
  inviteeUserId: 'user-2',
  status: InvitationStatus.pending(),
  expiresAt: '2026-02-25T10:00:00Z',
  createdAt: '2026-02-18T10:00:00Z',
  updatedAt: '2026-02-18T10:00:00Z',
});
mockInvitation._apiData = { competition_name: 'Summer Cup', inviter_name: 'Creator', invitee_name: 'Player' };

describe('SendInvitationUseCase', () => {
  let useCase;
  let mockRepo;

  beforeEach(() => {
    mockRepo = { sendInvitation: vi.fn().mockResolvedValue(mockInvitation) };
    useCase = new SendInvitationUseCase({ invitationRepository: mockRepo });
  });

  it('should throw if invitationRepository is missing', () => {
    expect(() => new SendInvitationUseCase({})).toThrow('requires invitationRepository');
  });

  it('should throw for invalid competitionId', async () => {
    await expect(useCase.execute('', 'user-2')).rejects.toThrow('competitionId is required');
  });

  it('should throw for invalid inviteeUserId', async () => {
    await expect(useCase.execute('comp-1', '')).rejects.toThrow('inviteeUserId is required');
  });

  it('should send invitation and return DTO', async () => {
    const result = await useCase.execute('comp-1', 'user-2', 'Join us!');

    expect(mockRepo.sendInvitation).toHaveBeenCalledWith('comp-1', 'user-2', 'Join us!');
    expect(result.id).toBe('inv-1');
    expect(result.status).toBe('PENDING');
    expect(result.competitionName).toBe('Summer Cup');
  });
});
