import { describe, it, expect } from 'vitest';
import { firmaDeLosAnotadores } from './createQuickMatchModalConstants';

/**
 * Cuándo se conservan los anotadores al volver al paso 3 (pasada del Kind y
 * revisiones, 4 nov 2026): mismos jugadores (con su equipo) y misma forma de
 * anotar. En match play el formato cambia quién puede anotar (foursomes va
 * por parejas); en stroke play, Stableford o Medal da igual.
 */
const jugadores = [
  { participantId: 'yo', team: 'A' },
  { participantId: 'ana', team: 'A' },
];

describe('firmaDeLosAnotadores', () => {
  it('en match play, otro formato es otra firma', () => {
    expect(firmaDeLosAnotadores(jugadores, 'MATCH_PLAY', 'FOURBALL', 'STABLEFORD')).not.toBe(
      firmaDeLosAnotadores(jugadores, 'MATCH_PLAY', 'FOURSOMES', 'STABLEFORD')
    );
  });

  it('en stroke play, Stableford o Medal es la misma firma (y el formato de match play no cuenta)', () => {
    expect(firmaDeLosAnotadores(jugadores, 'FREE_PLAY', 'SINGLES', 'STABLEFORD')).toBe(
      firmaDeLosAnotadores(jugadores, 'FREE_PLAY', 'FOURBALL', 'MEDAL')
    );
  });

  it('otra modalidad, otro equipo u otro jugador es otra firma', () => {
    const base = firmaDeLosAnotadores(jugadores, 'FREE_PLAY', 'SINGLES', 'STABLEFORD');
    expect(firmaDeLosAnotadores(jugadores, 'MATCH_PLAY', 'SINGLES', 'STABLEFORD')).not.toBe(base);
    expect(firmaDeLosAnotadores([jugadores[0], { participantId: 'ana', team: 'B' }], 'FREE_PLAY', 'SINGLES', 'STABLEFORD')).not.toBe(base);
    expect(firmaDeLosAnotadores([jugadores[0], { participantId: 'bea', team: 'A' }], 'FREE_PLAY', 'SINGLES', 'STABLEFORD')).not.toBe(base);
  });
});
