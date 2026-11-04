import { describe, it, expect } from 'vitest';
import { esNombrePorDefecto, nombrePorDefecto, LARGO_MAXIMO_DEL_NOMBRE } from './nombrePorDefecto';

/**
 * El nombre que trae una partida rápida nueva (Agustín, 4 nov 2026):
 * «Campo · dd/mm». Igual en todos los idiomas (nombre propio y números):
 * se guarda, y lo ven también los demás jugadores.
 *
 *   N1  campo y fecha            | «Abama · 04/11» (día y mes con cero)
 *   N2  ¿es uno de por defecto?  | sí si es «ese campo · cualquier fecha»; no
 *                                 | si lo escribió alguien, aunque tenga la
 *                                 | misma forma (al repetir, el viejo de por
 *                                 | defecto no se copia: lleva su fecha)
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
    ['Abama · 28/10', 'Abama', true],
    ['Real Club de Golf de Tenerife · 01/01', 'Real Club de Golf de Tenerife', true],
    ['Domingo en Abama', 'Abama', false],
    ['Abama · 28/10/26', 'Abama', false],
    ['Fourball - 28/10/26', 'Abama', false],
    // Uno propio con la misma forma pero otro texto no es de por defecto
    ['Liga del club · 12/10', 'Abama', false],
    ['', 'Abama', false],
    // Sin campo (una partida antigua sin él) nunca es de por defecto
    ['Abama · 28/10', null, false],
    [`${'x'.repeat(92)} · 28/10`, 'x'.repeat(200), true],
  ])('N2: «%s» en %s → %s', (nombre, campo, esperado) => {
    expect(esNombrePorDefecto(nombre, campo)).toBe(esperado);
  });
});
