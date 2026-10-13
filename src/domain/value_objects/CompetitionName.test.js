// src/domain/value_objects/CompetitionName.test.js

import { describe, it, expect } from 'vitest';
import { CompetitionName } from './CompetitionName';

describe('CompetitionName', () => {
  describe('Constructor and Validation', () => {
    it('should create a CompetitionName with a valid name', () => {
      const name = new CompetitionName('Ryder Cup 2025');
      expect(name).toBeInstanceOf(CompetitionName);
      expect(name.value()).toBe('Ryder Cup 2025');
    });

    it('should trim whitespace from the name', () => {
      const name = new CompetitionName('  Test Competition  ');
      expect(name.value()).toBe('Test Competition');
    });

    it('should throw an error if the name is too short', () => {
      expect(() => new CompetitionName('AB')).toThrow(
        `Competition name must be between ${CompetitionName.MIN_LENGTH} and ${CompetitionName.MAX_LENGTH} characters long.`
      );
    });

    it('should throw an error if the name is too long', () => {
      const longName = 'a'.repeat(CompetitionName.MAX_LENGTH + 1);
      expect(() => new CompetitionName(longName)).toThrow(
        `Competition name must be between ${CompetitionName.MIN_LENGTH} and ${CompetitionName.MAX_LENGTH} characters long.`
      );
    });

    it('should throw an error if the name is empty', () => {
      expect(() => new CompetitionName('')).toThrow(
        `Competition name must be between ${CompetitionName.MIN_LENGTH} and ${CompetitionName.MAX_LENGTH} characters long.`
      );
    });

    it('should throw an error if the name is just whitespace', () => {
      expect(() => new CompetitionName('   ')).toThrow(
        `Competition name must be between ${CompetitionName.MIN_LENGTH} and ${CompetitionName.MAX_LENGTH} characters long.`
      );
    });

    it('should throw an error for non-string values', () => {
      expect(() => new CompetitionName(null)).toThrow(
        `Competition name must be between ${CompetitionName.MIN_LENGTH} and ${CompetitionName.MAX_LENGTH} characters long.`
      );
      expect(() => new CompetitionName(undefined)).toThrow(
        `Competition name must be between ${CompetitionName.MIN_LENGTH} and ${CompetitionName.MAX_LENGTH} characters long.`
      );
      expect(() => new CompetitionName(123)).toThrow(
        `Competition name must be between ${CompetitionName.MIN_LENGTH} and ${CompetitionName.MAX_LENGTH} characters long.`
      );
    });
  });

  describe('equals', () => {
    it('should return true for two instances with the same name', () => {
      const name1 = new CompetitionName('Test Name');
      const name2 = new CompetitionName('Test Name');
      expect(name1.equals(name2)).toBe(true);
    });

    it('should return true for two instances with names that differ only by whitespace', () => {
      const name1 = new CompetitionName('  Test Name  ');
      const name2 = new CompetitionName('Test Name');
      expect(name1.equals(name2)).toBe(true);
    });

    it('should return false for two instances with different names', () => {
      const name1 = new CompetitionName('Test Name 1');
      const name2 = new CompetitionName('Test Name 2');
      expect(name1.equals(name2)).toBe(false);
    });

    it('should return false when comparing with null or a different object type', () => {
      const name = new CompetitionName('Unique Name');
      expect(name.equals(null)).toBe(false);
      expect(name.equals(undefined)).toBe(false);
      expect(name.equals('Unique Name')).toBe(false);
      expect(name.equals({ value: 'Unique Name' })).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the string value of the name', () => {
      const name = new CompetitionName('My Competition');
      expect(name.toString()).toBe('My Competition');
    });
  });

  /**
   * La regla del nombre al escribirlo, la misma que aplica la API
   * (RyderCupAm#540), aquí y no repetida en el formulario (`/code-review`):
   *
   *   #   caso                                   | queda
   *   ----|----------------------------------------|------------------------------
   *   N1  espacios de sobra, dentro y fuera      | normalize los deja en uno
   *   N2  vacío o solo espacios                  | REQUIRED
   *   N3  menos de 3, ya normalizado             | TOO_SHORT
   *   N4  sin letras ni cifras («...»)           | UNREADABLE
   *   N5  más de 100, ya normalizado             | TOO_LONG; 100 con un doble
   *       |                                        | espacio dentro, vale
   *   N6  bien                                   | null
   *   N7  lo que llega del servidor              | isValid sigue como estaba: un
   *       |                                        | nombre antiguo se sigue leyendo
   */
  describe('normalize y problemWith (al escribirlo)', () => {
    it('N1 · normalize deja un espacio entre palabras y ninguno en los bordes', () => {
      expect(CompetitionName.normalize('  Ryder   de\totoño ')).toBe('Ryder de otoño');
      expect(CompetitionName.normalize(null)).toBe('');
    });

    it('N2 · vacío o solo espacios: REQUIRED', () => {
      expect(CompetitionName.problemWith('')).toBe('REQUIRED');
      expect(CompetitionName.problemWith('    ')).toBe('REQUIRED');
      expect(CompetitionName.problemWith(undefined)).toBe('REQUIRED');
    });

    it('N3 · corto, medido ya normalizado', () => {
      expect(CompetitionName.problemWith('ab   ')).toBe('TOO_SHORT');
      expect(CompetitionName.problemWith('a b')).toBeNull();
    });

    it('N4 · sin letras ni cifras: UNREADABLE', () => {
      expect(CompetitionName.problemWith('...')).toBe('UNREADABLE');
      expect(CompetitionName.problemWith('2026')).toBeNull();
    });

    it('N5 · largo, medido ya normalizado', () => {
      expect(CompetitionName.problemWith('x'.repeat(101))).toBe('TOO_LONG');
      expect(CompetitionName.problemWith(`${'x'.repeat(50)}  ${'x'.repeat(49)}`)).toBeNull();
    });

    it('N6 · un nombre bien, null', () => {
      expect(CompetitionName.problemWith('Ryder de otoño')).toBeNull();
    });

    it('N7 · isValid no cambia: un nombre antiguo sin letras se sigue leyendo', () => {
      expect(CompetitionName.isValid('...')).toBe(true);
    });
  });
});

