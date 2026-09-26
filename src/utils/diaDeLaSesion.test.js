import { describe, it, expect } from 'vitest';
import { diaDeLaSesion } from './diaDeLaSesion';

/**
 * Una fecha sin hora, como el día de una sesión, es ese día EN CASA.
 *
 * `new Date('2026-09-26')` la lee como medianoche UTC, y en cualquier huso por
 * detrás de UTC —toda América— se pinta el 25: el organizador arreglaría la
 * sesión equivocada (revisión de la BE #361).
 */
describe('diaDeLaSesion', () => {
  it('L1: el día es el mismo en cualquier huso', () => {
    const fecha = diaDeLaSesion('2026-09-26');

    expect(fecha.getFullYear()).toBe(2026);
    expect(fecha.getMonth()).toBe(8);
    expect(fecha.getDate()).toBe(26);
  });

  it('L2: lo que no es una fecha sin hora es null', () => {
    expect(diaDeLaSesion('')).toBeNull();
    expect(diaDeLaSesion(undefined)).toBeNull();
    expect(diaDeLaSesion('26/09/2026')).toBeNull();
  });
});
