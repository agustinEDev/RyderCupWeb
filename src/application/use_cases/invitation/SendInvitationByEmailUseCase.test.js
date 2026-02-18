import { describe, it, expect, vi, beforeEach } from 'vitest';
import SendInvitationByEmailUseCase from './SendInvitationByEmailUseCase';
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

describe('SendInvitationByEmailUseCase', () => {
  let useCase;
  let mockRepo;

  beforeEach(() => {
    mockRepo = { sendInvitationByEmail: vi.fn().mockResolvedValue(mockInvitation) };
    useCase = new SendInvitationByEmailUseCase({ invitationRepository: mockRepo });
  });

  it('should throw if invitationRepository is missing', () => {
    expect(() => new SendInvitationByEmailUseCase({})).toThrow('requires invitationRepository');
  });

  it('should throw for invalid email', async () => {
    await expect(useCase.execute('comp-1', 'not-an-email')).rejects.toThrow();
  });

  it('should throw for message exceeding 500 chars', async () => {
    const longMessage = 'a'.repeat(501);
    await expect(useCase.execute('comp-1', 'player@example.com', longMessage)).rejects.toThrow('500 characters');
  });

  it('should send invitation by email and return DTO', async () => {
    const result = await useCase.execute('comp-1', 'player@example.com', 'Welcome!');

    expect(mockRepo.sendInvitationByEmail).toHaveBeenCalledWith('comp-1', 'player@example.com', 'Welcome!');
    expect(result.id).toBe('inv-1');
    expect(result.status).toBe('PENDING');
  });
});
