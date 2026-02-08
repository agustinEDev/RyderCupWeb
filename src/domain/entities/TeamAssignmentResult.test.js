import { describe, it, expect } from 'vitest';
import TeamAssignmentResult from './TeamAssignmentResult';

describe('TeamAssignmentResult', () => {
  const createValidProps = (overrides = {}) => ({
    id: 'ta-1',
    competitionId: 'comp-1',
    mode: 'MANUAL',
    teamAPlayerIds: ['u1', 'u2', 'u3'],
    teamBPlayerIds: ['u4', 'u5', 'u6'],
    createdAt: new Date('2025-01-01'),
    ...overrides,
  });

  describe('Constructor and Getters', () => {
    it('should create with valid properties', () => {
      const result = new TeamAssignmentResult(createValidProps());
      expect(result.id).toBe('ta-1');
      expect(result.competitionId).toBe('comp-1');
      expect(result.mode).toBe('MANUAL');
      expect(result.teamAPlayerIds).toEqual(['u1', 'u2', 'u3']);
      expect(result.teamBPlayerIds).toEqual(['u4', 'u5', 'u6']);
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('should default to empty arrays', () => {
      const result = new TeamAssignmentResult({
        id: 'ta-1',
        competitionId: 'comp-1',
        mode: 'AUTOMATIC',
      });
      expect(result.teamAPlayerIds).toEqual([]);
      expect(result.teamBPlayerIds).toEqual([]);
    });

    it('should return defensive copies of player id arrays', () => {
      const result = new TeamAssignmentResult(createValidProps());
      const teamA = result.teamAPlayerIds;
      teamA.push('u7');
      expect(result.teamAPlayerIds).toHaveLength(3);
    });
  });

  describe('Query Methods', () => {
    it('isManual()', () => {
      const result = new TeamAssignmentResult(createValidProps({ mode: 'MANUAL' }));
      expect(result.isManual()).toBe(true);
      expect(result.isAutomatic()).toBe(false);
    });

    it('isAutomatic()', () => {
      const result = new TeamAssignmentResult(createValidProps({ mode: 'AUTOMATIC' }));
      expect(result.isAutomatic()).toBe(true);
      expect(result.isManual()).toBe(false);
    });

    it('getTeamSize() should return max team size', () => {
      const result = new TeamAssignmentResult(createValidProps({
        teamAPlayerIds: ['u1', 'u2', 'u3'],
        teamBPlayerIds: ['u4', 'u5'],
      }));
      expect(result.getTeamSize()).toBe(3);
    });

    it('getTeamSize() should return 0 for empty teams', () => {
      const result = new TeamAssignmentResult(createValidProps({
        teamAPlayerIds: [],
        teamBPlayerIds: [],
      }));
      expect(result.getTeamSize()).toBe(0);
    });
  });

  describe('toString', () => {
    it('should return string representation', () => {
      const result = new TeamAssignmentResult(createValidProps());
      expect(result.toString()).toBe('TeamAssignment (MANUAL) - 3 per team');
    });
  });

  describe('equals', () => {
    it('should return true for same id', () => {
      const a = new TeamAssignmentResult(createValidProps({ id: 'ta-1' }));
      const b = new TeamAssignmentResult(createValidProps({ id: 'ta-1' }));
      expect(a.equals(b)).toBe(true);
    });

    it('should return true for same reference', () => {
      const a = new TeamAssignmentResult(createValidProps());
      expect(a.equals(a)).toBe(true);
    });

    it('should return false for different id', () => {
      const a = new TeamAssignmentResult(createValidProps({ id: 'ta-1' }));
      const b = new TeamAssignmentResult(createValidProps({ id: 'ta-2' }));
      expect(a.equals(b)).toBe(false);
    });

    it('should return false for non-TeamAssignmentResult', () => {
      const a = new TeamAssignmentResult(createValidProps());
      expect(a.equals(null)).toBe(false);
      expect(a.equals({ id: 'ta-1' })).toBe(false);
    });
  });
});
