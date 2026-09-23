import { describe, it, expect } from 'vitest';
import { etiquetaDelTipoDeCampo } from './etiquetaDelTipoDeCampo';

/**
 * Las etiquetas del campo, en el idioma de la aplicación.
 *
 * Visto en el Kind el 23 sep: la ficha de una competición en español
 * enseñaba «18 Holes», «Par 71» y «8 Tees». Los dos primeros estaban
 * escritos a mano en inglés dentro del componente.
 */

const CLAVES = {
  'detail.golfCourses.types.STANDARD_18': '18 hoyos',
  'detail.golfCourses.types.PITCH_AND_PUTT': 'Pitch & Putt',
  'detail.golfCourses.types.EXECUTIVE': 'Ejecutivo',
};
const t = (clave, opciones) => CLAVES[clave] ?? opciones?.defaultValue ?? clave;

describe('etiquetaDelTipoDeCampo', () => {
  it('E1: un campo de 18 hoyos se dice en español', () => {
    expect(etiquetaDelTipoDeCampo('STANDARD_18', t)).toBe('18 hoyos');
  });

  it('E2: y los demás tipos también', () => {
    expect(etiquetaDelTipoDeCampo('EXECUTIVE', t)).toBe('Ejecutivo');
  });

  it('E3: un tipo que no conozcamos sale tal cual, no como clave', () => {
    expect(etiquetaDelTipoDeCampo('LO_QUE_VENGA', t)).toBe('LO_QUE_VENGA');
  });

  it('E4: sin tipo, nada que pintar', () => {
    expect(etiquetaDelTipoDeCampo(null, t)).toBe('');
  });
});
