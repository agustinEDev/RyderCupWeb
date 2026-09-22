import { describe, it, expect } from 'vitest';
import DraftMapper from './DraftMapper';

/**
 * La sala de draft, de la API a la pantalla (FE #653).
 *
 * El mapper es donde se pierde un campo sin que nadie lo note: la sala se
 * pinta entera cada pocos segundos, así que un `turn_started_at` que no llega
 * deja el contador en blanco sin ningún error en consola.
 */
const RESPUESTA = {
  id: 'sala-1',
  competition_id: 'comp-1',
  status: 'IN_PROGRESS',
  first_pick: 'B',
  current_team: 'A',
  turn_started_at: '2030-06-01T10:00:00',
  seconds_per_turn: 60,
  server_time: '2030-06-01T10:00:20',
  team_a_captain_id: 'ana',
  team_b_captain_id: 'bea',
  team_a: ['ana', 'carla'],
  team_b: ['bea'],
  picks: [{ user_id: 'carla', team: 'A', order: 1, automatic: false }],
  available_players: [{ user_id: 'dani', name: 'Dani Díaz', handicap: '12.0' }],
};

describe('DraftMapper', () => {
  it('M1: trae todos los campos de la sala en camelCase', () => {
    const sala = DraftMapper.toDraftDTO(RESPUESTA);

    expect(sala).toEqual({
      id: 'sala-1',
      competitionId: 'comp-1',
      status: 'IN_PROGRESS',
      firstPick: 'B',
      currentTeam: 'A',
      turnStartedAt: '2030-06-01T10:00:00',
      secondsPerTurn: 60,
      serverTime: '2030-06-01T10:00:20',
      teamACaptainId: 'ana',
      teamBCaptainId: 'bea',
      teamA: ['ana', 'carla'],
      teamB: ['bea'],
      picks: [{ userId: 'carla', team: 'A', order: 1, automatic: false }],
      availablePlayers: [{ userId: 'dani', name: 'Dani Díaz', handicap: 12 }],
    });
  });

  it('M2: el hándicap llega como texto y se usa como número', () => {
    // La API lo serializa como string decimal: ordenar por él como texto
    // pondría «9.0» detrás de «12.0»
    const sala = DraftMapper.toDraftDTO({
      ...RESPUESTA,
      available_players: [
        { user_id: 'a', name: 'A', handicap: '9.0' },
        { user_id: 'b', name: 'B', handicap: '12.0' },
      ],
    });

    expect(sala.availablePlayers.map(j => j.handicap)).toEqual([9, 12]);
  });

  it('M3: una sala terminada no trae turno ni reloj, y no se inventan', () => {
    const sala = DraftMapper.toDraftDTO({
      ...RESPUESTA,
      status: 'COMPLETED',
      current_team: null,
      turn_started_at: null,
      picks: [],
      available_players: [],
    });

    expect(sala.currentTeam).toBeNull();
    expect(sala.turnStartedAt).toBeNull();
    expect(sala.picks).toEqual([]);
    expect(sala.availablePlayers).toEqual([]);
  });

  it('M4: sin listas en la respuesta devuelve listas vacías, no undefined', () => {
    // La pantalla hace `.map` sobre las cuatro: una sola que falte la tumba
    const sala = DraftMapper.toDraftDTO({ id: 'x', competition_id: 'c', status: 'PENDING' });

    expect([sala.teamA, sala.teamB, sala.picks, sala.availablePlayers]).toEqual([[], [], [], []]);
  });

  it('M5: un hándicap ausente no se convierte en NaN', () => {
    const sala = DraftMapper.toDraftDTO({
      ...RESPUESTA,
      available_players: [{ user_id: 'a', name: 'A', handicap: null }],
    });

    expect(sala.availablePlayers[0].handicap).toBeNull();
  });
});
