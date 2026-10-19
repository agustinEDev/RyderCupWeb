import { describe, it, expect } from 'vitest';
import { conGenero } from './genero';

describe('conGenero', () => {
  it.each([
    ['FEMALE', { count: 1 }, { count: 1, context: 'female' }],
    ['FEMALE', undefined, { context: 'female' }],
    ['MALE', { count: 1 }, { count: 1 }],
    [null, undefined, undefined],
  ])('%s con %o da %o', (genero, opciones, esperado) => {
    expect(conGenero(genero, opciones)).toEqual(esperado);
  });
});
