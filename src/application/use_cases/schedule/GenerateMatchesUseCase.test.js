import { describe, it, expect, vi, beforeEach } from 'vitest';
import GenerateMatchesUseCase from './GenerateMatchesUseCase';

describe('GenerateMatchesUseCase', () => {
  let scheduleRepository;
  let useCase;

  beforeEach(() => {
    vi.clearAllMocks();
    scheduleRepository = { generateMatches: vi.fn() };
    useCase = new GenerateMatchesUseCase({ scheduleRepository });
  });

  it('should generate matches successfully', async () => {
    const pairings = { auto: true };
    scheduleRepository.generateMatches.mockResolvedValue({ matches_created: 6 });

    const result = await useCase.execute('r-1', pairings);
    expect(scheduleRepository.generateMatches).toHaveBeenCalledWith('r-1', pairings);
    expect(result.matches_created).toBe(6);
  });

  it('should use empty object as default pairings', async () => {
    scheduleRepository.generateMatches.mockResolvedValue({ matches_created: 6 });

    await useCase.execute('r-1');
    expect(scheduleRepository.generateMatches).toHaveBeenCalledWith('r-1', {});
  });

  it('should throw if roundId is missing', async () => {
    await expect(useCase.execute('')).rejects.toThrow('Round ID is required');
  });

  it('should propagate repository errors', async () => {
    scheduleRepository.generateMatches.mockRejectedValue(new Error('Bad request'));
    await expect(useCase.execute('r-1')).rejects.toThrow('Bad request');
  });

  it('should pass manual pairings payload to repository', async () => {
    const manualPairings = {
      manualPairings: [
        { teamAPlayerIds: ['u1', 'u2'], teamBPlayerIds: ['u3', 'u4'] },
        { teamAPlayerIds: ['u5'], teamBPlayerIds: ['u6'] },
      ],
    };
    scheduleRepository.generateMatches.mockResolvedValue({ matches_created: 2 });

    const result = await useCase.execute('r-1', manualPairings);
    expect(scheduleRepository.generateMatches).toHaveBeenCalledWith('r-1', manualPairings);
    expect(result.matches_created).toBe(2);
  });
});
