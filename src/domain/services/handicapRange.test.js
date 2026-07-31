import { describe, it, expect } from 'vitest';
import { MAX_HANDICAP, MIN_HANDICAP, isValidHandicap } from './handicapRange';

describe('handicapRange', () => {
  it('exposes the WHS handicap range constants', () => {
    expect(MIN_HANDICAP).toBe(-10);
    expect(MAX_HANDICAP).toBe(54);
  });

  it('accepts values within the range, including the boundaries', () => {
    expect(isValidHandicap(-10)).toBe(true);
    expect(isValidHandicap(0)).toBe(true);
    expect(isValidHandicap(16.4)).toBe(true);
    expect(isValidHandicap(54)).toBe(true);
  });

  it('rejects values outside the range', () => {
    expect(isValidHandicap(-10.1)).toBe(false);
    expect(isValidHandicap(54.1)).toBe(false);
  });
});
