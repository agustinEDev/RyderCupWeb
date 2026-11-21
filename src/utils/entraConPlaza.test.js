import { describe, it, expect } from 'vitest';
import { aceptadaConPlaza, entraConPlaza } from './entraConPlaza';

describe('entraConPlaza', () => {
  it.each([
    [{ id: 'e1', status: 'APPROVED', waiting: false }, true],
    [{ id: 'e1', status: 'APPROVED' }, true],
    [{ id: 'e1', status: 'APPROVED', waiting: true }, false],
    [{ id: 'e1', status: 'REQUESTED' }, false],
    [{ status: 'APPROVED' }, false],
    [null, false],
  ])('%j → %s', (hecho, esperado) => {
    expect(entraConPlaza(hecho)).toBe(esperado);
  });
});

describe('aceptadaConPlaza', () => {
  it.each([
    [{ status: 'ACCEPTED', enrollmentId: 'e1' }, true],
    [{ status: 'ON_HOLD', enrollmentId: 'e1' }, false],
    [{ status: 'ACCEPTED' }, false],
    [null, false],
  ])('%j → %s', (resultado, esperado) => {
    expect(aceptadaConPlaza(resultado)).toBe(esperado);
  });
});
