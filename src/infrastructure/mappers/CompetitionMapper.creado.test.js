import { describe, it, expect } from 'vitest';
import CompetitionMapper from './CompetitionMapper';

/** «Creado: 23/9» para algo creado el 24 a las 01:55 en España (FE #710). */
describe('CompetitionMapper · la hora de creación sin huso es UTC', () => {
  it('lee created_at y updated_at como UTC', () => {
    const competition = CompetitionMapper.toDomain({
      id: '550e8400-e29b-41d4-a716-446655440000',
      creator_id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Ryder de los amigos',
      start_date: '2027-06-01',
      end_date: '2027-06-03',
      country_code: 'ES',
      play_mode: 'SCRATCH',
      number_of_players: 12,
      team_assignment: 'AUTOMATIC',
      status: 'DRAFT',
      created_at: '2026-09-23T23:55:00',
      updated_at: '2026-09-24T08:00:00.5',
    });

    expect(competition.createdAt.toISOString()).toBe('2026-09-23T23:55:00.000Z');
    expect(competition.updatedAt.toISOString()).toBe('2026-09-24T08:00:00.500Z');
  });
});
