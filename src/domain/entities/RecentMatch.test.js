import { describe, it, expect } from 'vitest';
import RecentMatch from './RecentMatch';

describe('RecentMatch', () => {
  const tournamentMatch = {
    id: 'match-1',
    date: '2026-08-01',
    matchFormat: 'SINGLES',
    tournamentName: 'Ryder Cup Amigos',
    result: 'WON',
    score: '3&2',
    opponents: ['Ana Soto'],
  };

  const quickMatch = {
    id: 'qm-1',
    date: '2026-08-05',
    scoringFormat: 'MEDAL',
    golfCourseName: 'St Andrews',
    score: '+4',
  };

  it('requires an id', () => {
    expect(() => RecentMatch.fromPersistence({})).toThrow('id must be a non-empty string');
  });

  it('exposes what it was given', () => {
    const match = RecentMatch.fromPersistence(tournamentMatch);

    expect(match.id).toBe('match-1');
    expect(match.matchFormat).toBe('SINGLES');
    expect(match.result).toBe('WON');
    expect(match.score).toBe('3&2');
    expect(match.opponents).toEqual(['Ana Soto']);
  });

  it('does not let its player lists be mutated from outside', () => {
    const opponents = ['Ana Soto'];
    const match = RecentMatch.fromPersistence({ id: 'm', opponents });

    opponents.push('Intruso');

    expect(match.opponents).toEqual(['Ana Soto']);
  });

  describe('isFromTournament', () => {
    it('goes by the tournament name, not the format', () => {
      // Una partida rapida tambien puede jugarse en SINGLES: el formato no
      // dice de donde salio
      expect(RecentMatch.fromPersistence(tournamentMatch).isFromTournament()).toBe(true);
      expect(
        RecentMatch.fromPersistence({ id: 'x', matchFormat: 'SINGLES' }).isFromTournament()
      ).toBe(false);
    });

    it('treats a quick match as not from a tournament', () => {
      expect(RecentMatch.fromPersistence(quickMatch).isFromTournament()).toBe(false);
    });
  });

  describe('isUnfinished', () => {
    // Una partida rápida de match play que no cuenta (24 oct 2026)
    it('is true for an unfinished quick match', () => {
      expect(RecentMatch.fromPersistence({ id: 'x', result: 'UNFINISHED' }).isUnfinished()).toBe(true);
    });

    it('is false for a decided match and for a round without result', () => {
      expect(RecentMatch.fromPersistence(tournamentMatch).isUnfinished()).toBe(false);
      expect(RecentMatch.fromPersistence({ id: 'y' }).isUnfinished()).toBe(false);
    });

    it('shows no score when unfinished, even if one arrives', () => {
      const match = RecentMatch.fromPersistence({ id: 'z', result: 'UNFINISHED', score: '6UP' });
      expect(match.shownScore).toBeNull();
      expect(RecentMatch.fromPersistence(tournamentMatch).shownScore).toBe(tournamentMatch.score);
    });
  });

  describe('hasResult', () => {
    it('is true for a match play result', () => {
      expect(RecentMatch.fromPersistence(tournamentMatch).hasResult()).toBe(true);
    });

    it('is false for a medal round, which nobody wins', () => {
      expect(RecentMatch.fromPersistence(quickMatch).hasResult()).toBe(false);
    });

    it('counts a halved match as a result', () => {
      expect(RecentMatch.fromPersistence({ id: 'm', result: 'HALVED' }).hasResult()).toBe(true);
    });
  });

  describe('detailPath', () => {
    it('sends a tournament match to the competition scoring page', () => {
      expect(RecentMatch.fromPersistence(tournamentMatch).detailPath).toBe(
        '/player/matches/match-1/scoring'
      );
    });

    it('sends a quick match to its own scoring page', () => {
      expect(RecentMatch.fromPersistence(quickMatch).detailPath).toBe(
        '/quick-matches/qm-1/scoring'
      );
    });
  });
});
