import { describe, it, expect } from 'vitest';
import { MAX_RECIEN_ENVIADAS, crearRecienEnviadas } from './recienEnviadas';

const BARRA = { color: 'YELLOW', gender: 'MALE' };
const PUNTOS = { tee: { lat: 1, lon: 1 }, bends: [], greenCenter: { lat: 2, lon: 2 } };

// /code-review (16 oct): la lista vivía toda la sesión sin tope
describe('recienEnviadas — tope', () => {
  it(`guarda como mucho ${MAX_RECIEN_ENVIADAS}: más, se olvidan las más viejas`, () => {
    const recientes = crearRecienEnviadas();

    for (let i = 0; i < MAX_RECIEN_ENVIADAS + 5; i += 1) {
      recientes.apuntar('u1', { golfCourseId: `gc-${i}`, holeNumber: 1, barra: BARRA, ...PUNTOS });
    }

    expect(recientes.de('u1', 'gc-0', BARRA)).toEqual({});
    expect(recientes.de('u1', 'gc-4', BARRA)).toEqual({});
    expect(recientes.de('u1', 'gc-5', BARRA)).toEqual({ 1: PUNTOS });
    expect(recientes.de('u1', `gc-${MAX_RECIEN_ENVIADAS + 4}`, BARRA)).toEqual({ 1: PUNTOS });
  });
});
