import { describe, it, expect } from 'vitest';
import {
  ZOOM_AL_GREEN_M,
  tocaAcercarseAlGreen,
  encuadreAlGreen,
  vistaQueGana,
} from './acercarseAlGreen';
import { camaraGirada, rumbo } from './geometriaDelHoyo';
import { puntoDesde } from './hoyoMarcado';

// Zoom al green en los últimos 100 m (Agustín, 19 nov)
//
// | Caso | Situación                                         | ¿Se acerca?                      |
// |------|---------------------------------------------------|----------------------------------|
// | Z1   | a ≤ 100 m con posición buena                       | sí                               |
// | Z2   | de > 100 m a ≤ 100 m                               | sí, al cruzar                    |
// | Z3   | ya se acercó en esta apertura                      | no                               |
// | Z8   | GPS flojo o sin GPS (sin posición buena)           | no                               |
// | Z9   | lejos del campo                                    | no                               |
// | Z10  | hoyo sin green                                     | no                               |
// | Z11  | marcando la salida o el green                      | no, mientras dure                |
// | Z12  | con un punto medido                                | no, mientras dure                |
// | Z13  | con el «⋮» o un reporte abierto                     | no, mientras dure                |
// | Z14  | choca con la orientación desde ti                  | gana el zoom                     |
// | Z15  | muy cerca del green                                | sin pasar del zoom 19            |

const CENTRO = { lat: 36.29, lon: -5.332 };
const GREEN = {
  front: puntoDesde(CENTRO, 180, 12),
  center: CENTRO,
  back: puntoDesde(CENTRO, 0, 12),
};
// A `m` metros al sur del centro del green
const alSur = (m) => puntoDesde(CENTRO, 180, m);
const base = {
  posicionBuena: alSur(80),
  green: GREEN,
  lejos: false,
  yaAcercado: false,
  marcando: false,
  medido: null,
  reporte: null,
};
const PANTALLA = {
  ancho: 360,
  alto: 640,
  padding: { top: 90, bottom: 288, left: 40, right: 40 },
};

describe('tocaAcercarseAlGreen', () => {
  it('el umbral son 100 m', () => {
    expect(ZOOM_AL_GREEN_M).toBe(100);
  });

  it.each([
    ['Z1/Z2: a 80 m', alSur(80), true],
    ['Z1/Z2: a 100 m justos', alSur(100), true],
    ['Z2: a 101 m, aún no', alSur(101), false],
    ['Z2: a 300 m, no', alSur(300), false],
    ['Z15: encima del green', CENTRO, true],
  ])('%s', (_caso, posicionBuena, esperado) => {
    expect(tocaAcercarseAlGreen({ ...base, posicionBuena })).toBe(esperado);
  });

  it.each([
    ['Z3: ya se acercó en esta apertura', { yaAcercado: true }],
    ['Z8: GPS flojo o sin GPS', { posicionBuena: null }],
    ['Z9: lejos del campo', { lejos: true }],
    ['Z10: hoyo sin green', { green: null }],
    ['Z10: green sin centro', { green: { center: null } }],
    ['Z11: marcando la salida o el green', { marcando: true }],
    ['Z12: con un punto medido', { medido: alSur(40) }],
    ['Z13: con el «⋮» abierto', { reporte: { fase: 'motivos' } }],
    ['Z13: proponiendo un reporte', { reporte: { fase: 'salida' } }],
  ])('%s: no', (_caso, cambio) => {
    expect(tocaAcercarseAlGreen({ ...base, ...cambio })).toBe(false);
  });
});

describe('encuadreAlGreen', () => {
  it('tú abajo y el green arriba: el rumbo de ti al centro del green', () => {
    const desde = puntoDesde(CENTRO, 225, 90);

    expect(encuadreAlGreen(desde, GREEN).rumbo).toBeCloseTo(
      rumbo(desde, CENTRO),
      9,
    );
  });

  it('encuadra a ti y al green (delante, centro y fondo)', () => {
    const desde = alSur(90);

    expect(encuadreAlGreen(desde, GREEN).hoyo).toEqual({
      playLine: [desde],
      green: GREEN,
    });
  });

  it('más cerca, más grande', () => {
    const camara = (m) => {
      const { hoyo, rumbo: r } = encuadreAlGreen(alSur(m), GREEN);
      return camaraGirada(hoyo, r, PANTALLA);
    };

    expect(camara(40).zoom).toBeGreaterThan(camara(90).zoom);
    expect(camara(90).zoom).toBeLessThan(19);
  });

  it('Z15: encima del green no pasa del zoom 19 (la ortofoto de la comunidad)', () => {
    const { hoyo, rumbo: r } = encuadreAlGreen(alSur(1), {
      center: CENTRO,
    });

    expect(camaraGirada(hoyo, r, PANTALLA).zoom).toBe(19);
  });
});

describe('vistaQueGana', () => {
  const alGreen = { tipo: 'alGreen', desde: alSur(80), green: GREEN };
  const desdeMi = {
    tipo: 'desdeMi',
    desde: alSur(80),
    hacia: CENTRO,
    green: CENTRO,
  };

  it('Z14: la orientación desde ti no pisa el zoom al green', () => {
    expect(vistaQueGana(alGreen, desdeMi)).toBe(alGreen);
  });

  it.each([
    ['sin vista, la nueva', null, desdeMi],
    ['el zoom pisa la orientación desde ti', desdeMi, alGreen],
    ['el hoyo entero pisa el zoom', alGreen, { tipo: 'hoyo' }],
  ])('%s', (_caso, actual, nueva) => {
    expect(vistaQueGana(actual, nueva)).toBe(nueva);
  });
});
