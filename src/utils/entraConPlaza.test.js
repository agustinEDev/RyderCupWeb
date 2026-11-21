import { describe, it, expect } from 'vitest';
import { entraConPlaza } from './entraConPlaza';

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
