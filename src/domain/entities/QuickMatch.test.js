import { describe, it, expect } from 'vitest';
import QuickMatch from './QuickMatch';
import QuickMatchStatus from '../value_objects/QuickMatchStatus';

const baseProps = () => ({
  id: 'qm-1',
  creatorId: 'user-1',
  golfCourseId: 'course-1',
  matchFormat: 'SINGLES',
  status: QuickMatchStatus.pending(),
  participants: [
    { participantId: 'p-1', userId: 'user-1', name: 'Creator', handicap: 10, team: null, isGuest: false },
    { participantId: 'p-2', userId: null, name: 'Guest Player', handicap: 20, team: null, isGuest: true },
  ],
  scorerIds: ['p-1'],
});

describe('QuickMatch', () => {
  describe('Constructor validation', () => {
    it('should create a QuickMatch with valid props', () => {
      const quickMatch = new QuickMatch(baseProps());
      expect(quickMatch.id).toBe('qm-1');
      expect(quickMatch.matchFormat).toBe('SINGLES');
    });

    it('should throw if id is missing', () => {
      expect(() => new QuickMatch({ ...baseProps(), id: '' })).toThrow(TypeError);
    });

    it('should throw if status is not a QuickMatchStatus instance', () => {
      expect(() => new QuickMatch({ ...baseProps(), status: 'PENDING' })).toThrow(TypeError);
    });
  });

  describe('fromPersistence', () => {
    it('should build an instance identical to the constructor', () => {
      const quickMatch = QuickMatch.fromPersistence(baseProps());
      expect(quickMatch).toBeInstanceOf(QuickMatch);
      expect(quickMatch.participants).toHaveLength(2);
    });

    it('should default optional detail fields', () => {
      const quickMatch = QuickMatch.fromPersistence(baseProps());
      expect(quickMatch.holeScores).toEqual([]);
      expect(quickMatch.standing).toBeNull();
      expect(quickMatch.scoringAssignments).toEqual([]);
      expect(quickMatch.name).toBeNull();
    });

    it('should carry over a provided name', () => {
      const quickMatch = QuickMatch.fromPersistence({ ...baseProps(), name: 'Viernes con Rafa' });
      expect(quickMatch.name).toBe('Viernes con Rafa');
    });
  });

  describe('Query methods', () => {
    it('should report status correctly', () => {
      const quickMatch = QuickMatch.fromPersistence(baseProps());
      expect(quickMatch.isPending()).toBe(true);
      expect(quickMatch.isInProgress()).toBe(false);
    });

    it('should identify the creator', () => {
      const quickMatch = QuickMatch.fromPersistence(baseProps());
      expect(quickMatch.isCreator('user-1')).toBe(true);
      expect(quickMatch.isCreator('user-2')).toBe(false);
    });

    it('should identify scorers by participant id', () => {
      const quickMatch = QuickMatch.fromPersistence(baseProps());
      expect(quickMatch.isScorer('p-1')).toBe(true);
      expect(quickMatch.isScorer('p-2')).toBe(false);
    });

    it('should find a participant by participantId or userId', () => {
      const quickMatch = QuickMatch.fromPersistence(baseProps());
      expect(quickMatch.findParticipant('p-2').name).toBe('Guest Player');
      expect(quickMatch.findParticipantByUserId('user-1').participantId).toBe('p-1');
      expect(quickMatch.findParticipant('missing')).toBeNull();
    });
  });

  describe('equals', () => {
    it('should compare by id', () => {
      const a = QuickMatch.fromPersistence(baseProps());
      const b = QuickMatch.fromPersistence({ ...baseProps(), matchFormat: 'FOURBALL' });
      expect(a.equals(b)).toBe(true);
      expect(a.equals('not-a-quick-match')).toBe(false);
    });
  });
});
