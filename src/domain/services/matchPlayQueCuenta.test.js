import { describe, it, expect } from 'vitest';
import { cuentaElMatchPlay, MIN_HOYOS_QUE_CUENTAN } from './matchPlayQueCuenta';

/**
 * Cuándo cuenta un match play de partida rápida que ya se cerró: la misma
 * regla que Actividad en el back (`counted_round.py`, tabla A del 22 oct y
 * fourball con las dos bolas del 24 oct 2026).
 */
const anota = (participantId, hoyos) =>
  [...hoyos].map((holeNumber) => ({ participantId, holeNumber, score: 4 }));
const de = (desde, hasta) => Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i);

const singles = { teamA: [{ participantId: 'a' }], teamB: [{ participantId: 'b' }], matchFormat: 'SINGLES' };
const fourball = {
  teamA: [{ participantId: 'a1' }, { participantId: 'a2' }],
  teamB: [{ participantId: 'b1' }, { participantId: 'b2' }],
  matchFormat: 'FOURBALL',
};

describe('cuentaElMatchPlay', () => {
  it('el mínimo son nueve hoyos', () => {
    expect(MIN_HOYOS_QUE_CUENTAN).toBe(9);
  });

  it('los dos con los mismos 9 cuenta', () => {
    const holeScores = [...anota('a', de(1, 9)), ...anota('b', de(1, 9))];

    expect(cuentaElMatchPlay({ ...singles, holeScores, decididaAntes: false })).toBe(true);
  });

  it('con 8 no cuenta', () => {
    const holeScores = [...anota('a', de(1, 8)), ...anota('b', de(1, 8))];

    expect(cuentaElMatchPlay({ ...singles, holeScores, decididaAntes: false })).toBe(false);
  });

  it('decidida antes del 18 cuenta siempre', () => {
    const holeScores = [...anota('a', de(1, 3)), ...anota('b', de(1, 3))];

    expect(cuentaElMatchPlay({ ...singles, holeScores, decididaAntes: true })).toBe(true);
  });

  it('bandos con hoyos distintos no cuenta', () => {
    const holeScores = [...anota('a', de(1, 18)), ...anota('b', de(1, 17))];

    expect(cuentaElMatchPlay({ ...singles, holeScores, decididaAntes: false })).toBe(false);
  });

  it('la raya es un hoyo entregado', () => {
    const holeScores = [
      ...anota('a', de(1, 9)),
      ...anota('b', de(1, 8)),
      { participantId: 'b', holeNumber: 9, score: null },
    ];

    expect(cuentaElMatchPlay({ ...singles, holeScores, decididaAntes: false })).toBe(true);
  });

  it('en fourball hacen falta las dos bolas del bando', () => {
    const holeScores = [
      ...anota('a1', de(1, 18)),
      ...anota('a2', de(1, 9)),
      ...anota('b1', de(1, 18)),
      ...anota('b2', de(1, 18)),
    ];

    expect(cuentaElMatchPlay({ ...fourball, holeScores, decididaAntes: false })).toBe(false);
  });

  it('en fourball con las cuatro bolas en los 18 cuenta', () => {
    const holeScores = ['a1', 'a2', 'b1', 'b2'].flatMap((p) => anota(p, de(1, 18)));

    expect(cuentaElMatchPlay({ ...fourball, holeScores, decididaAntes: false })).toBe(true);
  });

  it('en foursomes basta la bola del bando, a nombre de uno', () => {
    const holeScores = [...anota('a1', de(1, 9)), ...anota('b2', de(1, 9))];

    expect(
      cuentaElMatchPlay({ ...fourball, matchFormat: 'FOURSOMES', holeScores, decididaAntes: false })
    ).toBe(true);
  });
});
