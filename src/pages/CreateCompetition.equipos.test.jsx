import { describe, it, expect } from 'vitest';
import { nombresPorDefectoDeLosEquipos, siguenSiendoLosDePorDefecto } from './nombresPorDefectoDeLosEquipos';

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

describe('siguenSiendoLosDePorDefecto', () => {
  /**
   * Los namespaces se cargan con `import()` y sin suspense, así que la primera
   * renderización puede llegar con `t` aún sin resolver: entonces el nombre
   * nace con su respaldo en inglés y, como es el valor inicial de `useState`,
   * se queda congelado ahí aunque la app esté en español.
   */
  it('N3: el respaldo en inglés cuenta como no tocado', () => {
    expect(siguenSiendoLosDePorDefecto({ uno: 'Europe', dos: 'USA' })).toBe(true);
  });

  it('N4: y el nombre ya traducido también, mientras nadie lo cambie', () => {
    expect(siguenSiendoLosDePorDefecto({ uno: 'Europa', dos: 'Estados Unidos' })).toBe(true);
  });

  it('N5: lo que escribe el organizador NO se toca', () => {
    expect(siguenSiendoLosDePorDefecto({ uno: 'Los Pepes', dos: 'USA' })).toBe(false);
  });
});
