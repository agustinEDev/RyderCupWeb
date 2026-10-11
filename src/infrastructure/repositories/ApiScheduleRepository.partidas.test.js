import { describe, it, expect, beforeEach, vi } from 'vitest';
import ApiScheduleRepository from './ApiScheduleRepository';
import * as apiModule from '../../services/api';

vi.mock('../../services/api', () => ({ default: vi.fn() }));

/**
 * Las partidas de cada franja (FE #824, PR 6; RyderCupAm#534). Toda escritura
 * contesta con la vista de la franja.
 */
const VISTA = {
  round_id: 'r-1',
  editable: true,
  unassigned_players: [{ user_id: 'u-9', name: 'Ines Ibarra' }],
  groups: [
    {
      id: 'g-1',
      number: 1,
      tee_time: '08:00:00',
      status: 'SCHEDULED',
      incomplete: false,
      players: [
        {
          user_id: 'u-1',
          name: 'Ana Alba',
          handicap: '12.3',
          playing_handicap: -2,
          tee_color: 'YELLOW',
          tee_gender: 'FEMALE',
          strokes_by_hole: Array(18).fill(0),
          marks_user_id: 'u-2',
          brought_in: true,
        },
      ],
    },
  ],
};

const VISTA_LEIDA = {
  roundId: 'r-1',
  editable: true,
  unassignedPlayers: [{ userId: 'u-9', name: 'Ines Ibarra' }],
  groups: [
    {
      id: 'g-1',
      number: 1,
      teeTime: '08:00',
      status: 'SCHEDULED',
      incomplete: false,
      players: [
        {
          userId: 'u-1',
          name: 'Ana Alba',
          handicap: 12.3,
          playingHandicap: -2,
          teeColor: 'YELLOW',
          teeGender: 'FEMALE',
          strokesByHole: Array(18).fill(0),
          marksUserId: 'u-2',
          // Vino de otra partida a acompañar al que se quedó solo (BE #539)
          broughtIn: true,
        },
      ],
    },
  ],
};

describe('ApiScheduleRepository · partidas (FE #824, PR 6)', () => {
  let repo;
  let api;

  beforeEach(() => {
    repo = new ApiScheduleRepository();
    api = apiModule.default;
    vi.clearAllMocks();
    api.mockResolvedValue(VISTA);
  });

  it('las partidas de una franja, en camelCase, con el hándicap en número y la hora en HH:MM', async () => {
    const vista = await repo.getTeeGroups('r-1');

    expect(api).toHaveBeenCalledWith('/api/v1/competitions/rounds/r-1/groups');
    expect(vista).toEqual(VISTA_LEIDA);
  });

  it('sin marcador (partida de 1) y sin listas: null y vacías', async () => {
    api.mockResolvedValue({
      round_id: 'r-1',
      editable: false,
      groups: [{ ...VISTA.groups[0], players: [{ ...VISTA.groups[0].players[0], marks_user_id: null, tee_gender: null, brought_in: undefined }] }],
    });

    const vista = await repo.getTeeGroups('r-1');

    expect(vista.unassignedPlayers).toEqual([]);
    expect(vista.groups[0].players[0].marksUserId).toBeNull();
    expect(vista.groups[0].players[0].teeGender).toBeNull();
    // Sin el campo (backend anterior), no vino de ninguna parte
    expect(vista.groups[0].players[0].broughtIn).toBe(false);
  });

  it('mis partidas, por jornada', async () => {
    api.mockResolvedValue({
      groups: [{ round_id: 'r-1', round_date: '2030-10-12', session_type: 'MORNING', group: VISTA.groups[0] }],
    });

    const mias = await repo.getMyTeeGroups('c-1');

    expect(api).toHaveBeenCalledWith('/api/v1/competitions/c-1/groups/me');
    expect(mias).toEqual([
      { roundId: 'r-1', roundDate: '2030-10-12', sessionType: 'MORNING', group: VISTA_LEIDA.groups[0] },
    ]);
  });

  it('generar, con el orden', async () => {
    const vista = await repo.generateTeeGroups('r-1', 'HIGH_FIRST');

    expect(api).toHaveBeenCalledWith('/api/v1/competitions/rounds/r-1/groups/generate', {
      method: 'POST',
      body: JSON.stringify({ order: 'HIGH_FIRST' }),
    });
    expect(vista).toEqual(VISTA_LEIDA);
  });

  it('mover a una partida, intercambiando', async () => {
    const vista = await repo.moveTeeGroupPlayer('r-1', { userId: 'u-1', groupId: 'g-2', swapWithUserId: 'u-5' });

    expect(api).toHaveBeenCalledWith('/api/v1/competitions/rounds/r-1/groups/players', {
      method: 'POST',
      body: JSON.stringify({ user_id: 'u-1', group_id: 'g-2', swap_with_user_id: 'u-5' }),
    });
    expect(vista).toEqual(VISTA_LEIDA);
  });

  it('mover a una partida nueva al final: sin partida ni intercambio', async () => {
    await repo.moveTeeGroupPlayer('r-1', { userId: 'u-1' });

    expect(JSON.parse(api.mock.calls[0][1].body)).toEqual({ user_id: 'u-1' });
  });

  it('cambiar el orden', async () => {
    const vista = await repo.reorderTeeGroups('r-1', ['g-2', 'g-1']);

    expect(api).toHaveBeenCalledWith('/api/v1/competitions/rounds/r-1/groups/order', {
      method: 'PUT',
      body: JSON.stringify({ group_ids: ['g-2', 'g-1'] }),
    });
    expect(vista).toEqual(VISTA_LEIDA);
  });

  it('cambiar los marcadores de una partida', async () => {
    const vista = await repo.setTeeGroupMarkers('g-1', [
      { userId: 'u-1', marksUserId: 'u-2' },
      { userId: 'u-2', marksUserId: 'u-1' },
    ]);

    expect(api).toHaveBeenCalledWith('/api/v1/competitions/groups/g-1/markers', {
      method: 'PUT',
      body: JSON.stringify({
        markers: [
          { user_id: 'u-1', marks_user_id: 'u-2' },
          { user_id: 'u-2', marks_user_id: 'u-1' },
        ],
      }),
    });
    expect(vista).toEqual(VISTA_LEIDA);
  });

  it('borrar las partidas de la franja', async () => {
    api.mockResolvedValue(undefined);

    await repo.deleteTeeGroups('r-1');

    expect(api).toHaveBeenCalledWith('/api/v1/competitions/rounds/r-1/groups', { method: 'DELETE' });
  });
});
