import { describe, it, expect, vi } from 'vitest';
import ApiCompetitionRepository from './ApiCompetitionRepository';
import * as apiModule from '../../services/api';

vi.mock('../../services/api', () => ({
  default: vi.fn(),
}));

// El resumen público, sin sesión (release social 3)
describe('ApiCompetitionRepository · resumen público', () => {
  it('lo pide a /summary y lo pasa a camelCase', async () => {
    apiModule.default.mockResolvedValue({
      id: 'c-1',
      name: 'Medal',
      tournament_type: 'MEDAL',
      has_teams: false,
      status: 'IN_PROGRESS',
      visibility: 'PUBLIC',
      start_date: '2026-11-01',
      end_date: '2026-11-02',
    });

    const resumen = await new ApiCompetitionRepository().findSummary('c-1');

    expect(apiModule.default).toHaveBeenCalledWith('/api/v1/competitions/c-1/summary');
    expect(resumen).toEqual({
      id: 'c-1',
      name: 'Medal',
      tournamentType: 'MEDAL',
      hasTeams: false,
      status: 'IN_PROGRESS',
      visibility: 'PUBLIC',
      startDate: '2026-11-01',
      endDate: '2026-11-02',
    });
  });
});
