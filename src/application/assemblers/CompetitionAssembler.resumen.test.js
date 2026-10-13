import { describe, it, expect } from 'vitest';
import CompetitionAssembler from './CompetitionAssembler';
import CompetitionMapper from '../../infrastructure/mappers/CompetitionMapper';

/**
 * Lo que la tarjeta de «Mis competiciones» necesita del listado (FE #846,
 * RyderCupAm#558): sus campos, cuántas jornadas tiene y mi próxima salida.
 * Y el motivo de la ventana de hándicaps como código (RyderCupAm#541).
 *
 *   #   llega                                  | queda
 *   ----|----------------------------------------|------------------------------------
 *   1   golf_courses con dos                   | golfCourses en camelCase, en orden
 *   2   golf_courses vacío                     | []
 *   3   sin golf_courses (servidor anterior)   | null: no se sabe, no «ninguno»
 *   4   playing_days                           | playingDays; sin él, null
 *   5   my_next_session con hora               | myNextSession {date, sessionType, teeTime}
 *   6   my_next_session sin hora               | teeTime null
 *   7   sin my_next_session                    | null
 *   8   ventana con reason_code                | reasonCode; sin él, null
 */
const api = (extra = {}) => ({
  id: '550e8400-e29b-41d4-a716-446655440000',
  creator_id: '550e8400-e29b-41d4-a716-446655440001',
  name: 'Medal de otoño',
  start_date: '2030-10-12',
  end_date: '2030-10-13',
  country_code: 'ES',
  play_mode: 'HANDICAP',
  number_of_players: 12,
  status: 'CLOSED',
  tournament_type: 'MEDAL',
  created_at: '2030-10-01T10:00:00Z',
  updated_at: '2030-10-01T10:00:00Z',
  ...extra,
});
const tarjeta = (apiData) => CompetitionAssembler.toSimpleDTO(CompetitionMapper.toDomain(apiData), apiData);

describe('CompetitionAssembler · resumen de la tarjeta (FE #846)', () => {
  it('1 · los campos, en camelCase y en su orden', () => {
    const d = tarjeta(
      api({
        golf_courses: [
          { id: 'gc-2', name: 'El Prat', country_code: 'ES' },
          { id: 'gc-1', name: 'Penha Longa', country_code: 'PT' },
        ],
      })
    );

    expect(d.golfCourses).toEqual([
      { id: 'gc-2', name: 'El Prat', countryCode: 'ES' },
      { id: 'gc-1', name: 'Penha Longa', countryCode: 'PT' },
    ]);
  });

  it('2 · sin campos todavía, lista vacía', () => {
    expect(tarjeta(api({ golf_courses: [] })).golfCourses).toEqual([]);
  });

  it('3 · un servidor que no los manda: null, no «ninguno»', () => {
    expect(tarjeta(api()).golfCourses).toBeNull();
  });

  it('4 · las jornadas; sin el campo, null', () => {
    expect(tarjeta(api({ playing_days: 2 })).playingDays).toBe(2);
    expect(tarjeta(api({ playing_days: 0 })).playingDays).toBe(0);
    expect(tarjeta(api()).playingDays).toBeNull();
  });

  it('5 · mi próxima salida, con su hora', () => {
    const d = tarjeta(api({ my_next_session: { date: '2030-10-12', session_type: 'MORNING', tee_time: '08:10' } }));

    expect(d.myNextSession).toEqual({ date: '2030-10-12', sessionType: 'MORNING', teeTime: '08:10' });
  });

  it('6 · sin hora todavía', () => {
    const d = tarjeta(api({ my_next_session: { date: '2030-10-12', session_type: 'AFTERNOON', tee_time: null } }));

    expect(d.myNextSession).toEqual({ date: '2030-10-12', sessionType: 'AFTERNOON', teeTime: null });
    // Sin el campo, también null: nunca undefined
    expect(tarjeta(api({ my_next_session: { date: '2030-10-12', session_type: 'MORNING' } })).myNextSession.teeTime).toBeNull();
  });

  it('7 · sin próxima salida, null', () => {
    expect(tarjeta(api({ my_next_session: null })).myNextSession).toBeNull();
    expect(tarjeta(api()).myNextSession).toBeNull();
  });

  it('8 · el motivo de la ventana, también como código', () => {
    const ventana = (extra) =>
      tarjeta(api({ handicap_update_window: { open: false, reason: 'Ya no quedan jornadas por jugar.', ...extra } }))
        .handicapUpdateWindow;

    expect(ventana({ reason_code: 'NO_DAYS_LEFT' }).reasonCode).toBe('NO_DAYS_LEFT');
    expect(ventana({}).reasonCode).toBeNull();
  });
});
