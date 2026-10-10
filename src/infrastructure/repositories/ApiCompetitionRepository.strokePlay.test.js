import { describe, it, expect, beforeEach, vi } from 'vitest';
import ApiCompetitionRepository from './ApiCompetitionRepository';
import * as apiModule from '../../services/api';
import { StrokePlaySetup } from '../../domain/value_objects/StrokePlaySetup';

vi.mock('../../services/api', () => ({
  default: vi.fn(),
}));

/**
 * Cambiar los ajustes del stroke play (FE #824): un PATCH propio con SOLO lo
 * que cambia (RyderCupAm#536: mandar los límites cambia de modo).
 */
describe('ApiCompetitionRepository · ajustes del stroke play (FE #824)', () => {
  let repository;
  let apiRequestMock;

  beforeEach(() => {
    repository = new ApiCompetitionRepository();
    apiRequestMock = apiModule.default;
    vi.clearAllMocks();
    apiRequestMock.mockResolvedValue({
      category_limits: ['12.0'],
      category_count: null,
      max_matchdays_per_player: 2,
      overall_standing: 'ACCUMULATED',
    });
  });

  it('R1: hace un PATCH con los nombres de la API, solo con lo que llega', async () => {
    await repository.updateStrokePlay('c-1', { categoryLimits: [12], maxMatchdaysPerPlayer: 2 });

    expect(apiRequestMock).toHaveBeenCalledWith('/api/v1/competitions/c-1/stroke-play', {
      method: 'PATCH',
      body: JSON.stringify({ category_limits: [12], max_matchdays_per_player: 2 }),
    });
  });

  it('R2: el contador y la general viajan con sus nombres', async () => {
    await repository.updateStrokePlay('c-1', { categoryCount: 3, overallStanding: 'BEST_CARD' });

    expect(JSON.parse(apiRequestMock.mock.calls[0][1].body)).toEqual({
      category_count: 3,
      overall_standing: 'BEST_CARD',
    });
  });

  it('R3: devuelve los ajustes como quedan, en su pieza', async () => {
    const ajustes = await repository.updateStrokePlay('c-1', { maxMatchdaysPerPlayer: 2 });

    expect(ajustes).toBeInstanceOf(StrokePlaySetup);
    expect(ajustes.categoryLimits).toEqual([12]);
    expect(ajustes.maxMatchdaysPerPlayer).toBe(2);
  });
});
