import { describe, it, expect } from 'vitest';
import {
  ZOOM_AL_GREEN_M,
  GIRO_DEL_HOYO_M,
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
  salida: null,
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

  it('S2: fuera de la salida (a 45 m de ella), sí', () => {
    expect(tocaAcercarseAlGreen({ ...base, salida: alSur(125) })).toBe(true);
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
    ['S1: en la salida (a 30 m de ella)', { salida: alSur(110) }],
    ['S1: en la salida, al límite (40 m)', { salida: alSur(120) }],
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
  it('cerca del green, a menos de 30 m, el del hoyo', () => {
    expect(GIRO_DEL_HOYO_M).toBe(30);
  });

  it.each([
    ['lejos (80 m): de ti al green', delante(80), 'deTi'],
    ['a 31 m: de ti al green', delante(31), 'deTi'],
    ['a 29 m: el del hoyo', delante(29), 'hoyo'],
    ['en el centro exacto: el del hoyo', CENTRO, 'hoyo'],
    [
      'pasado el green (50 m más allá del último tramo): el del hoyo',
      puntoDesde(CENTRO, rumbo(CODO, CENTRO), 50),
      'hoyo',
    ],
  ])('%s', (_caso, desde, esperado) => {
    const giro = giroAlGreen({ desde, green: GREEN, linea: LINEA, par: 4 });

    expect(giro).toBeCloseTo(
      esperado === 'hoyo' ? DEL_HOYO : rumbo(desde, CENTRO),
      9,
    );
  });

  it('el del hoyo es el que se juega: un par 3, de la salida al green', () => {
    expect(
      giroAlGreen({ desde: delante(10), green: GREEN, linea: LINEA, par: 3 }),
    ).toBeCloseTo(rumbo(SALIDA, CENTRO), 9);
  });

  it('sin línea, de la salida al green', () => {
    expect(
      giroAlGreen({
        desde: delante(10),
        green: GREEN,
        linea: [SALIDA],
        par: 4,
      }),
    ).toBeCloseTo(rumbo(SALIDA, CENTRO), 9);
  });

  it('sin salida, de ti al green, también cerca', () => {
    const desde = delante(10);

    expect(giroAlGreen({ desde, green: GREEN, linea: [], par: 4 })).toBeCloseTo(
      rumbo(desde, CENTRO),
      9,
    );
  });

  it('sin el green en la línea, el último tramo acaba en su último punto', () => {
    const desde = puntoDesde(CENTRO, rumbo(CODO, CENTRO), 50);

    expect(
      giroAlGreen({ desde, green: GREEN, linea: [SALIDA, CODO], par: 4 }),
    ).toBeCloseTo(DEL_HOYO, 9);
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
