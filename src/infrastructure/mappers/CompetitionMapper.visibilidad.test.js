import { describe, it, expect } from 'vitest';
import CompetitionMapper from './CompetitionMapper';

/**
 * La visibilidad tiene que llegar del servidor a la pantalla (FE #664).
 *
 * El backend ya la devuelve (RyderCupAM#318), pero un campo que el mapper no
 * lee no existe para la aplicación: el detalle no puede enseñarlo y el
 * formulario de edición lo pierde al guardar.
 */
const respuestaDeLaApi = (extra = {}) => ({
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
  created_at: '2026-09-20T10:00:00Z',
  updated_at: '2026-09-20T10:00:00Z',
  ...extra,
});

describe('CompetitionMapper · de quién es el torneo (FE #664)', () => {
  it('trae la visibilidad que dice el servidor', () => {
    const competition = CompetitionMapper.toDomain(respuestaDeLaApi({ visibility: 'PUBLIC' }));

    expect(competition.visibility).toBe('PUBLIC');
  });

  it('y la privada, igual', () => {
    const competition = CompetitionMapper.toDomain(respuestaDeLaApi({ visibility: 'PRIVATE' }));

    expect(competition.visibility).toBe('PRIVATE');
  });

  it('sin el campo se asume privada, que es lo que el servidor hace', () => {
    // Una respuesta de antes de que el campo existiera no convierte en pública
    // un torneo que no lo es
    const competition = CompetitionMapper.toDomain(respuestaDeLaApi());

    expect(competition.visibility).toBe('PRIVATE');
  });
});
