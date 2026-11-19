import { describe, it, expect } from 'vitest';
import {
  ZOOM_AL_GREEN_M,
  SIN_RUMBO_M,
  tocaAcercarseAlGreen,
  encuadreAlGreen,
  giroAlGreen,
} from './acercarseAlGreen';
import {
  FUERA_DE_LA_SALIDA_M,
  camaraGirada,
  rumbo,
  rumboDeLaLinea,
} from './geometriaDelHoyo';
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
// | Z14  | choca con la orientación desde ti                  | gana el zoom (en el mapa)        |
// | S1   | en la salida (≤ 40 m de ella), hoyo corto          | no: el hoyo entero               |
// | S2   | al salir de la salida, dentro de los 100 m         | sí                               |
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
  salidaDeMiBarra: null,
  salidaDeLaLinea: null,
};
const PANTALLA = {
  ancho: 360,
  alto: 640,
  padding: { top: 90, bottom: 288, left: 40, right: 40 },
};

describe('tocaAcercarseAlGreen', () => {
  it('el umbral son 100 m; en la salida, hasta 40 m de ella', () => {
    expect(ZOOM_AL_GREEN_M).toBe(100);
    expect(FUERA_DE_LA_SALIDA_M).toBe(40);
  });

  it('S1: en la salida se mide desde la de mi barra, como al llegar a ella (H12), no desde la de la línea', () => {
    expect(
      tocaAcercarseAlGreen({
        ...base,
        salidaDeMiBarra: alSur(110),
        salidaDeLaLinea: alSur(200),
      }),
    ).toBe(false);
    expect(
      tocaAcercarseAlGreen({
        ...base,
        salidaDeMiBarra: alSur(200),
        salidaDeLaLinea: alSur(110),
      }),
    ).toBe(true);
  });

  it('S1: sin la de mi barra, la de la línea', () => {
    expect(tocaAcercarseAlGreen({ ...base, salidaDeLaLinea: alSur(110) })).toBe(
      false,
    );
  });

  it('S2: fuera de la salida (a 45 m de ella), sí', () => {
    expect(tocaAcercarseAlGreen({ ...base, salidaDeMiBarra: alSur(125) })).toBe(
      true,
    );
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
    ['S1: en la salida (a 30 m de ella)', { salidaDeMiBarra: alSur(110) }],
    ['S1: en la salida, al límite (40 m)', { salidaDeMiBarra: alSur(120) }],
  ])('%s: no', (_caso, cambio) => {
    expect(tocaAcercarseAlGreen({ ...base, ...cambio })).toBe(false);
  });
});

// Un par 4 con codo a un lado: el giro del hoyo (de la salida al codo) no es
// el de ti al green
const SALIDA = puntoDesde(CENTRO, 180, 300);
const CODO = puntoDesde(CENTRO, 200, 150);
const LINEA = [SALIDA, CODO, CENTRO];
const DEL_HOYO = rumboDeLaLinea(LINEA, 4);
// A `m` metros del centro, por delante del green (del lado de la salida)
const delante = (m) => puntoDesde(CENTRO, 160, m);

describe('giroAlGreen', () => {
  // Agustín, 19 nov: siempre de ti al centro del green; en el centro, sin rumbo
  // posible (a menos de 1 m), el del hoyo
  it('a menos de 1 m del centro no hay rumbo fiable', () => {
    expect(SIN_RUMBO_M).toBe(1);
  });

  it.each([
    ['lejos (80 m)', delante(80)],
    ['a 31 m', delante(31)],
    ['a 29 m', delante(29)],
    ['a 1,5 m', delante(1.5)],
    ['pasado el green', puntoDesde(CENTRO, rumbo(CODO, CENTRO), 50)],
    ['pasado el green en un dogleg', puntoDesde(CENTRO, 135, 50)],
  ])('%s: de ti al green', (_caso, desde) => {
    expect(
      giroAlGreen({ desde, green: GREEN, linea: LINEA, par: 4 }),
    ).toBeCloseTo(rumbo(desde, CENTRO), 9);
  });

  it.each([
    ['en el centro exacto', CENTRO],
    ['a medio metro', delante(0.5)],
  ])('%s: el del hoyo, con el que se juega', (_caso, desde) => {
    expect(
      giroAlGreen({ desde, green: GREEN, linea: LINEA, par: 4 }),
    ).toBeCloseTo(DEL_HOYO, 9);
  });

  it('en el centro, un par 3: de la salida al green', () => {
    expect(
      giroAlGreen({ desde: CENTRO, green: GREEN, linea: LINEA, par: 3 }),
    ).toBeCloseTo(rumbo(SALIDA, CENTRO), 9);
  });

  it('en el centro, sin línea: de la salida al green', () => {
    // Una salida al suroeste: su giro no es el norte que da un rumbo nulo
    const salida = puntoDesde(CENTRO, 225, 300);

    expect(
      giroAlGreen({ desde: CENTRO, green: GREEN, linea: [salida], par: 4 }),
    ).toBeCloseTo(rumbo(salida, CENTRO), 9);
  });

  it('en el centro y sin salida no se rompe: un giro de verdad', () => {
    expect(
      Number.isFinite(
        giroAlGreen({ desde: CENTRO, green: GREEN, linea: [], par: 4 }),
      ),
    ).toBe(true);
  });

  it('cerca y sin salida, de ti al green', () => {
    const desde = delante(10);

    expect(giroAlGreen({ desde, green: GREEN, linea: [], par: 4 })).toBeCloseTo(
      rumbo(desde, CENTRO),
      9,
    );
  });
});

describe('encuadreAlGreen', () => {
  it('encuadra a ti y al green (delante, centro y fondo), con su giro', () => {
    const desde = delante(90);

    expect(
      encuadreAlGreen({ desde, green: GREEN, linea: LINEA, par: 4 }),
    ).toEqual({
      hoyo: { playLine: [desde], green: GREEN },
      rumbo: rumbo(desde, CENTRO),
    });
  });

  it('más cerca, más grande', () => {
    const camara = (m) => {
      const { hoyo, rumbo: r } = encuadreAlGreen({
        desde: alSur(m),
        green: GREEN,
        linea: [],
        par: 4,
      });
      return camaraGirada(hoyo, r, PANTALLA);
    };

    expect(camara(40).zoom).toBeGreaterThan(camara(90).zoom);
    expect(camara(90).zoom).toBeLessThan(19);
  });

  it('Z15: encima del green no pasa del zoom 19 (la ortofoto de la comunidad)', () => {
    const { hoyo, rumbo: r } = encuadreAlGreen({
      desde: alSur(1),
      green: { center: CENTRO },
      linea: LINEA,
      par: 4,
    });

    expect(camaraGirada(hoyo, r, PANTALLA).zoom).toBe(19);
  });
});
