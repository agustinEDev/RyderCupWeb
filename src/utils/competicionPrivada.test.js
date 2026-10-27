import { describe, it, expect } from 'vitest';
import { esDeUnaPrivada } from './competicionPrivada';

describe('esDeUnaPrivada (release social 2)', () => {
  it('el 403 con su código, sí', () => {
    expect(esDeUnaPrivada({ status: 403, errorCode: 'PRIVATE_COMPETITION' })).toBe(true);
  });

  it.each([
    [{ status: 403 }],
    [{ status: 403, errorCode: 'OTRO' }],
    [{ status: 404, errorCode: 'PRIVATE_COMPETITION' }],
    [null],
    [undefined],
  ])('%j, no', (error) => {
    expect(esDeUnaPrivada(error)).toBe(false);
  });
});
