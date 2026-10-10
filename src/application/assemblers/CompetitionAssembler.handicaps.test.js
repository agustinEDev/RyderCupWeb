import { describe, it, expect } from 'vitest';
import CompetitionAssembler from './CompetitionAssembler';
import CompetitionMapper from '../../infrastructure/mappers/CompetitionMapper';

/**
 * D2 (FE #824, PR 5): el estado de la última actualización de hándicaps y la
 * ventana del botón llegan a la ficha (RyderCupAM#507, #509, #510). Solo al
 * organizador: a los demás les llegan vacíos.
 */
const api = (extra = {}) => ({
  id: '550e8400-e29b-41d4-a716-446655440000',
  creator_id: '550e8400-e29b-41d4-a716-446655440001',
  name: 'Medal',
  start_date: '2030-10-12',
  end_date: '2030-10-12',
  country_code: 'ES',
  play_mode: 'HANDICAP',
  number_of_players: 12,
  status: 'CLOSED',
  tournament_type: 'MEDAL',
  created_at: '2030-10-01T10:00:00Z',
  updated_at: '2030-10-01T10:00:00Z',
  ...extra,
});
const ficha = (apiData) => CompetitionAssembler.toSimpleDTO(CompetitionMapper.toDomain(apiData), apiData);

describe('CompetitionAssembler · actualizaciones de hándicap (FE #824)', () => {
  it('la última actualización, en camelCase', () => {
    const d = ficha(
      api({
        handicap_update: {
          status: 'INCOMPLETE',
          origin: 'ORGANIZER',
          started_at: '2030-10-10T20:05:00Z',
          finished_at: '2030-10-10T20:09:00Z',
          pending_players: [{ user_id: 'u1', name: 'Ana Alba' }],
        },
      })
    );

    expect(d.handicapUpdate).toEqual({
      status: 'INCOMPLETE',
      origin: 'ORGANIZER',
      startedAt: '2030-10-10T20:05:00Z',
      finishedAt: '2030-10-10T20:09:00Z',
      pendingPlayers: [{ userId: 'u1', name: 'Ana Alba' }],
    });
  });

  it('la ventana del botón', () => {
    const d = ficha(
      api({
        handicap_update_window: {
          open: true,
          closes_at: '2030-10-12T05:40:00Z',
          reason: null,
          scheduled_at: '2030-10-12T01:00:00Z',
        },
      })
    );

    expect(d.handicapUpdateWindow).toEqual({
      open: true,
      closesAt: '2030-10-12T05:40:00Z',
      reason: null,
      scheduledAt: '2030-10-12T01:00:00Z',
    });
  });

  it('sin ellos (quien no organiza, o antes de la primera), null', () => {
    const d = ficha(api());

    expect(d.handicapUpdate).toBeNull();
    expect(d.handicapUpdateWindow).toBeNull();
  });
});
