// src/domain/value_objects/Tee.test.js

import { describe, it, expect } from 'vitest';
import { Tee } from './Tee';

describe('Tee', () => {
  describe('Constructor and Validation', () => {
    it('should create a valid Tee with all fields', () => {
      const tee = new Tee({
        color: 'WHITE',
        identifier: 'Black',
        courseRating: 75.5,
        slopeRating: 135,
        gender: 'MALE'
      });

      expect(tee).toBeInstanceOf(Tee);
      expect(tee.color).toBe('WHITE');
      expect(tee.identifier).toBe('Black');
      expect(tee.courseRating).toBe(75.5);
      expect(tee.slopeRating).toBe(135);
      expect(tee.gender).toBe('MALE');
    });

    it('should create a valid Tee with null gender (unisex)', () => {
      const tee = new Tee({
        color: 'YELLOW',
        identifier: 'White',
        courseRating: 70.0,
        slopeRating: 120,
        gender: null
      });

      expect(tee.gender).toBeNull();
    });

    it('should create a valid Tee without gender (undefined)', () => {
      const tee = new Tee({
        color: 'YELLOW',
        identifier: 'White',
        courseRating: 70.0,
        slopeRating: 120,
      });

      expect(tee.gender).toBeUndefined();
    });

    it('should create a valid Tee with minimum course rating', () => {
      const tee = new Tee({
        color: 'BLUE',
        identifier: 'Red',
        courseRating: 50.0,
        slopeRating: 55,
        gender: 'FEMALE'
      });

      expect(tee.courseRating).toBe(50.0);
    });

    it('should create a valid Tee with maximum course rating', () => {
      const tee = new Tee({
        color: 'WHITE',
        identifier: 'Black',
        courseRating: 90.0,
        slopeRating: 155,
        gender: 'MALE'
      });

      expect(tee.courseRating).toBe(90.0);
    });

    it('should create a valid Tee with minimum slope rating', () => {
      const tee = new Tee({
        color: 'BLUE',
        identifier: 'Red',
        courseRating: 65.0,
        slopeRating: 55,
        gender: 'FEMALE'
      });

      expect(tee.slopeRating).toBe(55);
    });

    it('should create a valid Tee with maximum slope rating', () => {
      const tee = new Tee({
        color: 'WHITE',
        identifier: 'Black',
        courseRating: 75.0,
        slopeRating: 155,
        gender: 'MALE'
      });

      expect(tee.slopeRating).toBe(155);
    });

    it('should throw error for invalid tee category', () => {
      expect(() => new Tee({
        color: 'INVALID_CATEGORY',
        identifier: 'Blue',
        courseRating: 72.0,
        slopeRating: 125,
        gender: 'MALE'
      })).toThrow('Invalid tee color');
    });

    it('should throw error for old combined category values', () => {
      expect(() => new Tee({
        color: 'AMATEUR_MALE',
        identifier: 'Blue',
        courseRating: 72.0,
        slopeRating: 125,
        gender: 'MALE'
      })).toThrow('Invalid tee color');
    });

    it('should accept a tee without identifier when the colour names it', () => {
      const tee = new Tee({
        color: 'YELLOW',
        courseRating: 72.0,
        slopeRating: 125,
        gender: 'MALE'
      });
      expect(tee.identifier).toBeNull();
      expect(tee.displayName).toBe('YELLOW');
    });

    it('should throw when the colour is OTHER and there is no identifier', () => {
      // Sin nombre, dos salidas OTHER serian indistinguibles
      expect(() => new Tee({
        color: 'OTHER',
        courseRating: 72.0,
        slopeRating: 125,
        gender: 'MALE'
      })).toThrow('A tee with color OTHER must have an identifier');
    });

    it('should accept OTHER with an identifier, like the British Championship tees', () => {
      const tee = new Tee({
        color: 'OTHER',
        identifier: 'Championship',
        courseRating: 75.7,
        slopeRating: 143,
        gender: 'MALE'
      });
      expect(tee.displayName).toBe('Championship');
    });

    it('should throw error for course rating below minimum', () => {
      expect(() => new Tee({
        color: 'YELLOW',
        identifier: 'Blue',
        courseRating: 44.9,
        slopeRating: 125,
        gender: 'MALE'
      })).toThrow('Course rating must be between 45 and 90');
    });

    it('should throw error for course rating above maximum', () => {
      expect(() => new Tee({
        color: 'YELLOW',
        identifier: 'Blue',
        courseRating: 90.1,
        slopeRating: 125,
        gender: 'MALE'
      })).toThrow('Course rating must be between 45 and 90');
    });

    it('should throw error for slope rating below minimum', () => {
      expect(() => new Tee({
        color: 'YELLOW',
        identifier: 'Blue',
        courseRating: 72.0,
        slopeRating: 39,
        gender: 'MALE'
      })).toThrow('Slope rating must be between 40 and 160');
    });

    it('should throw error for slope rating above maximum', () => {
      expect(() => new Tee({
        color: 'YELLOW',
        identifier: 'Blue',
        courseRating: 72.0,
        slopeRating: 161,
        gender: 'MALE'
      })).toThrow('Slope rating must be between 40 and 160');
    });

    it('should throw error for invalid gender', () => {
      expect(() => new Tee({
        color: 'YELLOW',
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
        color: 'YELLOW',
        identifier: 'Blue',
        courseRating: 72.0,
        slopeRating: 125,
        gender: 'MALE'
      });

      expect(tee.validate()).toBe(true);
    });
  });

  describe('toDTO', () => {
    it('should convert Tee to DTO format with tee_gender', () => {
      const tee = new Tee({
        color: 'YELLOW',
        identifier: 'Blue',
        courseRating: 72.5,
        slopeRating: 130,
        gender: 'MALE'
      });

      const dto = tee.toDTO();

      expect(dto).toEqual({
        color: 'YELLOW',
        identifier: 'Blue',
        course_rating: 72.5,
        slope_rating: 130,
        tee_gender: 'MALE'
      });
    });

    it('should output tee_gender as null for unisex tees', () => {
      const tee = new Tee({
        color: 'RED',
        identifier: 'Green',
        courseRating: 65.0,
        slopeRating: 110,
        gender: null
      });

      const dto = tee.toDTO();
      expect(dto.tee_gender).toBeNull();
    });
  });

  describe('fromDTO', () => {
    it('should create Tee from DTO with tee_gender', () => {
      const dto = {
        color: 'GREEN',
        identifier: 'Red',
        course_rating: 68.5,
        slope_rating: 115,
        tee_gender: 'FEMALE'
      };

      const tee = Tee.fromDTO(dto);

      expect(tee).toBeInstanceOf(Tee);
      expect(tee.color).toBe('GREEN');
      expect(tee.identifier).toBe('Red');
      expect(tee.courseRating).toBe(68.5);
      expect(tee.slopeRating).toBe(115);
      expect(tee.gender).toBe('FEMALE');
    });

    it('should fallback to gender field for backward compatibility', () => {
      const dto = {
        color: 'YELLOW',
        identifier: 'Blue',
        course_rating: 72.0,
        slope_rating: 125,
        gender: 'MALE'
      };

      const tee = Tee.fromDTO(dto);
      expect(tee.gender).toBe('MALE');
    });

    it('should prefer tee_gender over gender', () => {
      const dto = {
        color: 'YELLOW',
        identifier: 'Blue',
        course_rating: 72.0,
        slope_rating: 125,
        tee_gender: 'FEMALE',
        gender: 'MALE'
      };

      const tee = Tee.fromDTO(dto);
      expect(tee.gender).toBe('FEMALE');
    });

    it('should handle all valid tee categories', () => {
      const categories = [
        'WHITE',
        'YELLOW',
        'BLUE',
        'RED',
        'GREEN'
      ];

      categories.forEach(category => {
        const dto = {
          color: category,
          identifier: 'Test',
          course_rating: 70.0,
          slope_rating: 120,
          tee_gender: 'MALE'
        };

        const tee = Tee.fromDTO(dto);
        expect(tee.color).toBe(category);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle decimal course ratings correctly', () => {
      const tee = new Tee({
        color: 'YELLOW',
        identifier: 'White',
        courseRating: 71.3,
        slopeRating: 127,
        gender: 'MALE'
      });

      expect(tee.courseRating).toBe(71.3);
    });

    it('should trim whitespace from identifier', () => {
      const tee = new Tee({
        color: 'YELLOW',
        identifier: '  Yellow  ',
        courseRating: 70.0,
        slopeRating: 120,
        gender: 'MALE'
      });

      expect(tee.identifier).toBe('Yellow');
    });

    it('should handle standard slope rating of 113', () => {
      const tee = new Tee({
        color: 'YELLOW',
        identifier: 'Yellow',
        courseRating: 70.0,
        slopeRating: 113,
        gender: 'MALE'
      });

      expect(tee.slopeRating).toBe(113);
    });

    it('should create FORWARD category tee', () => {
      const tee = new Tee({
        color: 'RED',
        identifier: 'Green',
        courseRating: 63.0,
        slopeRating: 105,
        gender: 'FEMALE'
      });

      expect(tee.color).toBe('RED');
      expect(tee.gender).toBe('FEMALE');
    });
  });
});
