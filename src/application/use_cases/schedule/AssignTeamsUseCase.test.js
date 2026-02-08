import { describe, it, expect, vi, beforeEach } from 'vitest';
import AssignTeamsUseCase from './AssignTeamsUseCase';

describe('AssignTeamsUseCase', () => {
  let scheduleRepository;
  let useCase;

  beforeEach(() => {
    vi.clearAllMocks();
    scheduleRepository = { assignTeams: vi.fn() };
    useCase = new AssignTeamsUseCase({ scheduleRepository });
  });

  it('should assign teams successfully', async () => {
    const teamData = { mode: 'MANUAL', team_a_player_ids: ['u1'], team_b_player_ids: ['u2'] };
    scheduleRepository.assignTeams.mockResolvedValue({ mode: 'MANUAL' });

    const result = await useCase.execute('comp-1', teamData);
    expect(scheduleRepository.assignTeams).toHaveBeenCalledWith('comp-1', teamData);
    expect(result.mode).toBe('MANUAL');
  });

  it('should throw if competitionId is missing', async () => {
    await expect(useCase.execute('', {})).rejects.toThrow('Competition ID is required');
  });

  it('should throw if teamData is missing', async () => {
    await expect(useCase.execute('comp-1', null)).rejects.toThrow('Team data is required');
  });

  it('should propagate repository errors', async () => {
    scheduleRepository.assignTeams.mockRejectedValue(new Error('Forbidden'));
    await expect(useCase.execute('comp-1', {})).rejects.toThrow('Forbidden');
  });
});
