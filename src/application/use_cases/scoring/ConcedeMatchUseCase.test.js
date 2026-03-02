import { describe, it, expect, vi, beforeEach } from 'vitest';
import ConcedeMatchUseCase from './ConcedeMatchUseCase';

describe('ConcedeMatchUseCase', () => {
  let scoringRepository;
  let useCase;

  beforeEach(() => {
    vi.clearAllMocks();
    scoringRepository = { concedeMatch: vi.fn() };
    useCase = new ConcedeMatchUseCase({ scoringRepository });
  });

  it('should concede match with team and reason', async () => {
    scoringRepository.concedeMatch.mockResolvedValue({ status: 'CONCEDED' });

    const result = await useCase.execute('m-1', 'A', 'Player injury');
    expect(scoringRepository.concedeMatch).toHaveBeenCalledWith('m-1', 'A', 'Player injury');
    expect(result).toEqual({ status: 'CONCEDED' });
  });

  it('should concede match with team B', async () => {
    scoringRepository.concedeMatch.mockResolvedValue({ status: 'CONCEDED' });

    await useCase.execute('m-1', 'B', 'Withdrawal');
    expect(scoringRepository.concedeMatch).toHaveBeenCalledWith('m-1', 'B', 'Withdrawal');
  });

  it('should pass null reason when not provided', async () => {
    scoringRepository.concedeMatch.mockResolvedValue({ status: 'CONCEDED' });

    await useCase.execute('m-1', 'A');
    expect(scoringRepository.concedeMatch).toHaveBeenCalledWith('m-1', 'A', null);
  });

  it('should pass null when reason is empty string', async () => {
    scoringRepository.concedeMatch.mockResolvedValue({ status: 'CONCEDED' });

    await useCase.execute('m-1', 'A', '');
    expect(scoringRepository.concedeMatch).toHaveBeenCalledWith('m-1', 'A', null);
  });

  it('should throw if matchId is missing', async () => {
    await expect(useCase.execute('', 'A')).rejects.toThrow('Match ID is required');
  });

  it('should throw if concedingTeam is missing', async () => {
    await expect(useCase.execute('m-1', '')).rejects.toThrow('Conceding team must be A or B');
  });

  it('should throw if concedingTeam is invalid', async () => {
    await expect(useCase.execute('m-1', 'C')).rejects.toThrow('Conceding team must be A or B');
  });

  it('should throw if concedingTeam is null', async () => {
    await expect(useCase.execute('m-1', null)).rejects.toThrow('Conceding team must be A or B');
  });

  it('should propagate repository errors', async () => {
    scoringRepository.concedeMatch.mockRejectedValue(new Error('Match not in progress'));
    await expect(useCase.execute('m-1', 'A', 'reason')).rejects.toThrow('Match not in progress');
  });

  it('should not call repository when validation fails', async () => {
    await expect(useCase.execute('', 'A')).rejects.toThrow();
    expect(scoringRepository.concedeMatch).not.toHaveBeenCalled();
  });
});
