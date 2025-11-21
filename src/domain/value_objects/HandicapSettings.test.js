// src/domain/value_objects/HandicapSettings.test.js

import { describe, it, expect } from 'vitest';
import { HandicapSettings, HandicapType, InvalidHandicapSettingsError } from './HandicapSettings';

describe('HandicapSettings', () => {
  describe('Constructor and Validation', () => {
    it('should create HandicapSettings for SCRATCH type with null percentage', () => {
      const settings = new HandicapSettings(HandicapType.SCRATCH, null);
      expect(settings).toBeInstanceOf(HandicapSettings);
      expect(settings.type()).toBe(HandicapType.SCRATCH);
      expect(settings.percentage()).toBeNull();
    });

    it('should create HandicapSettings for PERCENTAGE type with allowed percentages (90, 95, 100)', () => {
      let settings = new HandicapSettings(HandicapType.PERCENTAGE, 90);
      expect(settings.percentage()).toBe(90);
      settings = new HandicapSettings(HandicapType.PERCENTAGE, 95);
      expect(settings.percentage()).toBe(95);
      settings = new HandicapSettings(HandicapType.PERCENTAGE, 100);
      expect(settings.percentage()).toBe(100);
    });

    it('should throw InvalidHandicapSettingsError for an invalid HandicapType', () => {
      // @ts-ignore
      expect(() => new HandicapSettings('INVALID_TYPE', null)).toThrow(InvalidHandicapSettingsError);
      // @ts-ignore
      expect(() => new HandicapSettings('INVALID_TYPE', null)).toThrow('Invalid HandicapType: INVALID_TYPE');
    });

    it('should throw InvalidHandicapSettingsError for SCRATCH with a non-null percentage', () => {
      expect(() => new HandicapSettings(HandicapType.SCRATCH, 90)).toThrow(InvalidHandicapSettingsError);
      expect(() => new HandicapSettings(HandicapType.SCRATCH, 90)).toThrow('For SCRATCH type, percentage must be null or undefined.');
    });

    it('should throw InvalidHandicapSettingsError for PERCENTAGE without a percentage (null/undefined)', () => {
      expect(() => new HandicapSettings(HandicapType.PERCENTAGE, null)).toThrow(InvalidHandicapSettingsError);
      expect(() => new HandicapSettings(HandicapType.PERCENTAGE, null)).toThrow('For PERCENTAGE type, percentage is mandatory.');
    });

    it('should throw InvalidHandicapSettingsError for PERCENTAGE with an unallowed percentage', () => {
      expect(() => new HandicapSettings(HandicapType.PERCENTAGE, 85)).toThrow(InvalidHandicapSettingsError);
      expect(() => new HandicapSettings(HandicapType.PERCENTAGE, 85)).toThrow('For PERCENTAGE type, percentage must be one of 90, 95, 100. Received: 85');
    });

    it('should throw InvalidHandicapSettingsError for PERCENTAGE with a non-finite number', () => {
      expect(() => new HandicapSettings(HandicapType.PERCENTAGE, Infinity)).toThrow(InvalidHandicapSettingsError);
      expect(() => new HandicapSettings(HandicapType.PERCENTAGE, NaN)).toThrow(InvalidHandicapSettingsError);
    });

    it('should throw InvalidHandicapSettingsError for PERCENTAGE with a non-number value', () => {
      // @ts-ignore
      expect(() => new HandicapSettings(HandicapType.PERCENTAGE, '90')).toThrow(InvalidHandicapSettingsError);
    });
  });

  describe('Getters and Helper Methods', () => {
    const scratchSettings = new HandicapSettings(HandicapType.SCRATCH, null);
    const percentageSettings = new HandicapSettings(HandicapType.PERCENTAGE, 95);

    it('type() should return the correct handicap type', () => {
      expect(scratchSettings.type()).toBe(HandicapType.SCRATCH);
      expect(percentageSettings.type()).toBe(HandicapType.PERCENTAGE);
    });

    it('percentage() should return the correct percentage', () => {
      expect(scratchSettings.percentage()).toBeNull();
      expect(percentageSettings.percentage()).toBe(95);
    });

    it('isScratch() should return true for SCRATCH type', () => {
      expect(scratchSettings.isScratch()).toBe(true);
      expect(percentageSettings.isScratch()).toBe(false);
    });

    it('allowsHandicap() should return true for PERCENTAGE type', () => {
      expect(scratchSettings.allowsHandicap()).toBe(false);
      expect(percentageSettings.allowsHandicap()).toBe(true);
    });

    it('getAllowancePercentage() should return the correct percentage or null', () => {
      expect(scratchSettings.getAllowancePercentage()).toBeNull();
      expect(percentageSettings.getAllowancePercentage()).toBe(95);
    });
  });

  describe('equals', () => {
    it('should return true for two instances with the same type and percentage', () => {
      const settings1 = new HandicapSettings(HandicapType.PERCENTAGE, 90);
      const settings2 = new HandicapSettings(HandicapType.PERCENTAGE, 90);
      expect(settings1.equals(settings2)).toBe(true);
    });

    it('should return true for two SCRATCH instances', () => {
      const settings1 = new HandicapSettings(HandicapType.SCRATCH, null);
      const settings2 = new HandicapSettings(HandicapType.SCRATCH, undefined); // undefined is treated as null
      expect(settings1.equals(settings2)).toBe(true);
    });


    it('should return false for instances with different types', () => {
      const settings1 = new HandicapSettings(HandicapType.PERCENTAGE, 90);
      const settings2 = new HandicapSettings(HandicapType.SCRATCH, null);
      expect(settings1.equals(settings2)).toBe(false);
    });

    it('should return false for instances with different percentages', () => {
      const settings1 = new HandicapSettings(HandicapType.PERCENTAGE, 90);
      const settings2 = new HandicapSettings(HandicapType.PERCENTAGE, 95);
      expect(settings1.equals(settings2)).toBe(false);
    });

    it('should return false when comparing with null or a different object type', () => {
      const settings = new HandicapSettings(HandicapType.PERCENTAGE, 100);
      expect(settings.equals(null)).toBe(false);
      expect(settings.equals(undefined)).toBe(false);
      expect(settings.equals({ type: HandicapType.PERCENTAGE, percentage: 100 })).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return correct string for SCRATCH type', () => {
      const settings = new HandicapSettings(HandicapType.SCRATCH, null);
      expect(settings.toString()).toBe('SCRATCH (No Handicap)');
    });

    it('should return correct string for PERCENTAGE type', () => {
      const settings = new HandicapSettings(HandicapType.PERCENTAGE, 95);
      expect(settings.toString()).toBe('PERCENTAGE 95%');
    });
  });
});
