import { describe, it, expect } from 'vitest';
import Round from './Round';
import { RoundStatus } from '../value_objects/RoundStatus';
import { SessionType } from '../value_objects/SessionType';
import { MatchFormat } from '../value_objects/MatchFormat';
import { HandicapMode } from '../value_objects/HandicapMode';
import { AllowancePercentage } from '../value_objects/AllowancePercentage';

describe('Round', () => {
  const createValidRoundProps = (overrides = {}) => ({
    id: 'round-1',
    competitionId: 'comp-1',
    golfCourseId: 'course-1',
    roundDate: '2025-06-15',
    sessionType: SessionType.MORNING,
    matchFormat: MatchFormat.FOURBALL,
    handicapMode: HandicapMode.MATCH_PLAY,
    allowancePercentage: new AllowancePercentage(90),
    effectiveAllowance: 90,
    status: RoundStatus.PENDING_TEAMS,
    matches: [],
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  });

  describe('Constructor and Getters', () => {
    it('should create a Round with valid properties', () => {
      const props = createValidRoundProps();
      const round = new Round(props);

      expect(round.id).toBe('round-1');
      expect(round.competitionId).toBe('comp-1');
      expect(round.golfCourseId).toBe('course-1');
      expect(round.roundDate).toBe('2025-06-15');
      expect(round.sessionType.equals(SessionType.MORNING)).toBe(true);
      expect(round.matchFormat.equals(MatchFormat.FOURBALL)).toBe(true);
      expect(round.handicapMode.equals(HandicapMode.MATCH_PLAY)).toBe(true);
      expect(round.allowancePercentage.value()).toBe(90);
      expect(round.effectiveAllowance).toBe(90);
      expect(round.status.equals(RoundStatus.PENDING_TEAMS)).toBe(true);
      expect(round.matches).toEqual([]);
      expect(round.createdAt).toBeInstanceOf(Date);
      expect(round.updatedAt).toBeInstanceOf(Date);
    });

    it('should default to PENDING_TEAMS status', () => {
      const round = new Round({
        id: 'r-1',
        competitionId: 'c-1',
        golfCourseId: 'gc-1',
        roundDate: '2025-06-15',
        sessionType: SessionType.AFTERNOON,
        matchFormat: MatchFormat.SINGLES,
      });
      expect(round.status.equals(RoundStatus.PENDING_TEAMS)).toBe(true);
    });

    it('should default handicapMode and allowancePercentage to null', () => {
      const round = new Round({
        id: 'r-1',
        competitionId: 'c-1',
        golfCourseId: 'gc-1',
        roundDate: '2025-06-15',
        sessionType: SessionType.MORNING,
        matchFormat: MatchFormat.SINGLES,
      });
      expect(round.handicapMode).toBeNull();
      expect(round.allowancePercentage).toBeNull();
    });

    it('should return a copy of matches array (defensive copy)', () => {
      const matches = [{ id: 'm1' }, { id: 'm2' }];
      const round = new Round(createValidRoundProps({ matches }));
      const returnedMatches = round.matches;
      returnedMatches.push({ id: 'm3' });
      expect(round.matches).toHaveLength(2);
    });
  });

  describe('Query Methods', () => {
    it('isEditable() should be true for PENDING_TEAMS', () => {
      const round = new Round(createValidRoundProps({ status: RoundStatus.PENDING_TEAMS }));
      expect(round.isEditable()).toBe(true);
    });

    it('isEditable() should be true for PENDING_MATCHES', () => {
      const round = new Round(createValidRoundProps({ status: RoundStatus.PENDING_MATCHES }));
      expect(round.isEditable()).toBe(true);
    });

    it('isEditable() should be false for SCHEDULED', () => {
      const round = new Round(createValidRoundProps({ status: RoundStatus.SCHEDULED }));
      expect(round.isEditable()).toBe(false);
    });

    it('isEditable() should be false for IN_PROGRESS', () => {
      const round = new Round(createValidRoundProps({ status: RoundStatus.IN_PROGRESS }));
      expect(round.isEditable()).toBe(false);
    });

    it('isEditable() should be false for COMPLETED', () => {
      const round = new Round(createValidRoundProps({ status: RoundStatus.COMPLETED }));
      expect(round.isEditable()).toBe(false);
    });

    it('hasMatches() should return false for empty matches', () => {
      const round = new Round(createValidRoundProps());
      expect(round.hasMatches()).toBe(false);
    });

    it('hasMatches() should return true when matches exist', () => {
      const round = new Round(createValidRoundProps({ matches: [{ id: 'm1' }] }));
      expect(round.hasMatches()).toBe(true);
    });

    it('matchCount() should return the count of matches', () => {
      const round = new Round(createValidRoundProps({ matches: [{ id: 'm1' }, { id: 'm2' }] }));
      expect(round.matchCount()).toBe(2);
    });
  });

  describe('toString', () => {
    it('should return string representation', () => {
      const round = new Round(createValidRoundProps());
      expect(round.toString()).toBe('Round 2025-06-15 (PENDING_TEAMS)');
    });
  });

  describe('equals', () => {
    it('should return true for same id', () => {
      const a = new Round(createValidRoundProps({ id: 'r-1' }));
      const b = new Round(createValidRoundProps({ id: 'r-1' }));
      expect(a.equals(b)).toBe(true);
    });

    it('should return true for same reference', () => {
      const a = new Round(createValidRoundProps());
      expect(a.equals(a)).toBe(true);
    });

    it('should return false for different id', () => {
      const a = new Round(createValidRoundProps({ id: 'r-1' }));
      const b = new Round(createValidRoundProps({ id: 'r-2' }));
      expect(a.equals(b)).toBe(false);
    });

    it('should return false for non-Round', () => {
      const a = new Round(createValidRoundProps());
      expect(a.equals(null)).toBe(false);
      expect(a.equals(undefined)).toBe(false);
      expect(a.equals({ id: 'round-1' })).toBe(false);
    });
  });
});
