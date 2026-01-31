// src/domain/value_objects/Tee.test.js

import { describe, it, expect } from 'vitest';
import { Tee } from './Tee';

describe('Tee', () => {
  describe('Constructor and Validation', () => {
    it('should create a valid Tee with all fields', () => {
      const tee = new Tee({
        teeCategory: 'CHAMPIONSHIP_MALE',
        identifier: 'Black',
        courseRating: 75.5,
        slopeRating: 135,
        gender: 'MALE'
      });

      expect(tee).toBeInstanceOf(Tee);
      expect(tee.teeCategory).toBe('CHAMPIONSHIP_MALE');
      expect(tee.identifier).toBe('Black');
      expect(tee.courseRating).toBe(75.5);
      expect(tee.slopeRating).toBe(135);
      expect(tee.gender).toBe('MALE');
    });

    it('should create a valid Tee with minimum course rating', () => {
      const tee = new Tee({
        teeCategory: 'SENIOR_FEMALE',
        identifier: 'Red',
        courseRating: 50.0,
        slopeRating: 55,
        gender: 'FEMALE'
      });

      expect(tee.courseRating).toBe(50.0);
    });

    it('should create a valid Tee with maximum course rating', () => {
      const tee = new Tee({
        teeCategory: 'CHAMPIONSHIP_MALE',
        identifier: 'Black',
        courseRating: 90.0,
        slopeRating: 155,
        gender: 'MALE'
      });

      expect(tee.courseRating).toBe(90.0);
    });

    it('should create a valid Tee with minimum slope rating', () => {
      const tee = new Tee({
        teeCategory: 'SENIOR_FEMALE',
        identifier: 'Red',
        courseRating: 65.0,
        slopeRating: 55,
        gender: 'FEMALE'
      });

      expect(tee.slopeRating).toBe(55);
    });

    it('should create a valid Tee with maximum slope rating', () => {
      const tee = new Tee({
        teeCategory: 'CHAMPIONSHIP_MALE',
        identifier: 'Black',
        courseRating: 75.0,
        slopeRating: 155,
        gender: 'MALE'
      });

      expect(tee.slopeRating).toBe(155);
    });

    it('should throw error for invalid tee category', () => {
      expect(() => new Tee({
        teeCategory: 'INVALID_CATEGORY',
        identifier: 'Blue',
        courseRating: 72.0,
        slopeRating: 125,
        gender: 'MALE'
      })).toThrow('Invalid tee category');
    });

    it('should throw error for missing identifier', () => {
      expect(() => new Tee({
        teeCategory: 'AMATEUR_MALE',
        identifier: '',
        courseRating: 72.0,
        slopeRating: 125,
        gender: 'MALE'
      })).toThrow('Tee identifier is required');
    });

    it('should throw error for null identifier', () => {
      expect(() => new Tee({
        teeCategory: 'AMATEUR_MALE',
        identifier: null,
        courseRating: 72.0,
        slopeRating: 125,
        gender: 'MALE'
      })).toThrow('Tee identifier is required');
    });

    it('should throw error for course rating below minimum', () => {
      expect(() => new Tee({
        teeCategory: 'AMATEUR_MALE',
        identifier: 'Blue',
        courseRating: 49.9,
        slopeRating: 125,
        gender: 'MALE'
      })).toThrow('Course rating must be between 50.0 and 90.0');
    });

    it('should throw error for course rating above maximum', () => {
      expect(() => new Tee({
        teeCategory: 'AMATEUR_MALE',
        identifier: 'Blue',
        courseRating: 90.1,
        slopeRating: 125,
        gender: 'MALE'
      })).toThrow('Course rating must be between 50.0 and 90.0');
    });

    it('should throw error for slope rating below minimum', () => {
      expect(() => new Tee({
        teeCategory: 'AMATEUR_MALE',
        identifier: 'Blue',
        courseRating: 72.0,
        slopeRating: 54,
        gender: 'MALE'
      })).toThrow('Slope rating must be between 55 and 155');
    });

    it('should throw error for slope rating above maximum', () => {
      expect(() => new Tee({
        teeCategory: 'AMATEUR_MALE',
        identifier: 'Blue',
        courseRating: 72.0,
        slopeRating: 156,
        gender: 'MALE'
      })).toThrow('Slope rating must be between 55 and 155');
    });

    it('should throw error for invalid gender', () => {
      expect(() => new Tee({
        teeCategory: 'AMATEUR_MALE',
        identifier: 'Blue',
        courseRating: 72.0,
        slopeRating: 125,
        gender: 'INVALID'
      })).toThrow('Invalid gender');
    });
  });

  describe('validate', () => {
    it('should return true for valid tee', () => {
      const tee = new Tee({
        teeCategory: 'AMATEUR_MALE',
        identifier: 'Blue',
        courseRating: 72.0,
        slopeRating: 125,
        gender: 'MALE'
      });

      expect(tee.validate()).toBe(true);
    });
  });

  describe('toDTO', () => {
    it('should convert Tee to DTO format', () => {
      const tee = new Tee({
        teeCategory: 'AMATEUR_MALE',
        identifier: 'Blue',
        courseRating: 72.5,
        slopeRating: 130,
        gender: 'MALE'
      });

      const dto = tee.toDTO();

      expect(dto).toEqual({
        tee_category: 'AMATEUR_MALE',
        identifier: 'Blue',
        course_rating: 72.5,
        slope_rating: 130,
        gender: 'MALE'
      });
    });
  });

  describe('fromDTO', () => {
    it('should create Tee from DTO format', () => {
      const dto = {
        tee_category: 'JUNIOR',
        identifier: 'Red',
        course_rating: 68.5,
        slope_rating: 115,
        gender: 'FEMALE'
      };

      const tee = Tee.fromDTO(dto);

      expect(tee).toBeInstanceOf(Tee);
      expect(tee.teeCategory).toBe('JUNIOR');
      expect(tee.identifier).toBe('Red');
      expect(tee.courseRating).toBe(68.5);
      expect(tee.slopeRating).toBe(115);
      expect(tee.gender).toBe('FEMALE');
    });

    it('should handle all valid tee categories', () => {
      const categories = [
        'CHAMPIONSHIP_MALE',
        'AMATEUR_MALE',
        'SENIOR_MALE',
        'JUNIOR',
        'AMATEUR_FEMALE',
        'SENIOR_FEMALE'
      ];

      categories.forEach(category => {
        const dto = {
          tee_category: category,
          identifier: 'Test',
          course_rating: 70.0,
          slope_rating: 120,
          gender: category.includes('MALE') ? 'MALE' : 'FEMALE'
        };

        const tee = Tee.fromDTO(dto);
        expect(tee.teeCategory).toBe(category);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle decimal course ratings correctly', () => {
      const tee = new Tee({
        teeCategory: 'AMATEUR_MALE',
        identifier: 'White',
        courseRating: 71.3,
        slopeRating: 127,
        gender: 'MALE'
      });

      expect(tee.courseRating).toBe(71.3);
    });

    it('should trim whitespace from identifier', () => {
      const tee = new Tee({
        teeCategory: 'AMATEUR_MALE',
        identifier: '  Yellow  ',
        courseRating: 70.0,
        slopeRating: 120,
        gender: 'MALE'
      });

      expect(tee.identifier).toBe('Yellow');
    });

    it('should handle standard slope rating of 113', () => {
      const tee = new Tee({
        teeCategory: 'AMATEUR_MALE',
        identifier: 'Yellow',
        courseRating: 70.0,
        slopeRating: 113,
        gender: 'MALE'
      });

      expect(tee.slopeRating).toBe(113);
    });
  });
});
