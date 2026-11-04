import { describe, it, expect } from 'vitest';
import { esNombrePorDefecto, nombrePorDefecto, LARGO_MAXIMO_DEL_NOMBRE } from './nombrePorDefecto';

/**
 * El nombre que trae una partida rápida nueva (Agustín, 4 nov 2026):
 * «Campo · dd/mm». Igual en todos los idiomas (nombre propio y números):
 * se guarda, y lo ven también los demás jugadores.
 *
 *   N1  campo y fecha            | «Abama · 04/11» (día y mes con cero)
 *   N2  ¿es uno de por defecto?  | sí con cualquier campo y fecha; no si lo
 *                                 | escribió alguien (al repetir, el viejo de
 *                                 | por defecto no se copia: lleva su fecha)
 *   N9  un campo con nombre largo | se recorta: el total no pasa de 100
 */
describe('nombrePorDefecto', () => {
  it.each([
    ['Abama', new Date(2026, 10, 4), 'Abama · 04/11'],
    ['Real Club de Golf de Tenerife', new Date(2027, 0, 31), 'Real Club de Golf de Tenerife · 31/01'],
  ])('N1: %s el %s', (campo, fecha, esperado) => {
    expect(nombrePorDefecto(campo, fecha)).toBe(esperado);
  });

  it('N9: un campo con nombre largo se recorta y la fecha se queda', () => {
    const nombre = nombrePorDefecto('x'.repeat(200), new Date(2026, 10, 4));
    expect(nombre).toHaveLength(LARGO_MAXIMO_DEL_NOMBRE);
    expect(nombre.endsWith('x · 04/11')).toBe(true);
  });

  it.each([
    ['Abama · 28/10', true],
    ['Real Club de Golf de Tenerife · 01/01', true],
    ['Domingo en Abama', false],
    ['Abama · 28/10/26', false],
    ['Fourball - 28/10/26', false],
    ['', false],
  ])('N2: «%s» → %s', (nombre, esperado) => {
    expect(esNombrePorDefecto(nombre)).toBe(esperado);
  });
});
