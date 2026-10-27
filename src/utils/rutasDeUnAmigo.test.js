import { describe, it, expect } from 'vitest';
import { conJugador, rutaEnSuFila } from './rutasDeUnAmigo';

describe('rutas de lo de un amigo (release social 2)', () => {
  it('la clasificación, en su fila', () => {
    expect(rutaEnSuFila('c-1', 'u 2')).toBe('/competitions/c-1/leaderboard?jugador=u%202');
  });

  it.each([[null], [undefined], ['']])('sin jugador (%j), sin parámetro', (jugador) => {
    expect(rutaEnSuFila('c-1', jugador)).toBe('/competitions/c-1/leaderboard');
    expect(conJugador('/x', jugador)).toBe('/x');
  });

  it('cualquier ruta, con su jugador', () => {
    expect(conJugador('/competitions/c-1/groups/g-7', 'u2')).toBe('/competitions/c-1/groups/g-7?jugador=u2');
  });
});
