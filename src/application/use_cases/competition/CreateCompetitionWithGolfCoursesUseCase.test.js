import { describe, it, expect, vi, beforeEach } from 'vitest';
import CreateCompetitionWithGolfCoursesUseCase from './CreateCompetitionWithGolfCoursesUseCase';

vi.mock('../../assemblers/CompetitionAssembler', () => ({
  default: {
    toSimpleDTO: vi.fn((competition) => ({
      id: competition.id,
      name: competition.name,
    })),
  },
}));

describe('CreateCompetitionWithGolfCoursesUseCase', () => {
  let competitionRepository;
  let useCase;

  const competitionData = { name: 'Ryder Cup Test' };
  const mockCompetitionEntity = { id: 'comp-123', name: 'Ryder Cup Test' };

  beforeEach(() => {
    vi.clearAllMocks();

    competitionRepository = {
      save: vi.fn().mockResolvedValue(mockCompetitionEntity),
      addGolfCourse: vi.fn(),
    };

    useCase = new CreateCompetitionWithGolfCoursesUseCase({ competitionRepository });
  });

  it('creates the competition and attaches every golf course when all succeed', async () => {
    competitionRepository.addGolfCourse.mockResolvedValue({});
    const golfCourses = [
      { id: 'gc-1', name: 'Valderrama' },
      { id: 'gc-2', name: 'Sotogrande' },
    ];

    const result = await useCase.execute(competitionData, golfCourses);

    expect(competitionRepository.save).toHaveBeenCalledWith(competitionData);
    expect(competitionRepository.addGolfCourse).toHaveBeenNthCalledWith(1, 'comp-123', 'gc-1');
    expect(competitionRepository.addGolfCourse).toHaveBeenNthCalledWith(2, 'comp-123', 'gc-2');
    expect(result).toEqual({
      competition: { id: 'comp-123', name: 'Ryder Cup Test' },
      successCount: 2,
      failedCourses: [],
    });
  });

  it('creates the competition without attaching any course when none are given', async () => {
    const result = await useCase.execute(competitionData, []);

    expect(competitionRepository.save).toHaveBeenCalledWith(competitionData);
    expect(competitionRepository.addGolfCourse).not.toHaveBeenCalled();
    expect(result).toEqual({
      competition: { id: 'comp-123', name: 'Ryder Cup Test' },
      successCount: 0,
      failedCourses: [],
    });
  });

  it('returns a structured partial-failure result when some courses fail to attach', async () => {
    competitionRepository.addGolfCourse
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('Country not compatible'));
    const golfCourses = [
      { id: 'gc-1', name: 'Valderrama' },
      { id: 'gc-2', name: 'Sotogrande' },
    ];

    const result = await useCase.execute(competitionData, golfCourses);

    expect(result).toEqual({
      competition: { id: 'comp-123', name: 'Ryder Cup Test' },
      successCount: 1,
      failedCourses: ['Sotogrande'],
    });
  });

  it('still creates the competition even if every course fails to attach', async () => {
    competitionRepository.addGolfCourse.mockRejectedValue(new Error('Golf course not approved'));
    const golfCourses = [{ id: 'gc-1', name: 'Valderrama' }];

    const result = await useCase.execute(competitionData, golfCourses);

    expect(competitionRepository.save).toHaveBeenCalled();
    expect(result).toEqual({
      competition: { id: 'comp-123', name: 'Ryder Cup Test' },
      successCount: 0,
      failedCourses: ['Valderrama'],
    });
  });
});
