import { describe, it, expect } from 'vitest';
import PlayerStatsMapper from './PlayerStatsMapper';

describe('PlayerStatsMapper', () => {
  it('maps every field from snake_case to the entity', () => {
    const stats = PlayerStatsMapper.toDomain({
      handicap: 14.2,
      handicap_trend: -0.4,
      scoring_avg: 12.5,
      rounds_played: 12,
      tournaments_total: 3,
      tournaments_active: 1,
      estimated_index: 12.8,
      playing_avg: 16.1,
      best_differential: 9.4,
      rounds_with_differential: 8,
      differentials: [12.1, 14.0, 9.4],
    });

    expect(stats.handicap).toBe(14.2);
    expect(stats.handicapTrend).toBe(-0.4);
    expect(stats.scoringAvg).toBe(12.5);
    expect(stats.roundsPlayed).toBe(12);
    expect(stats.tournamentsTotal).toBe(3);
    expect(stats.tournamentsActive).toBe(1);
    expect(stats.estimatedIndex).toBe(12.8);
    expect(stats.playingAvg).toBe(16.1);
    expect(stats.bestDifferential).toBe(9.4);
    expect(stats.roundsWithDifferential).toBe(8);
    expect(stats.differentials).toEqual([12.1, 14.0, 9.4]);
  });

  it('keeps the nulls of a brand new account as nulls', () => {
    const stats = PlayerStatsMapper.toDomain({
      handicap: null,
      handicap_trend: null,
      scoring_avg: null,
      rounds_played: 0,
      tournaments_total: 0,
      tournaments_active: 0,
      estimated_index: null,
      playing_avg: null,
      best_differential: null,
      rounds_with_differential: 0,
      differentials: [],
    });

    // Convertirlos en ceros diría que juega al par sin haber jugado nunca
    expect(stats.scoringAvg).toBeNull();
    expect(stats.estimatedIndex).toBeNull();
    expect(stats.bestDifferential).toBeNull();
    expect(stats.roundsPlayed).toBe(0);
  });

  it('keeps a zero index, which is a scratch player and not a missing value', () => {
    const stats = PlayerStatsMapper.toDomain({ estimated_index: 0, scoring_avg: 0 });

    expect(stats.estimatedIndex).toBe(0);
    expect(stats.scoringAvg).toBe(0);
  });

  it('keeps negative values, which are a plus player', () => {
    const stats = PlayerStatsMapper.toDomain({ estimated_index: -1.4, best_differential: -2.1 });

    expect(stats.estimatedIndex).toBe(-1.4);
    expect(stats.bestDifferential).toBe(-2.1);
  });

  it('falls back to defaults for fields the response leaves out', () => {
    const stats = PlayerStatsMapper.toDomain({});

    expect(stats.handicap).toBeNull();
    expect(stats.roundsPlayed).toBe(0);
    expect(stats.differentials).toEqual([]);
  });

  it('survives a differentials field that is not an array', () => {
    const stats = PlayerStatsMapper.toDomain({ differentials: null });

    expect(stats.differentials).toEqual([]);
  });

  it('refuses to map nothing at all', () => {
    expect(() => PlayerStatsMapper.toDomain(null)).toThrow('apiData is required');
  });
});
