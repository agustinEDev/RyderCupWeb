import { describe, it, expect } from 'vitest';
import {
  nombresPorDefectoDeLosEquipos,
  siguenSiendoLosDePorDefecto,
} from './nombresPorDefectoDeLosEquipos';
import es from '../i18n/locales/es/competitions.json';
import en from '../i18n/locales/en/competitions.json';

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

  it('N6: se mira cada nombre por su cuenta', () => {
    // Exigir que los DOS sigan por defecto dejaba el otro congelado en su
    // respaldo inglés en cuanto el organizador escribía uno
    expect(siguenSiendoLosDePorDefecto({ uno: 'Los Pepes', dos: 'USA' }, 'dos')).toBe(true);
    expect(siguenSiendoLosDePorDefecto({ uno: 'Los Pepes', dos: 'USA' }, 'uno')).toBe(false);
  });
});

describe('La lista de nombres de nacimiento no se queda atrás', () => {
  /**
   * El conjunto repite a mano lo que dicen los locales. Si alguien retoca
   * «Estados Unidos» —o entra un idioma nuevo— y nadie toca el conjunto, la
   * corrección deja de reconocer el nombre y el defecto vuelve en silencio.
   */
  it.each([
    ['es', es],
    ['en', en],
  ])('N7: los nombres por defecto de %s están reconocidos', (idioma, textos) => {
    const uno = textos.create.defaultTeamOne;
    const dos = textos.create.defaultTeamTwo;

    expect(siguenSiendoLosDePorDefecto({ uno, dos })).toBe(true);
  });
});
