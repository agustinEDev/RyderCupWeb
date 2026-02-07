import { describe, it, expect, vi, beforeEach } from 'vitest';
import CreateRoundUseCase from './CreateRoundUseCase';

describe('CreateRoundUseCase', () => {
  let scheduleRepository;
  let useCase;

  beforeEach(() => {
    vi.clearAllMocks();
    scheduleRepository = { createRound: vi.fn() };
    useCase = new CreateRoundUseCase({ scheduleRepository });
  });

  it('should create a round successfully', async () => {
    const roundData = {
      golf_course_id: 'gc-1',
      round_date: '2025-06-15',
      session_type: 'MORNING',
      match_format: 'FOURBALL',
    };
    const mockRound = { id: 'r-1', ...roundData };
    scheduleRepository.createRound.mockResolvedValue(mockRound);

    const result = await useCase.execute('comp-1', roundData);
    expect(scheduleRepository.createRound).toHaveBeenCalledWith('comp-1', roundData);
    expect(result.id).toBe('r-1');
  });

  it('should throw if competitionId is missing', async () => {
    await expect(useCase.execute('', {})).rejects.toThrow('Competition ID is required');
  });

  it('should throw if roundData is missing', async () => {
    await expect(useCase.execute('comp-1', null)).rejects.toThrow('Round data is required');
  });

  it('should throw if golf_course_id is missing', async () => {
    await expect(useCase.execute('comp-1', { round_date: '2025-06-15', session_type: 'MORNING', match_format: 'SINGLES' })).rejects.toThrow('Golf course ID is required');
  });

  it('should throw if date is missing', async () => {
    await expect(useCase.execute('comp-1', { golf_course_id: 'gc-1', session_type: 'MORNING', match_format: 'SINGLES' })).rejects.toThrow('Round date is required');
  });

  it('should throw if session_type is missing', async () => {
    await expect(useCase.execute('comp-1', { golf_course_id: 'gc-1', round_date: '2025-06-15', match_format: 'SINGLES' })).rejects.toThrow('Session type is required');
  });

  it('should throw if match_format is missing', async () => {
    await expect(useCase.execute('comp-1', { golf_course_id: 'gc-1', round_date: '2025-06-15', session_type: 'MORNING' })).rejects.toThrow('Match format is required');
  });

  it('should propagate repository errors', async () => {
    scheduleRepository.createRound.mockRejectedValue(new Error('Conflict'));
    const roundData = { golf_course_id: 'gc-1', round_date: '2025-06-15', session_type: 'MORNING', match_format: 'SINGLES' };
    await expect(useCase.execute('comp-1', roundData)).rejects.toThrow('Conflict');
  });
});
