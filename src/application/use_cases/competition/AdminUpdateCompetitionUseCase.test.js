import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminUpdateCompetitionUseCase from './AdminUpdateCompetitionUseCase';

describe('AdminUpdateCompetitionUseCase', () => {
  let competitionRepository;
  let useCase;

  beforeEach(() => {
    vi.clearAllMocks();
    competitionRepository = { updateCompetition: vi.fn() };
    useCase = new AdminUpdateCompetitionUseCase({ competitionRepository });
  });

  it('throws if competitionId is missing', async () => {
    await expect(useCase.execute(undefined, { name: 'Foo' })).rejects.toThrow('Competition ID is required and must be a string');
  });

  it('throws if fields are missing', async () => {
    await expect(useCase.execute('c1')).rejects.toThrow('Fields to update are required');
  });

  it('throws if the name is too short', async () => {
    await expect(useCase.execute('c1', { name: 'ab' })).rejects.toThrow('Competition name must be at least 3 characters');
  });

  it('throws if end_date is before start_date', async () => {
    await expect(
      useCase.execute('c1', { start_date: '2026-09-05', end_date: '2026-09-01' })
    ).rejects.toThrow('End date must be on or after start date');
  });

  it('allows a partial update with only some fields', async () => {
    competitionRepository.updateCompetition.mockResolvedValue({ id: 'c1', name: 'Renamed' });

    const result = await useCase.execute('c1', { name: 'Renamed' });

    expect(competitionRepository.updateCompetition).toHaveBeenCalledWith('c1', { name: 'Renamed' });
    expect(result).toEqual({ id: 'c1', name: 'Renamed' });
  });
});
