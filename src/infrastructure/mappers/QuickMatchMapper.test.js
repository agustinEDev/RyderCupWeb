import { describe, it, expect } from 'vitest';
import QuickMatchMapper from './QuickMatchMapper';
import QuickMatch from '../../domain/entities/QuickMatch';

const baseApiData = () => ({
  id: 'qm-1',
  creator_id: 'user-1',
  golf_course_id: 'course-1',
  match_format: 'SINGLES',
  status: 'PENDING',
  participants: [
    { participant_id: 'p-1', user_id: 'user-1', name: 'Creator', handicap: 10, team: null, is_guest: false },
  ],
  scorer_ids: ['p-1'],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
});

describe('QuickMatchMapper', () => {
  describe('toDomain', () => {
    it('should convert a base API response to a QuickMatch entity', () => {
      const quickMatch = QuickMatchMapper.toDomain(baseApiData());
      expect(quickMatch).toBeInstanceOf(QuickMatch);
      expect(quickMatch.participants[0]).toEqual({
        participantId: 'p-1',
        userId: 'user-1',
        name: 'Creator',
        handicap: 10,
        team: null,
        isGuest: false,
      });
    });

    it('should convert detail-only fields (hole_scores, standing, scoring_assignments)', () => {
      const apiData = {
        ...baseApiData(),
        hole_scores: [{ hole_number: 1, participant_id: 'p-1', score: 4, recorded_by_participant_id: 'p-1' }],
        standing: { status: 'AS', leading_team: null, holes_played: 1, holes_remaining: 17, is_decided: false },
        scoring_assignments: [{ scorer_participant_id: 'p-1', scorer_name: 'Creator', covered_participant_ids: ['p-2'] }],
      };

      const quickMatch = QuickMatchMapper.toDomain(apiData);
      expect(quickMatch.holeScores).toEqual([
        { holeNumber: 1, participantId: 'p-1', score: 4, recordedByParticipantId: 'p-1' },
      ]);
      expect(quickMatch.standing).toEqual({
        status: 'AS',
        leadingTeam: null,
        holesPlayed: 1,
        holesRemaining: 17,
        isDecided: false,
      });
      expect(quickMatch.scoringAssignments).toEqual([
        { scorerParticipantId: 'p-1', scorerName: 'Creator', coveredParticipantIds: ['p-2'] },
      ]);
    });

    it('should default name to null when absent', () => {
      const quickMatch = QuickMatchMapper.toDomain(baseApiData());
      expect(quickMatch.name).toBeNull();
    });

    it('should carry over the name when present', () => {
      const quickMatch = QuickMatchMapper.toDomain({ ...baseApiData(), name: 'Viernes con Rafa' });
      expect(quickMatch.name).toBe('Viernes con Rafa');
    });

    it('should map a free-play response with null match_format and a scoring_format', () => {
      const apiData = { ...baseApiData(), match_format: null, scoring_format: 'MEDAL' };
      const quickMatch = QuickMatchMapper.toDomain(apiData);
      expect(quickMatch.matchFormat).toBeNull();
      expect(quickMatch.scoringFormat).toBe('MEDAL');
    });

    it('should throw when required fields are missing', () => {
      expect(() => QuickMatchMapper.toDomain(null)).toThrow('apiData is required');
      expect(() => QuickMatchMapper.toDomain({ id: 'qm-1' })).toThrow('Missing required fields');
    });
  });

  describe('toDomainMany', () => {
    it('should convert an array of API responses', () => {
      const result = QuickMatchMapper.toDomainMany([baseApiData(), baseApiData()]);
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(QuickMatch);
    });

    it('should throw if given a non-array', () => {
      expect(() => QuickMatchMapper.toDomainMany({})).toThrow('must be an array');
    });
  });
});
