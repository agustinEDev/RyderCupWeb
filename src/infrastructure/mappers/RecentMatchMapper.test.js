import { describe, it, expect } from 'vitest';
import RecentMatchMapper from './RecentMatchMapper';

describe('RecentMatchMapper', () => {
  it('maps a tournament match', () => {
    const match = RecentMatchMapper.toDomain({
      id: 'match-1',
      date: '2026-08-01',
      match_format: 'SINGLES',
      scoring_format: null,
      golf_course_id: 'course-1',
      golf_course_name: 'St Andrews',
      tournament_name: 'Ryder Cup Amigos',
      result: 'WON',
      score: '3&2',
      stableford_points: null,
      partners: [],
      opponents: ['Ana Soto'],
    });

    expect(match.id).toBe('match-1');
    expect(match.matchFormat).toBe('SINGLES');
    expect(match.golfCourseName).toBe('St Andrews');
    expect(match.tournamentName).toBe('Ryder Cup Amigos');
    // Un partido de torneo no tiene nombre propio: tiene el de su competición
    expect(match.matchName).toBeNull();
    expect(match.result).toBe('WON');
    expect(match.opponents).toEqual(['Ana Soto']);
    expect(match.isFromTournament()).toBe(true);
  });

  it('maps a free quick match, where most fields are absent', () => {
    const match = RecentMatchMapper.toDomain({
      id: 'qm-1',
      date: '2026-08-05',
      scoring_format: 'STABLEFORD',
      stableford_points: 34,
    });

    expect(match.scoringFormat).toBe('STABLEFORD');
    expect(match.stablefordPoints).toBe(34);
    expect(match.matchFormat).toBeNull();
    expect(match.tournamentName).toBeNull();
    expect(match.isFromTournament()).toBe(false);
  });

  // #575: es la única línea que ata el campo de la API al dominio, y el nombre
  // del campo no es evidente — la partida rápida lo llama `name` en su propio
  // endpoint y `match_name` en este
  it('maps the name a quick match was created with', () => {
    const match = RecentMatchMapper.toDomain({
      id: 'qm-named',
      match_format: 'FOURBALL',
      match_name: 'Meis Fourball',
      opponents: ['Ana Soto'],
    });

    expect(match.matchName).toBe('Meis Fourball');
  });

  it('leaves the name null when the quick match was created without one', () => {
    const match = RecentMatchMapper.toDomain({ id: 'qm-nameless' });

    expect(match.matchName).toBeNull();
  });

  it('keeps zero stableford points, which is a real score', () => {
    const match = RecentMatchMapper.toDomain({ id: 'qm-1', stableford_points: 0 });

    expect(match.stablefordPoints).toBe(0);
  });

  it('refuses an entry with no id', () => {
    expect(() => RecentMatchMapper.toDomain({ date: '2026-08-01' })).toThrow('Missing required field');
  });

  it('refuses nothing at all', () => {
    expect(() => RecentMatchMapper.toDomain(null)).toThrow('apiData is required');
  });

  describe('toDomainList', () => {
    it('maps every entry', () => {
      const matches = RecentMatchMapper.toDomainList([{ id: 'a' }, { id: 'b' }]);

      expect(matches.map((m) => m.id)).toEqual(['a', 'b']);
    });

    it('returns an empty list when the response has no matches array', () => {
      expect(RecentMatchMapper.toDomainList(undefined)).toEqual([]);
      expect(RecentMatchMapper.toDomainList(null)).toEqual([]);
    });
  });
});
