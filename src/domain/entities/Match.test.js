import { describe, it, expect } from 'vitest';
import Match from './Match';
import { MatchStatus } from '../value_objects/MatchStatus';

describe('Match', () => {
  const createValidMatchProps = (overrides = {}) => ({
    id: 'match-1',
    roundId: 'round-1',
    matchNumber: 1,
    teamAPlayers: [
      { userId: 'u1', playingHandicap: 12, teeCategory: 'AMATEUR_MALE', strokesReceived: [1, 3, 5] },
    ],
    teamBPlayers: [
      { userId: 'u2', playingHandicap: 8, teeCategory: 'AMATEUR_MALE', strokesReceived: [] },
    ],
    status: MatchStatus.SCHEDULED,
    handicapStrokesGiven: 4,
    strokesGivenToTeam: 'A',
    result: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  });

  describe('Constructor and Getters', () => {
    it('should create a Match with valid properties', () => {
      const props = createValidMatchProps();
      const match = new Match(props);

      expect(match.id).toBe('match-1');
      expect(match.roundId).toBe('round-1');
      expect(match.matchNumber).toBe(1);
      expect(match.teamAPlayers).toHaveLength(1);
      expect(match.teamAPlayers[0].userId).toBe('u1');
      expect(match.teamBPlayers).toHaveLength(1);
      expect(match.teamBPlayers[0].userId).toBe('u2');
      expect(match.status.equals(MatchStatus.SCHEDULED)).toBe(true);
      expect(match.handicapStrokesGiven).toBe(4);
      expect(match.strokesGivenToTeam).toBe('A');
      expect(match.result).toBeNull();
    });

    it('should default to SCHEDULED status', () => {
      const match = new Match({
        id: 'm-1',
        roundId: 'r-1',
        matchNumber: 1,
      });
      expect(match.status.equals(MatchStatus.SCHEDULED)).toBe(true);
    });

    it('should default optional fields to null or empty', () => {
      const match = new Match({
        id: 'm-1',
        roundId: 'r-1',
        matchNumber: 1,
      });
      expect(match.teamAPlayers).toEqual([]);
      expect(match.teamBPlayers).toEqual([]);
      expect(match.handicapStrokesGiven).toBeNull();
      expect(match.strokesGivenToTeam).toBeNull();
      expect(match.result).toBeNull();
    });

    it('should return defensive copies of player arrays', () => {
      const match = new Match(createValidMatchProps());
      const teamA = match.teamAPlayers;
      teamA.push({ userId: 'u3' });
      expect(match.teamAPlayers).toHaveLength(1);
    });
  });

  describe('Query Methods', () => {
    it('isScheduled()', () => {
      const match = new Match(createValidMatchProps({ status: MatchStatus.SCHEDULED }));
      expect(match.isScheduled()).toBe(true);
      expect(match.isInProgress()).toBe(false);
      expect(match.isCompleted()).toBe(false);
      expect(match.isWalkover()).toBe(false);
    });

    it('isInProgress()', () => {
      const match = new Match(createValidMatchProps({ status: MatchStatus.IN_PROGRESS }));
      expect(match.isInProgress()).toBe(true);
      expect(match.isScheduled()).toBe(false);
    });

    it('isCompleted()', () => {
      const match = new Match(createValidMatchProps({ status: MatchStatus.COMPLETED }));
      expect(match.isCompleted()).toBe(true);
    });

    it('isWalkover()', () => {
      const match = new Match(createValidMatchProps({ status: MatchStatus.WALKOVER }));
      expect(match.isWalkover()).toBe(true);
    });

    it('canStart() should be true for SCHEDULED', () => {
      const match = new Match(createValidMatchProps({ status: MatchStatus.SCHEDULED }));
      expect(match.canStart()).toBe(true);
    });

    it('canStart() should be false for IN_PROGRESS', () => {
      const match = new Match(createValidMatchProps({ status: MatchStatus.IN_PROGRESS }));
      expect(match.canStart()).toBe(false);
    });

    it('canComplete() should be true for IN_PROGRESS', () => {
      const match = new Match(createValidMatchProps({ status: MatchStatus.IN_PROGRESS }));
      expect(match.canComplete()).toBe(true);
    });

    it('canComplete() should be false for SCHEDULED', () => {
      const match = new Match(createValidMatchProps({ status: MatchStatus.SCHEDULED }));
      expect(match.canComplete()).toBe(false);
    });

    it('canComplete() should be false for COMPLETED', () => {
      const match = new Match(createValidMatchProps({ status: MatchStatus.COMPLETED }));
      expect(match.canComplete()).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return string representation', () => {
      const match = new Match(createValidMatchProps());
      expect(match.toString()).toBe('Match #1 (SCHEDULED)');
    });
  });

  describe('equals', () => {
    it('should return true for same id', () => {
      const a = new Match(createValidMatchProps({ id: 'm-1' }));
      const b = new Match(createValidMatchProps({ id: 'm-1' }));
      expect(a.equals(b)).toBe(true);
    });

    it('should return true for same reference', () => {
      const a = new Match(createValidMatchProps());
      expect(a.equals(a)).toBe(true);
    });

    it('should return false for different id', () => {
      const a = new Match(createValidMatchProps({ id: 'm-1' }));
      const b = new Match(createValidMatchProps({ id: 'm-2' }));
      expect(a.equals(b)).toBe(false);
    });

    it('should return false for non-Match', () => {
      const a = new Match(createValidMatchProps());
      expect(a.equals(null)).toBe(false);
      expect(a.equals({ id: 'match-1' })).toBe(false);
    });
  });
});
