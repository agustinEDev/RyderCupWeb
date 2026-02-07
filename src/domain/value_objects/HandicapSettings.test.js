// src/domain/value_objects/HandicapSettings.test.js

import { describe, it, expect } from 'vitest';
import { HandicapSettings, PlayModeType, HandicapType, InvalidHandicapSettingsError } from './HandicapSettings';

describe('HandicapSettings', () => {
  describe('Constructor and Validation', () => {
    it('should create HandicapSettings for SCRATCH type', () => {
      const settings = new HandicapSettings(PlayModeType.SCRATCH);
      expect(settings).toBeInstanceOf(HandicapSettings);
      expect(settings.type()).toBe(PlayModeType.SCRATCH);
    });

    it('should create HandicapSettings for HANDICAP type', () => {
      const settings = new HandicapSettings(PlayModeType.HANDICAP);
      expect(settings).toBeInstanceOf(HandicapSettings);
      expect(settings.type()).toBe(PlayModeType.HANDICAP);
    });

    it('should throw InvalidHandicapSettingsError for an invalid PlayModeType', () => {
      expect(() => new HandicapSettings('INVALID_TYPE')).toThrow(InvalidHandicapSettingsError);
      expect(() => new HandicapSettings('INVALID_TYPE')).toThrow('Invalid PlayModeType: INVALID_TYPE');
    });

    it('should throw InvalidHandicapSettingsError for old PERCENTAGE type', () => {
      expect(() => new HandicapSettings('PERCENTAGE')).toThrow(InvalidHandicapSettingsError);
    });

    it('should be frozen after construction', () => {
      const settings = new HandicapSettings(PlayModeType.SCRATCH);
      expect(Object.isFrozen(settings)).toBe(true);
    });
  });

  describe('BackwardCompatible Alias', () => {
    it('HandicapType should be an alias for PlayModeType', () => {
      expect(HandicapType).toBe(PlayModeType);
      expect(HandicapType.SCRATCH).toBe('SCRATCH');
      expect(HandicapType.HANDICAP).toBe('HANDICAP');
    });
  });

  describe('Getters and Helper Methods', () => {
    const scratchSettings = new HandicapSettings(PlayModeType.SCRATCH);
    const handicapSettings = new HandicapSettings(PlayModeType.HANDICAP);

    it('type() should return the correct play mode type', () => {
      expect(scratchSettings.type()).toBe(PlayModeType.SCRATCH);
      expect(handicapSettings.type()).toBe(PlayModeType.HANDICAP);
    });

    it('isScratch() should return true for SCRATCH type', () => {
      expect(scratchSettings.isScratch()).toBe(true);
      expect(handicapSettings.isScratch()).toBe(false);
    });

    it('allowsHandicap() should return true for HANDICAP type', () => {
      expect(scratchSettings.allowsHandicap()).toBe(false);
      expect(handicapSettings.allowsHandicap()).toBe(true);
    });
  });

  describe('equals', () => {
    it('should return true for two instances with the same type', () => {
      const settings1 = new HandicapSettings(PlayModeType.HANDICAP);
      const settings2 = new HandicapSettings(PlayModeType.HANDICAP);
      expect(settings1.equals(settings2)).toBe(true);
    });

    it('should return true for two SCRATCH instances', () => {
      const settings1 = new HandicapSettings(PlayModeType.SCRATCH);
      const settings2 = new HandicapSettings(PlayModeType.SCRATCH);
      expect(settings1.equals(settings2)).toBe(true);
    });

    it('should return true for same instance (reference equality)', () => {
      const settings = new HandicapSettings(PlayModeType.SCRATCH);
      expect(settings.equals(settings)).toBe(true);
    });

    it('should return false for instances with different types', () => {
      const settings1 = new HandicapSettings(PlayModeType.HANDICAP);
      const settings2 = new HandicapSettings(PlayModeType.SCRATCH);
      expect(settings1.equals(settings2)).toBe(false);
    });

    it('should return false when comparing with null or a different object type', () => {
      const settings = new HandicapSettings(PlayModeType.HANDICAP);
      expect(settings.equals(null)).toBe(false);
      expect(settings.equals(undefined)).toBe(false);
      expect(settings.equals({ type: PlayModeType.HANDICAP })).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return correct string for SCRATCH type', () => {
      const settings = new HandicapSettings(PlayModeType.SCRATCH);
      expect(settings.toString()).toBe('SCRATCH (No Handicap)');
    });

    it('should return correct string for HANDICAP type', () => {
      const settings = new HandicapSettings(PlayModeType.HANDICAP);
      expect(settings.toString()).toBe('HANDICAP');
    });
  });
});
