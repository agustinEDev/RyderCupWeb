import { describe, it, expect, vi, beforeEach } from 'vitest';
import DeclareWalkoverUseCase from './DeclareWalkoverUseCase';

describe('DeclareWalkoverUseCase', () => {
  let scheduleRepository;
  let useCase;

  beforeEach(() => {
    vi.clearAllMocks();
    scheduleRepository = { declareWalkover: vi.fn() };
    useCase = new DeclareWalkoverUseCase({ scheduleRepository });
  });

  it('should declare walkover for team A', async () => {
    scheduleRepository.declareWalkover.mockResolvedValue({ status: 'WALKOVER' });

    const result = await useCase.execute('m-1', 'A', 'Player injured');
    expect(scheduleRepository.declareWalkover).toHaveBeenCalledWith('m-1', 'A', 'Player injured');
    expect(result.status).toBe('WALKOVER');
  });

  it('should declare walkover for team B', async () => {
    scheduleRepository.declareWalkover.mockResolvedValue({ status: 'WALKOVER' });

    await useCase.execute('m-1', 'B', 'No show');
    expect(scheduleRepository.declareWalkover).toHaveBeenCalledWith('m-1', 'B', 'No show');
  });

  it('should throw if matchId is missing', async () => {
    await expect(useCase.execute('', 'A', 'reason')).rejects.toThrow('Match ID is required');
  });

  it('should throw if winningTeam is invalid', async () => {
    await expect(useCase.execute('m-1', 'C', 'reason')).rejects.toThrow('Winning team must be A or B');
    await expect(useCase.execute('m-1', '', 'reason')).rejects.toThrow('Winning team must be A or B');
  });

  it('should throw if reason is empty', async () => {
    await expect(useCase.execute('m-1', 'A', '')).rejects.toThrow('Reason is required');
    await expect(useCase.execute('m-1', 'A', '  ')).rejects.toThrow('Reason is required');
  });

  it('should propagate repository errors', async () => {
    scheduleRepository.declareWalkover.mockRejectedValue(new Error('Forbidden'));
    await expect(useCase.execute('m-1', 'A', 'reason')).rejects.toThrow('Forbidden');
  });
});
