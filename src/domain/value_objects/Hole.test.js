// src/domain/value_objects/Hole.test.js

import { describe, it, expect } from 'vitest';
import { Hole } from './Hole';

describe('Hole', () => {
  describe('Constructor and Validation', () => {
    it('should create a valid Hole with all fields', () => {
      const hole = new Hole({
        holeNumber: 1,
        par: 4,
        strokeIndex: 10
      });

      expect(hole).toBeInstanceOf(Hole);
      expect(hole.holeNumber).toBe(1);
      expect(hole.par).toBe(4);
      expect(hole.strokeIndex).toBe(10);
    });

    it('should create holes with minimum values', () => {
      const hole = new Hole({
        holeNumber: 1,
        par: 3,
        strokeIndex: 1
      });

      expect(hole.holeNumber).toBe(1);
      expect(hole.par).toBe(3);
      expect(hole.strokeIndex).toBe(1);
    });

    it('should create holes with maximum values', () => {
      const hole = new Hole({
        holeNumber: 18,
        par: 5,
        strokeIndex: 18
      });

      expect(hole.holeNumber).toBe(18);
      expect(hole.par).toBe(5);
      expect(hole.strokeIndex).toBe(18);
    });

    it('should create par 3 hole', () => {
      const hole = new Hole({
        holeNumber: 3,
        par: 3,
        strokeIndex: 15
      });

      expect(hole.par).toBe(3);
    });

    it('should create par 4 hole', () => {
      const hole = new Hole({
        holeNumber: 5,
        par: 4,
        strokeIndex: 8
      });

      expect(hole.par).toBe(4);
    });

    it('should create par 5 hole', () => {
      const hole = new Hole({
        holeNumber: 9,
        par: 5,
        strokeIndex: 2
      });

      expect(hole.par).toBe(5);
    });

    it('should throw error for hole number below 1', () => {
      expect(() => new Hole({
        holeNumber: 0,
        par: 4,
        strokeIndex: 10
      })).toThrow('Hole number must be between 1 and 18');
    });

    it('should throw error for hole number above 18', () => {
      expect(() => new Hole({
        holeNumber: 19,
        par: 4,
        strokeIndex: 10
      })).toThrow('Hole number must be between 1 and 18');
    });

    it('should throw error for par below 3', () => {
      expect(() => new Hole({
        holeNumber: 1,
        par: 2,
        strokeIndex: 10
      })).toThrow('Par must be between 3 and 5');
    });

    it('should throw error for par above 5', () => {
      expect(() => new Hole({
        holeNumber: 1,
        par: 6,
        strokeIndex: 10
      })).toThrow('Par must be between 3 and 5');
    });

    it('should throw error for stroke index below 1', () => {
      expect(() => new Hole({
        holeNumber: 1,
        par: 4,
        strokeIndex: 0
      })).toThrow('Stroke index must be between 1 and 18');
    });

    it('should throw error for stroke index above 18', () => {
      expect(() => new Hole({
        holeNumber: 1,
        par: 4,
        strokeIndex: 19
      })).toThrow('Stroke index must be between 1 and 18');
    });

    it('should throw error for null hole number', () => {
      expect(() => new Hole({
        holeNumber: null,
        par: 4,
        strokeIndex: 10
      })).toThrow('Hole number is required');
    });

    it('should throw error for null par', () => {
      expect(() => new Hole({
        holeNumber: 1,
        par: null,
        strokeIndex: 10
      })).toThrow('Par is required');
    });

    it('should throw error for null stroke index', () => {
      expect(() => new Hole({
        holeNumber: 1,
        par: 4,
        strokeIndex: null
      })).toThrow('Stroke index is required');
    });
  });

  describe('validate', () => {
    it('should return true for valid hole', () => {
      const hole = new Hole({
        holeNumber: 7,
        par: 4,
        strokeIndex: 3
      });

      expect(hole.validate()).toBe(true);
    });
  });

  describe('toDTO', () => {
    it('should convert Hole to DTO format', () => {
      const hole = new Hole({
        holeNumber: 5,
        par: 4,
        strokeIndex: 12
      });

      const dto = hole.toDTO();

      expect(dto).toEqual({
        hole_number: 5,
        par: 4,
        stroke_index: 12
      });
    });
  });

  describe('fromDTO', () => {
    it('should create Hole from DTO format', () => {
      const dto = {
        hole_number: 15,
        par: 3,
        stroke_index: 18
      };

      const hole = Hole.fromDTO(dto);

      expect(hole).toBeInstanceOf(Hole);
      expect(hole.holeNumber).toBe(15);
      expect(hole.par).toBe(3);
      expect(hole.strokeIndex).toBe(18);
    });

    it('should handle all 18 holes correctly', () => {
      for (let i = 1; i <= 18; i++) {
        const dto = {
          hole_number: i,
          par: 4,
          stroke_index: i
        };

        const hole = Hole.fromDTO(dto);
        expect(hole.holeNumber).toBe(i);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle typical par 3 short hole', () => {
      const hole = new Hole({
        holeNumber: 3,
        par: 3,
        strokeIndex: 17
      });

      expect(hole.par).toBe(3);
      expect(hole.holeNumber).toBe(3);
    });

    it('should handle typical par 5 long hole', () => {
      const hole = new Hole({
        holeNumber: 9,
        par: 5,
        strokeIndex: 1
      });

      expect(hole.par).toBe(5);
      expect(hole.strokeIndex).toBe(1);
    });

    it('should handle 18th hole (typical finishing hole)', () => {
      const hole = new Hole({
        holeNumber: 18,
        par: 4,
        strokeIndex: 6
      });

      expect(hole.holeNumber).toBe(18);
    });

    it('should handle 1st hole (typical starting hole)', () => {
      const hole = new Hole({
        holeNumber: 1,
        par: 4,
        strokeIndex: 5
      });

      expect(hole.holeNumber).toBe(1);
    });
  });

  describe('Complete 18-Hole Course Simulation', () => {
    it('should create a valid 18-hole course with par 72', () => {
      const holes = [
        // Front 9
        new Hole({ holeNumber: 1, par: 4, strokeIndex: 11 }),
        new Hole({ holeNumber: 2, par: 5, strokeIndex: 3 }),
        new Hole({ holeNumber: 3, par: 3, strokeIndex: 17 }),
        new Hole({ holeNumber: 4, par: 4, strokeIndex: 7 }),
        new Hole({ holeNumber: 5, par: 4, strokeIndex: 13 }),
        new Hole({ holeNumber: 6, par: 3, strokeIndex: 15 }),
        new Hole({ holeNumber: 7, par: 5, strokeIndex: 1 }),
        new Hole({ holeNumber: 8, par: 4, strokeIndex: 9 }),
        new Hole({ holeNumber: 9, par: 4, strokeIndex: 5 }),
        // Back 9
        new Hole({ holeNumber: 10, par: 4, strokeIndex: 10 }),
        new Hole({ holeNumber: 11, par: 5, strokeIndex: 2 }),
        new Hole({ holeNumber: 12, par: 3, strokeIndex: 18 }),
        new Hole({ holeNumber: 13, par: 4, strokeIndex: 8 }),
        new Hole({ holeNumber: 14, par: 4, strokeIndex: 12 }),
        new Hole({ holeNumber: 15, par: 3, strokeIndex: 16 }),
        new Hole({ holeNumber: 16, par: 5, strokeIndex: 4 }),
        new Hole({ holeNumber: 17, par: 4, strokeIndex: 14 }),
        new Hole({ holeNumber: 18, par: 4, strokeIndex: 6 })
      ];

      const totalPar = holes.reduce((sum, hole) => sum + hole.par, 0);
      expect(totalPar).toBe(72);
      expect(holes.length).toBe(18);

      // Verify unique stroke indices
      const strokeIndices = holes.map(h => h.strokeIndex);
      const uniqueIndices = new Set(strokeIndices);
      expect(uniqueIndices.size).toBe(18);
    });
  });
});
