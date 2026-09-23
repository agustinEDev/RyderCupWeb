import { describe, it, expect } from 'vitest';
import { nombresPorDefectoDeLosEquipos } from './nombresPorDefectoDeLosEquipos';

/**
 * Cómo se llaman los equipos mientras el organizador no diga otra cosa.
 *
 * Visto en el Kind el 23 sep: una competición creada con la app en español
 * enseñaba «Equipo 1: Europe» y «Capitán de Europe». No son etiquetas, son
 * texto libre que el formulario deja puesto: si se tradujeran al pintar, a
 * quien llame a su equipo «USA» a propósito se le cambiaría el nombre.
 */

describe('nombresPorDefectoDeLosEquipos', () => {
  it('N1: en español nacen en español', () => {
    const t = (clave) => ({ 'create.defaultTeamOne': 'Europa', 'create.defaultTeamTwo': 'Estados Unidos' })[clave];

    expect(nombresPorDefectoDeLosEquipos(t)).toEqual({ uno: 'Europa', dos: 'Estados Unidos' });
  });

  it('N2: y si falta la traducción, quedan los de siempre', () => {
    // Sin respaldo la competición nacería llamándose «create.defaultTeamOne»
    const t = (clave, opciones) => opciones?.defaultValue ?? clave;

    expect(nombresPorDefectoDeLosEquipos(t)).toEqual({ uno: 'Europe', dos: 'USA' });
  });
});
