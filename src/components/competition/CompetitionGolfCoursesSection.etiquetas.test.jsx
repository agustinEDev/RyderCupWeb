import { describe, it, expect } from 'vitest';
import { etiquetaDelTipoDeCampo } from './etiquetaDelTipoDeCampo';

/**
 * Las etiquetas del campo, en el idioma de la aplicación.
 *
 * Visto en el Kind el 23 sep: la ficha de una competición en español
 * enseñaba «18 Holes», «Par 71» y «8 Tees». Los dos primeros estaban
 * escritos a mano en inglés dentro del componente.
 */

// Los nombres viven en el namespace de campos de golf, que es donde ya
// estaban: el alta de campos traduce el mismo enum. El doble resuelve cada
// clave CON su namespace, como i18next; sin eso, leerla del namespace de la
// pantalla —`competitions`, donde no está— pasaría igual
const CLAVES = {
  'golfCourses:courseTypes.STANDARD_18': 'Estándar 18 Hoyos',
  'golfCourses:courseTypes.PITCH_AND_PUTT': 'Pitch & Putt',
  'golfCourses:courseTypes.EXECUTIVE': 'Ejecutivo',
};
const t = (clave, opciones) =>
  CLAVES[`${opciones?.ns ?? 'competitions'}:${clave}`] ?? opciones?.defaultValue ?? clave;

describe('etiquetaDelTipoDeCampo', () => {
  it('E1: un campo de 18 hoyos se dice en español', () => {
    expect(etiquetaDelTipoDeCampo('STANDARD_18', t)).toBe('Estándar 18 Hoyos');
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
