import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminListCompetitionsUseCase from './AdminListCompetitionsUseCase';
import CompetitionAssembler from '../../assemblers/CompetitionAssembler';

vi.mock('../../assemblers/CompetitionAssembler', () => ({
  default: {
    toSimpleDTO: vi.fn((competition) => ({
      id: competition.id,
      name: competition.name,
      status: competition.status,
      creator: competition.creator,
    })),
  },
}));

describe('AdminListCompetitionsUseCase', () => {
  let competitionRepository;
  let useCase;

  beforeEach(() => {
    vi.clearAllMocks();
    competitionRepository = { findPublic: vi.fn() };
    useCase = new AdminListCompetitionsUseCase(competitionRepository);
  });

  it('throws if no competitionRepository is provided', () => {
    expect(() => new AdminListCompetitionsUseCase()).toThrow(
      'AdminListCompetitionsUseCase requires a competitionRepository',
    );
  });

  it('lists competitions of any status by not restricting the status filter', async () => {
    competitionRepository.findPublic.mockResolvedValue([]);

    await useCase.execute();

    expect(competitionRepository.findPublic).toHaveBeenCalledWith({
      searchName: undefined,
      searchCreator: undefined,
      limit: 100,
      offset: 0,
    });
  });

  it('passes search filters and pagination through', async () => {
    competitionRepository.findPublic.mockResolvedValue([]);

    await useCase.execute({
      searchName: 'Cup',
      searchCreator: 'Ana',
      limit: 10,
      offset: 20,
    });

    expect(competitionRepository.findPublic).toHaveBeenCalledWith({
      searchName: 'Cup',
      searchCreator: 'Ana',
      limit: 10,
      offset: 20,
    });
  });

  it('maps entities returned by the repository to simple DTOs', async () => {
    competitionRepository.findPublic.mockResolvedValue([
      {
        entity: {
          id: 'c1',
          name: 'Draft Cup',
          status: 'DRAFT',
          creator: { id: 'u1' },
        },
        extras: null,
      },
    ]);

    const result = await useCase.execute();

    expect(result).toEqual([
      { id: 'c1', name: 'Draft Cup', status: 'DRAFT', creator: { id: 'u1' } },
    ]);
  });

  it('hands each entity to the assembler together with its extras', async () => {
    const entity = { id: 'c2', name: 'Open', status: 'ACTIVE' };
    const extras = { isCreator: true, enrolledCount: 4 };
    competitionRepository.findPublic.mockResolvedValue([{ entity, extras }]);

    await useCase.execute();

    expect(CompetitionAssembler.toSimpleDTO).toHaveBeenCalledWith(
      entity,
      extras,
    );
  });
});
