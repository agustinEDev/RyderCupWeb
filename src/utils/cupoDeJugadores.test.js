import { describe, expect, it } from 'vitest';

import { CUPO_POR_DEFECTO, cupoDeJugadores } from './cupoDeJugadores';

/**
 * El cupo de inscritos de una competición (FE #637).
 *
 * Era un campo obligatorio y vacío: obligaba a decidir un tope antes de poder
 * crear nada, y quien monta una Ryder con sus amigos no tiene opinión sobre eso.
 * Ahora se pliega con los demás valores por defecto, y si no se toca vale 12
 * —acordado con Agustín el 19 sep—. El tope de 100 sigue siendo de la API.
 */
describe('cupoDeJugadores', () => {
  it('sin decir nada, son 12', () => {
    expect(cupoDeJugadores('')).toBe(12);
    expect(cupoDeJugadores(null)).toBe(12);
    expect(cupoDeJugadores(undefined)).toBe(12);
    expect(CUPO_POR_DEFECTO).toBe(12);
  });

  it('y si se dice, se respeta', () => {
    expect(cupoDeJugadores('20')).toBe(20);
    expect(cupoDeJugadores(8)).toBe(8);
    expect(cupoDeJugadores('100')).toBe(100);
  });

  it('lo ilegible cae en el defecto, no en un NaN camino del servidor', () => {
    expect(cupoDeJugadores('doce')).toBe(12);
    expect(cupoDeJugadores('  ')).toBe(12);
  });

  it('quien llama puede poner su propio defecto: editando es el cupo guardado', () => {
    // En edición, vaciar el campo no puede recortar una competición de 24 a 12
    // con gente ya aprobada dentro (`/code-review`)
    expect(cupoDeJugadores('', 24)).toBe(24);
    expect(cupoDeJugadores('doce', 24)).toBe(24);
    expect(cupoDeJugadores('30', 24)).toBe(30);
  });
});
