import { describe, it, expect, vi, beforeEach } from 'vitest';
import ReassignPlayersUseCase from './ReassignPlayersUseCase';

describe('ReassignPlayersUseCase', () => {
  let scheduleRepository;
  let useCase;

  beforeEach(() => {
    vi.clearAllMocks();
    scheduleRepository = { reassignPlayers: vi.fn() };
    useCase = new ReassignPlayersUseCase({ scheduleRepository });
  });

  it('should reassign players successfully', async () => {
    scheduleRepository.reassignPlayers.mockResolvedValue({ success: true });

    const result = await useCase.execute('m-1', ['u1', 'u2'], ['u3', 'u4']);
    expect(scheduleRepository.reassignPlayers).toHaveBeenCalledWith('m-1', ['u1', 'u2'], ['u3', 'u4']);
    expect(result.success).toBe(true);
  });

  it('should throw if matchId is missing', async () => {
    await expect(useCase.execute('', ['u1'], ['u2'])).rejects.toThrow('Match ID is required');
  });

  it('should throw if teamAIds is empty', async () => {
    await expect(useCase.execute('m-1', [], ['u2'])).rejects.toThrow('Team A player IDs are required');
  });

  it('should throw if teamBIds is empty', async () => {
    await expect(useCase.execute('m-1', ['u1'], [])).rejects.toThrow('Team B player IDs are required');
  });

  it('should throw if teamAIds is not an array', async () => {
    await expect(useCase.execute('m-1', 'u1', ['u2'])).rejects.toThrow('Team A player IDs are required');
  });

  it('should propagate repository errors', async () => {
    scheduleRepository.reassignPlayers.mockRejectedValue(new Error('Bad request'));
    await expect(useCase.execute('m-1', ['u1'], ['u2'])).rejects.toThrow('Bad request');
  });
});
