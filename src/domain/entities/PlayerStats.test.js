import { describe, it, expect } from 'vitest';
import PlayerStats from './PlayerStats';

/**
 * Lo que estos tests protegen es la distinción entre null y cero, y el signo
 * de la tendencia. Los dos se prestan a un "arreglo" bienintencionado que
 * rompería lo que la interfaz enseña.
 */
describe('PlayerStats', () => {
  const fullStats = {
    handicap: 14.2,
    handicapTrend: -0.4,
    scoringAvg: 12.5,
    roundsPlayed: 12,
    tournamentsTotal: 3,
    tournamentsActive: 1,
    estimatedIndex: 12.8,
    playingAvg: 16.1,
    bestDifferential: 9.4,
    roundsWithDifferential: 8,
    differentials: [12.1, 14.0, 9.4],
  };

  describe('construction', () => {
    it('exposes every value it was given', () => {
      const stats = PlayerStats.fromPersistence(fullStats);

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

    it('leaves the averages null on an empty account, not zero', () => {
      const stats = PlayerStats.empty();

      // Un cero aquí se leería como "juega al par", que es justo lo contrario
      expect(stats.handicap).toBeNull();
      expect(stats.scoringAvg).toBeNull();
      expect(stats.estimatedIndex).toBeNull();
      expect(stats.bestDifferential).toBeNull();
      // Los contadores sí empiezan en cero: ahí el cero es la respuesta
      expect(stats.roundsPlayed).toBe(0);
      expect(stats.tournamentsTotal).toBe(0);
    });

    it('does not let the series be mutated from outside', () => {
      const differentials = [12.1, 14.0];
      const stats = PlayerStats.fromPersistence({ differentials });

      differentials.push(99.9);

      expect(stats.differentials).toEqual([12.1, 14.0]);
      expect(() => stats.differentials.push(1)).toThrow();
    });
  });

  describe('hasEstimatedIndex', () => {
    it('is true when the backend published one', () => {
      expect(PlayerStats.fromPersistence({ estimatedIndex: 12.8 }).hasEstimatedIndex()).toBe(true);
    });

    it('is false when there are not enough rounds yet', () => {
      expect(PlayerStats.empty().hasEstimatedIndex()).toBe(false);
    });

    it('is true for a plus player, whose index is negative', () => {
      expect(PlayerStats.fromPersistence({ estimatedIndex: -1.4 }).hasEstimatedIndex()).toBe(true);
    });

    it('is true for a scratch player, whose index is exactly zero', () => {
      expect(PlayerStats.fromPersistence({ estimatedIndex: 0 }).hasEstimatedIndex()).toBe(true);
    });
  });

  describe('hasRoundsWithoutDifferential', () => {
    it('is true when some round was played without a recorded tee', () => {
      const stats = PlayerStats.fromPersistence({
        roundsPlayed: 12,
        roundsWithDifferential: 8,
      });

      expect(stats.hasRoundsWithoutDifferential()).toBe(true);
    });

    it('is false when every round counted', () => {
      const stats = PlayerStats.fromPersistence({
        roundsPlayed: 8,
        roundsWithDifferential: 8,
      });

      expect(stats.hasRoundsWithoutDifferential()).toBe(false);
    });

    it('is false on an empty account', () => {
      expect(PlayerStats.empty().hasRoundsWithoutDifferential()).toBe(false);
    });
  });

  describe('isPlayingBetterThanHandicap', () => {
    it('is true when the index beats the official handicap', () => {
      const stats = PlayerStats.fromPersistence({ handicap: 14.2, estimatedIndex: 12.8 });

      expect(stats.isPlayingBetterThanHandicap()).toBe(true);
    });

    it('is false when playing worse than the handicap', () => {
      const stats = PlayerStats.fromPersistence({ handicap: 12.0, estimatedIndex: 15.3 });

      expect(stats.isPlayingBetterThanHandicap()).toBe(false);
    });

    it('is false without an index to compare against', () => {
      const stats = PlayerStats.fromPersistence({ handicap: 14.2 });

      expect(stats.isPlayingBetterThanHandicap()).toBe(false);
    });

    it('is false without a handicap on the profile', () => {
      const stats = PlayerStats.fromPersistence({ estimatedIndex: 12.8 });

      expect(stats.isPlayingBetterThanHandicap()).toBe(false);
    });
  });

  describe('isImproving', () => {
    it('reads a negative trend as improvement', () => {
      // Los diferenciales bajan al jugar mejor, igual que baja un hándicap
      expect(PlayerStats.fromPersistence({ handicapTrend: -0.4 }).isImproving()).toBe(true);
    });

    it('reads a positive trend as getting worse', () => {
      expect(PlayerStats.fromPersistence({ handicapTrend: 1.2 }).isImproving()).toBe(false);
    });

    it('does not call standing still an improvement', () => {
      expect(PlayerStats.fromPersistence({ handicapTrend: 0 }).isImproving()).toBe(false);
    });

    it('is false while there is no trend yet', () => {
      expect(PlayerStats.empty().isImproving()).toBe(false);
    });
  });
});
