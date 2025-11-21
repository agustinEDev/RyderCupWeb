// src/domain/value_objects/DateRange.test.js

import { describe, it, expect } from 'vitest';
import { DateRange } from './DateRange';

describe('DateRange', () => {
  describe('Constructor and Validation', () => {
    it('should create a DateRange with valid start and end dates', () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-05');
      const dateRange = new DateRange(startDate, endDate);
      expect(dateRange).toBeInstanceOf(DateRange);
      expect(dateRange.startDate).toEqual(startDate);
      expect(dateRange.endDate).toEqual(endDate);
    });

    it('should create a DateRange when start and end dates are the same', () => {
      const date = new Date('2025-01-01');
      const dateRange = new DateRange(date, date);
      expect(dateRange).toBeInstanceOf(DateRange);
      expect(dateRange.startDate).toEqual(date);
      expect(dateRange.endDate).toEqual(date);
    });

    it('should throw an error if startDate is after endDate', () => {
      const startDate = new Date('2025-01-05');
      const endDate = new Date('2025-01-01');
      expect(() => new DateRange(startDate, endDate)).toThrow('Start date cannot be after end date.');
    });

    it('should throw an error if startDate is not a Date object', () => {
      const endDate = new Date('2025-01-01');
      expect(() => new DateRange('2025-01-01', endDate)).toThrow('Start date and end date must be Date objects.');
    });

    it('should throw an error if endDate is not a Date object', () => {
      const startDate = new Date('2025-01-01');
      expect(() => new DateRange(startDate, '2025-01-05')).toThrow('Start date and end date must be Date objects.');
    });
  });

  describe('equals', () => {
    it('should return true for two DateRange instances with the same dates', () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-05');
      const range1 = new DateRange(startDate, endDate);
      const range2 = new DateRange(new Date('2025-01-01'), new Date('2025-01-05')); // New Date objects, same values
      expect(range1.equals(range2)).toBe(true);
    });

    it('should return false for two DateRange instances with different start dates', () => {
      const range1 = new DateRange(new Date('2025-01-01'), new Date('2025-01-05'));
      const range2 = new DateRange(new Date('2025-01-02'), new Date('2025-01-05'));
      expect(range1.equals(range2)).toBe(false);
    });

    it('should return false for two DateRange instances with different end dates', () => {
      const range1 = new DateRange(new Date('2025-01-01'), new Date('2025-01-05'));
      const range2 = new DateRange(new Date('2025-01-01'), new Date('2025-01-06'));
      expect(range1.equals(range2)).toBe(false);
    });

    it('should return false when comparing with null or a different object type', () => {
      const dateRange = new DateRange(new Date('2025-01-01'), new Date('2025-01-05'));
      expect(dateRange.equals(null)).toBe(false);
      expect(dateRange.equals(undefined)).toBe(false);
      expect(dateRange.equals({ start: new Date('2025-01-01'), end: new Date('2025-01-05') })).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return a string representation of the date range', () => {
      const startDate = new Date('2025-01-01T00:00:00.000Z');
      const endDate = new Date('2025-01-05T00:00:00.000Z');
      const dateRange = new DateRange(startDate, endDate);
      expect(dateRange.toString()).toBe(`From ${startDate.toISOString()} to ${endDate.toISOString()}`);
    });
  });
});
