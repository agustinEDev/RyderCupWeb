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
    await expect(useCase.execute('comp-1', { golf_course_id: 'gc-1', round_date: '2025-06-15', session_type: 'MORNING' })).rejects.toThrow('Match format or tee sheet is required');
  });

  it('should propagate repository errors', async () => {
    scheduleRepository.createRound.mockRejectedValue(new Error('Conflict'));
    const roundData = { golf_course_id: 'gc-1', round_date: '2025-06-15', session_type: 'MORNING', match_format: 'SINGLES' };
    await expect(useCase.execute('comp-1', roundData)).rejects.toThrow('Conflict');
  });
});

describe('CreateRoundUseCase · una franja (FE #824)', () => {
  const comun = { golf_course_id: 'gc-1', round_date: '2030-10-12', session_type: 'MORNING' };
  const hoja = { first_tee_time: '08:00', last_tee_time: '11:50', interval_minutes: 10, group_size: 4 };

  it('D2: una franja va con su hoja y sin formato', async () => {
    const scheduleRepository = { createRound: vi.fn().mockResolvedValue({ id: 'r-1' }) };

    await new CreateRoundUseCase({ scheduleRepository }).execute('comp-1', { ...comun, tee_sheet: hoja });

    expect(scheduleRepository.createRound).toHaveBeenCalledWith('comp-1', { ...comun, tee_sheet: hoja });
  });

  it('D2b: formato y hoja a la vez no se mandan (el backend da un 400)', async () => {
    const scheduleRepository = { createRound: vi.fn() };

    await expect(
      new CreateRoundUseCase({ scheduleRepository }).execute('comp-1', { ...comun, match_format: 'SINGLES', tee_sheet: hoja })
    ).rejects.toThrow();
    expect(scheduleRepository.createRound).not.toHaveBeenCalled();
  });

  it('D2c: sin formato ni hoja, tampoco', async () => {
    const scheduleRepository = { createRound: vi.fn() };

    await expect(new CreateRoundUseCase({ scheduleRepository }).execute('comp-1', comun)).rejects.toThrow(
      'Match format or tee sheet is required'
    );
  });
});

describe('CreateRoundUseCase · la hoja se valida con las reglas del dominio (/code-review)', () => {
  it('D2d: una hoja imposible no se manda', async () => {
    const scheduleRepository = { createRound: vi.fn() };

    await expect(
      new CreateRoundUseCase({ scheduleRepository }).execute('comp-1', {
        golf_course_id: 'gc-1',
        round_date: '2030-10-12',
        session_type: 'MORNING',
        tee_sheet: { first_tee_time: '08:00', last_tee_time: '11:50', interval_minutes: 3, group_size: 4 },
      })
    ).rejects.toThrow('intervalRange');
    expect(scheduleRepository.createRound).not.toHaveBeenCalled();
  });
});
