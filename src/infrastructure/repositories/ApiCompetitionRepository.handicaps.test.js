import { describe, it, expect, beforeEach, vi } from 'vitest';
import ApiCompetitionRepository from './ApiCompetitionRepository';
import * as apiModule from '../../services/api';

vi.mock('../../services/api', () => ({ default: vi.fn() }));

/** D3 (FE #824, PR 5): las rutas de la actualización de hándicaps. */
describe('ApiCompetitionRepository · actualizar hándicaps (FE #824)', () => {
  let repo;
  let api;

  beforeEach(() => {
    repo = new ApiCompetitionRepository();
    api = apiModule.default;
    vi.clearAllMocks();
    api.mockResolvedValue({});
  });

  it('lanzar', async () => {
    // Lo que manda de verdad el backend (HandicapUpdateLaunchedDTO): sin `status`
    api.mockResolvedValue({ id: 'u-1', origin: 'ORGANIZER', started_at: 'x', resumed: true });

    expect(await repo.launchHandicapUpdate('c-1')).toEqual({ resumed: true });
    expect(api).toHaveBeenCalledWith('/api/v1/competitions/c-1/handicap-updates', { method: 'POST' });
  });

  it('programar', async () => {
    await repo.scheduleHandicapUpdate('c-1', '2030-10-12T03:00:00+02:00');

    expect(api).toHaveBeenCalledWith('/api/v1/competitions/c-1/handicap-updates/schedule', {
      method: 'PUT',
      body: JSON.stringify({ run_at: '2030-10-12T03:00:00+02:00' }),
    });
  });

  it('anular lo programado', async () => {
    await repo.cancelScheduledHandicapUpdate('c-1');

    expect(api).toHaveBeenCalledWith('/api/v1/competitions/c-1/handicap-updates/schedule', { method: 'DELETE' });
  });
});
