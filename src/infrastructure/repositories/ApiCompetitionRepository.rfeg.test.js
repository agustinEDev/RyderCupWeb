import { describe, it, expect, beforeEach, vi } from 'vitest';
import ApiCompetitionRepository from './ApiCompetitionRepository';
import * as apiModule from '../http/api';

vi.mock('../http/api', async () => ({
  segmento: (await vi.importActual('../http/rutaDeLaApi')).segmento,
  default: vi.fn(),
}));

/**
 * Mis hándicaps sin actualizar con la RFEG (15 nov 2026; RyderCupAm #864).
 *
 *   caso                                   | qué devuelve
 *   ---------------------------------------|-----------------------------------------
 *   L1 con las dos listas                  | en camelCase, sin los jugadores
 *   L2 respuesta vacía o sin listas        | dos listas vacías
 */
describe('ApiCompetitionRepository · hándicaps sin actualizar', () => {
  let repo;
  let api;

  beforeEach(() => {
    repo = new ApiCompetitionRepository();
    api = apiModule.default;
    vi.clearAllMocks();
  });

  it('L1: Given las dos listas, When se leen, Then llegan en camelCase', async () => {
    api.mockResolvedValue({
      as_organizer: [
        {
          competition_id: 'c1',
          competition_name: 'Ryder',
          count: 2,
          players: [{ user_id: 'u1', name: 'Ana' }],
        },
      ],
      as_player: [{ competition_id: 'c2', competition_name: 'Medal' }],
    });

    expect(await repo.getMyHandicapsNotUpdated()).toStrictEqual({
      asOrganizer: [
        { competitionId: 'c1', competitionName: 'Ryder', count: 2 },
      ],
      asPlayer: [{ competitionId: 'c2', competitionName: 'Medal' }],
    });
    expect(api).toHaveBeenCalledWith(
      '/api/v1/competitions/me/handicaps-not-updated',
    );
  });

  it('L2: Given una respuesta sin listas, When se lee, Then dos listas vacías', async () => {
    api.mockResolvedValue(null);

    expect(await repo.getMyHandicapsNotUpdated()).toStrictEqual({
      asOrganizer: [],
      asPlayer: [],
    });
  });
});
