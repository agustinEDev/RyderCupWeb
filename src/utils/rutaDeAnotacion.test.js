import { describe, it, expect } from 'vitest';
import { rutaDeAnotacion } from './rutaDeAnotacion';

/**
 * Adónde lleva «Anotar» o «Ver tarjeta»: una sola regla para el banner del
 * panel y las tarjetas de «Mis próximos partidos» (`/code-review`).
 */
describe('rutaDeAnotacion', () => {
  it('una partida de stroke play, a la de su grupo, con su competición', () => {
    expect(rutaDeAnotacion({ id: 'g-1', competitionId: 'c-2', esPartidaDeFranja: true })).toBe(
      '/player/groups/g-1/scoring?competition=c-2'
    );
  });

  it('un partido de la Ryder, a la de su partido', () => {
    expect(rutaDeAnotacion({ id: 'm-1', competitionId: 'c-1' })).toBe('/player/matches/m-1/scoring');
  });
});
