import { describe, it, expect } from 'vitest';
import { esNombrePorDefecto, nombrePorDefecto } from './nombrePorDefecto';

/**
 * El nombre que trae una partida rápida nueva (Agustín, 4 nov 2026):
 * «Modalidad - dd/mm/aa», escrito en el campo y siguiendo al formato.
 *
 *   N1  formato y fecha          | «Fourball - 04/11/26» (día y mes con cero)
 *   N2  ¿es uno de por defecto?  | sí con cualquier modalidad y fecha; no si
 *                                 | lo escribió alguien (al repetir, el viejo
 *                                 | de por defecto no se copia: lleva su fecha)
 */
describe('nombrePorDefecto', () => {
  it.each([
    ['Fourball', new Date(2026, 10, 4), 'Fourball - 04/11/26'],
    ['Individual', new Date(2027, 0, 31), 'Individual - 31/01/27'],
  ])('N1: %s el %s', (modalidad, fecha, esperado) => {
    expect(nombrePorDefecto(modalidad, fecha)).toBe(esperado);
  });

  it.each([
    ['Fourball - 28/10/26', true],
    ['Medal - 01/01/27', true],
    ['Domingo en Abama', false],
    ['Fourball - 28/10/2026', false],
    ['', false],
  ])('N2: «%s» → %s', (nombre, esperado) => {
    expect(esNombrePorDefecto(nombre)).toBe(esperado);
  });
});
