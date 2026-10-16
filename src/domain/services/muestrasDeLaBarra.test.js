import { describe, it, expect } from 'vitest';
import { barraDe, esLaMismaBarra } from './muestrasDeLaBarra';

describe('barraDe (la barra de un jugador de la anotación, #880)', () => {
  it.each([
    [{ color: 'YELLOW', teeGender: 'MALE' }, { color: 'YELLOW', gender: 'MALE' }],
    [{ color: 'RED', teeGender: null }, { color: 'RED', gender: null }],
    [{ color: 'RED' }, { color: 'RED', gender: null }],
    [{ color: null, teeGender: 'MALE' }, null],
    [undefined, null],
  ])('%o → %o', (jugador, barra) => {
    expect(barraDe(jugador)).toEqual(barra);
  });
});

describe('esLaMismaBarra', () => {
  it.each([
    [{ color: 'YELLOW', gender: 'MALE' }, { color: 'YELLOW', gender: 'MALE' }, true],
    [{ color: 'YELLOW', gender: null }, { color: 'YELLOW' }, true],
    [{ color: 'YELLOW', gender: 'MALE' }, { color: 'YELLOW', gender: null }, false],
    [{ color: 'YELLOW', gender: 'MALE' }, { color: 'RED', gender: 'MALE' }, false],
    [null, { color: 'YELLOW' }, false],
    [{ color: '' }, { color: '' }, false],
  ])('%o y %o → %s', (a, b, misma) => {
    expect(esLaMismaBarra(a, b)).toBe(misma);
  });
});
