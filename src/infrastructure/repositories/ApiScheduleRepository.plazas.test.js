import { describe, it, expect, beforeEach, vi } from 'vitest';
import ApiScheduleRepository from './ApiScheduleRepository';
import * as apiModule from '../../services/api';

vi.mock('../../services/api', () => ({ default: vi.fn() }));

/**
 * D1-D2 (FE #824, PR 4): plazas, listas de espera y el aviso de plaza asignada
 * (RyderCupAm#511, #512).
 */
describe('ApiScheduleRepository · plazas y esperas (FE #824)', () => {
  let repo;
  let api;

  beforeEach(() => {
    repo = new ApiScheduleRepository();
    api = apiModule.default;
    vi.clearAllMocks();
    api.mockResolvedValue({});
  });

  it('coger plaza para uno mismo: POST sin cuerpo que valga', async () => {
    await repo.takePlace('r-1', {});

    expect(api).toHaveBeenCalledWith('/api/v1/competitions/rounds/r-1/places', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  });

  it('cambiarse, o colocar a otro: con sus nombres de la API', async () => {
    await repo.takePlace('r-2', { userId: 'u-1', insteadOfRoundId: 'r-1' });

    expect(JSON.parse(api.mock.calls[0][1].body)).toEqual({ user_id: 'u-1', instead_of_round_id: 'r-1' });
  });

  it('soltar plaza', async () => {
    await repo.releasePlace('r-1', 'u-1');

    expect(api).toHaveBeenCalledWith('/api/v1/competitions/rounds/r-1/places/u-1', { method: 'DELETE' });
  });

  it('apuntarse a la espera', async () => {
    await repo.joinWaitingList('r-1');

    expect(api).toHaveBeenCalledWith('/api/v1/competitions/rounds/r-1/waiting-list', { method: 'POST' });
  });

  it('salir de la espera', async () => {
    await repo.leaveWaitingList('r-1', 'u-1');

    expect(api).toHaveBeenCalledWith('/api/v1/competitions/rounds/r-1/waiting-list/u-1', { method: 'DELETE' });
  });

  it('mis plazas asignadas desde la espera, en camelCase y con la hora en HH:MM', async () => {
    api.mockResolvedValue([
      {
        competition_id: 'c-1',
        competition_name: 'Medal de octubre',
        round_id: 'r-1',
        round_date: '2030-10-12',
        session_type: 'MORNING',
        first_tee_time: '08:00:00',
        assigned_at: '2030-10-01T10:00:00Z',
      },
    ]);

    const plazas = await repo.getMyAssignedPlaces();

    expect(api).toHaveBeenCalledWith('/api/v1/competitions/me/assigned-places');
    expect(plazas).toEqual([
      {
        competitionId: 'c-1',
        competitionName: 'Medal de octubre',
        roundId: 'r-1',
        roundDate: '2030-10-12',
        sessionType: 'MORNING',
        firstTeeTime: '08:00',
        assignedAt: '2030-10-01T10:00:00Z',
      },
    ]);
  });

  it('«Entendido»', async () => {
    await repo.acknowledgeAssignedPlace('r-1');

    expect(api).toHaveBeenCalledWith('/api/v1/competitions/me/assigned-places/r-1/acknowledge', { method: 'POST' });
  });
});
