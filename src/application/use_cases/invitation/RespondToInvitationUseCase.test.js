import { describe, it, expect, vi, beforeEach } from 'vitest';
import RespondToInvitationUseCase from './RespondToInvitationUseCase';
import Invitation from '../../../domain/entities/Invitation';
import InvitationStatus from '../../../domain/value_objects/InvitationStatus';

const mockAccepted = Invitation.fromPersistence({
  id: 'inv-1',
  competitionId: 'comp-1',
  inviterId: 'user-1',
  inviteeEmail: 'player@example.com',
  status: InvitationStatus.accepted(),
  respondedAt: '2026-02-19T10:00:00Z',
  expiresAt: '2026-02-25T10:00:00Z',
  createdAt: '2026-02-18T10:00:00Z',
  updatedAt: '2026-02-19T10:00:00Z',
});
mockAccepted._apiData = { competition_name: 'Summer Cup', inviter_name: 'Creator' };

describe('RespondToInvitationUseCase', () => {
  let useCase;
  let mockRepo;

  beforeEach(() => {
    mockRepo = { respondToInvitation: vi.fn().mockResolvedValue(mockAccepted) };
    useCase = new RespondToInvitationUseCase({ invitationRepository: mockRepo });
  });

  it('should throw if invitationRepository is missing', () => {
    expect(() => new RespondToInvitationUseCase({})).toThrow('requires invitationRepository');
  });

  it('should throw for invalid invitationId', async () => {
    await expect(useCase.execute('', 'ACCEPT')).rejects.toThrow('invitationId is required');
  });

  it('should throw for invalid action', async () => {
    await expect(useCase.execute('inv-1', 'INVALID')).rejects.toThrow('action must be one of');
  });

  it('should respond and return DTO', async () => {
    const result = await useCase.execute('inv-1', 'ACCEPT');

    expect(mockRepo.respondToInvitation).toHaveBeenCalledWith('inv-1', 'ACCEPT');
    expect(result.status).toBe('ACCEPTED');
    expect(result.isAccepted).toBe(true);
  });
});
