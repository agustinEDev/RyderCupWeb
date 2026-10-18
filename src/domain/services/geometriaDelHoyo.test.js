import { describe, it, expect } from 'vitest';
import { rumbo, orientacionDelHoyo, limitesDelHoyo, esPosicionValida, encuadreGirado, rumboDeLaLinea, siguientePuntoDeLaLinea } from './geometriaDelHoyo';

const SALIDA = { lat: 36.28, lon: -5.33 };
const GREEN = {
  front: { lat: 36.2898, lon: -5.332 },
  center: { lat: 36.29, lon: -5.332 },
  back: { lat: 36.2902, lon: -5.332 },
};

describe('rumbo', () => {
  it('hacia el norte 0°, el este 90°, el sur 180° y el oeste 270°', () => {
    const o = { lat: 0, lon: 0 };

    expect(rumbo(o, { lat: 1, lon: 0 })).toBeCloseTo(0, 5);
    expect(rumbo(o, { lat: 0, lon: 1 })).toBeCloseTo(90, 5);
    expect(rumbo(o, { lat: -1, lon: 0 })).toBeCloseTo(180, 5);
    expect(rumbo(o, { lat: 0, lon: -1 })).toBeCloseTo(270, 5);
  });

  it('lejos del ecuador, el rumbo de la esfera (no el del plano)', () => {
    expect(rumbo({ lat: 50, lon: 0 }, { lat: 51, lon: 1 })).toBeCloseTo(32.0747, 3);
  });
});

describe('orientacionDelHoyo (H1: salida abajo, green arriba)', () => {
  it('de la salida al centro del green', () => {
    const hoyo = { playLine: [SALIDA, { lat: 36.285, lon: -5.331 }], green: GREEN };

    expect(orientacionDelHoyo(hoyo)).toBeCloseTo(rumbo(SALIDA, GREEN.center), 6);
  });

  it('sin green, de la salida al final de la línea de juego', () => {
    const fin = { lat: 36.285, lon: -5.331 };

    expect(orientacionDelHoyo({ playLine: [SALIDA, fin], green: null })).toBeCloseTo(rumbo(SALIDA, fin), 6);
  });

  it('S1: sin hoyo, o con un solo punto, sin orientación (norte arriba)', () => {
    expect(orientacionDelHoyo(null)).toBeNull();
    expect(orientacionDelHoyo({ playLine: [SALIDA], green: null })).toBeNull();
    expect(orientacionDelHoyo({ playLine: [], green: GREEN })).toBeNull();
  });
});

describe('limitesDelHoyo (H1/H4: el hoyo entero)', () => {
  it('abarca la línea de juego y el green', () => {
    const hoyo = { playLine: [SALIDA, { lat: 36.285, lon: -5.335 }], green: GREEN };

    expect(limitesDelHoyo(hoyo)).toEqual([
      [-5.335, 36.28],
      [-5.33, 36.2902],
    ]);
  });

  it('sin puntos, sin límites', () => {
    expect(limitesDelHoyo(null)).toBeNull();
    expect(limitesDelHoyo({ playLine: [], green: null })).toBeNull();
  });
});

describe('esPosicionValida (G4)', () => {
  it('una posición con números de verdad', () => {
    expect(esPosicionValida({ lat: 36.28, lon: -5.33 })).toBe(true);
  });

  it.each([
    ['NaN', { lat: Number.NaN, lon: -5.33 }],
    ['sin longitud', { lat: 36.28 }],
    ['texto', { lat: '36', lon: '-5' }],
    ['latitud en texto', { lat: '36', lon: -5 }],
    ['infinito', { lat: Number.POSITIVE_INFINITY, lon: 0 }],
    ['latitud imposible', { lat: 91, lon: 0 }],
    ['longitud imposible', { lat: 0, lon: 181 }],
    ['nada', null],
  ])('%s → no', (_caso, posicion) => {
    expect(esPosicionValida(posicion)).toBe(false);
  });
});

// Agustín, 16 oct: «que haga el zoom necesario para ver el hoyo entero sin
// cortar pero lo más grande posible». fitBounds encuadra la caja norte-sur del
// hoyo, que girada ocupa mucho más que él: el zoom se calcula con el hoyo girado
describe('encuadreGirado', () => {
  const M_POR_GRADO = 111319.49;
  const S = { lat: 42.46, lon: -8.72 };
  const norte = (m) => ({ lat: S.lat + m / M_POR_GRADO, lon: S.lon });
  const noreste = (m) => ({ lat: S.lat + m / M_POR_GRADO / Math.SQRT2, lon: S.lon + m / (M_POR_GRADO * Math.cos((S.lat * Math.PI) / 180)) / Math.SQRT2 });
  const pantalla = { ancho: 400, alto: 900, padding: { top: 50, bottom: 250, left: 40, right: 40 } };

  it('un hoyo recto hacia su rumbo llena el alto libre: 500 m en 600 px', () => {
    const hoyo = { playLine: [S, norte(500)], green: null };

    const { zoom } = encuadreGirado(hoyo, 0, pantalla);

    const mPorPx = (2 * Math.PI * 6378137 * Math.cos((S.lat * Math.PI) / 180)) / (512 * 2 ** zoom);
    expect(500 / mPorPx).toBeCloseTo(600, 0);
  });

  it('en diagonal y girado a su rumbo, el mismo zoom que recto (no el de su caja norte-sur)', () => {
    const recto = encuadreGirado({ playLine: [S, norte(500)], green: null }, 0, pantalla);
    const diagonal = encuadreGirado({ playLine: [S, noreste(500)], green: null }, 45, pantalla);

    expect(diagonal.zoom).toBeCloseTo(recto.zoom, 3);
  });

  it('sin márgenes, el centro es la mitad del hoyo girado', () => {
    const { center } = encuadreGirado({ playLine: [S, noreste(500)], green: null }, 45, { ...pantalla, padding: { top: 0, bottom: 0, left: 0, right: 0 } });

    expect(center.lat).toBeCloseTo(noreste(250).lat, 6);
    expect(center.lon).toBeCloseTo(noreste(250).lon, 6);
  });

  it('con más margen abajo que arriba, el centro del mapa baja: el hoyo queda en medio del hueco', () => {
    // 50 arriba y 250 abajo: el centro de la pantalla, 100 px por debajo del hueco
    const hoyo = { playLine: [S, norte(500)], green: null };
    const { center, zoom } = encuadreGirado(hoyo, 0, pantalla);

    const mPorPx = (2 * Math.PI * 6378137 * Math.cos((S.lat * Math.PI) / 180)) / (512 * 2 ** zoom);
    const metrosDelCentro = (center.lat - S.lat) * M_POR_GRADO;
    expect(metrosDelCentro).toBeCloseTo(250 - 100 * mPorPx, 0);
    expect(center.lon).toBeCloseTo(S.lon, 9);
  });

  it('si lo que manda es lo ancho, se encuadra por el ancho', () => {
    const ancho = { playLine: [S, { lat: S.lat, lon: S.lon + 600 / (M_POR_GRADO * Math.cos((S.lat * Math.PI) / 180)) }], green: null };

    const { zoom } = encuadreGirado(ancho, 0, pantalla);

    const mPorPx = (2 * Math.PI * 6378137 * Math.cos((S.lat * Math.PI) / 180)) / (512 * 2 ** zoom);
    expect(600 / mPorPx).toBeCloseTo(320, 0);
  });

  it('incluye el green (delante y fondo)', () => {
    const conGreen = { playLine: [S, norte(500)], green: { front: norte(490), center: norte(500), back: norte(520) } };

    const { zoom } = encuadreGirado(conGreen, 0, pantalla);

    const mPorPx = (2 * Math.PI * 6378137 * Math.cos((S.lat * Math.PI) / 180)) / (512 * 2 ** zoom);
    expect(520 / mPorPx).toBeCloseTo(600, 0);
  });

  it('el zoom, contra una constante de Web Mercator (teselas de 512 px): 0,110139 m/px a zoom 19 y 42,46°', () => {
    // A zoom 19 caben 0,110139 m por píxel aquí: 66,08 m llenan 600 px
    const hoyo = { playLine: [S, norte(66.0834)], green: null };

    expect(encuadreGirado(hoyo, 0, pantalla).zoom).toBeCloseTo(19, 2);
  });

  it('un hoyo con un codo hacia la derecha: el centro se va de lado, hacia el codo', () => {
    const codo = { lat: norte(250).lat, lon: S.lon + 100 / (M_POR_GRADO * Math.cos((S.lat * Math.PI) / 180)) };
    const { center } = encuadreGirado({ playLine: [S, codo, norte(500)], green: null }, 0, { ...pantalla, padding: { top: 0, bottom: 0, left: 0, right: 0 } });

    const metrosAlEste = (center.lon - S.lon) * M_POR_GRADO * Math.cos((S.lat * Math.PI) / 180);
    expect(metrosAlEste).toBeCloseTo(50, 0);
  });

  it('un punto imposible (NaN) se descarta; si no queda ninguno, null', () => {
    expect(encuadreGirado({ playLine: [S, { lat: Number.NaN, lon: 1 }, norte(500)], green: null }, 0, pantalla).center.lat).not.toBeNaN();
    expect(encuadreGirado({ playLine: [{ lat: Number.NaN, lon: Number.NaN }], green: null }, 0, pantalla)).toBeNull();
  });

  it('un solo punto: zoom 19; sin hoyo, null', () => {
    expect(encuadreGirado({ playLine: [S], green: null }, 0, pantalla).zoom).toBe(19);
    expect(encuadreGirado(null, 0, pantalla)).toBeNull();
  });

  it('sin hueco libre, la pantalla entera (no el zoom máximo)', () => {
    const hoyo = { playLine: [S, norte(500)], green: null };

    const { zoom } = encuadreGirado(hoyo, 0, { ancho: 80, alto: 300, padding: pantalla.padding });

    const mPorPx = (2 * Math.PI * 6378137 * Math.cos((S.lat * Math.PI) / 180)) / (512 * 2 ** zoom);
    expect(500 / mPorPx).toBeCloseTo(300, 0);
  });
});

// Agustín, 17-18 oct: el hoyo se ve como se juega
//
// | Caso | Situación                     | Hacia dónde                                         |
// |------|-------------------------------|-----------------------------------------------------|
// | O1   | par 3                         | de la salida al green                               |
// | O1   | par 4 o 5 con codos           | de la salida al primer codo                         |
// | O1   | sin codos o sin par           | de la salida al green                               |
// | O2   | a mitad de hoyo               | de ti al siguiente punto de la línea que tengas delante |
describe('rumboDeLaLinea (O1)', () => {
  const CODO = { lat: 36.285, lon: -5.325 };
  const FIN = { lat: 36.29, lon: -5.332 };
  const CON_CODO = [SALIDA, CODO, FIN];

  it('par 3: de la salida al green, aunque tenga codos', () => {
    expect(rumboDeLaLinea(CON_CODO, 3)).toBeCloseTo(rumbo(SALIDA, FIN), 6);
  });

  it('par 4 y 5: de la salida al primer codo', () => {
    expect(rumboDeLaLinea(CON_CODO, 4)).toBeCloseTo(rumbo(SALIDA, CODO), 6);
    expect(rumboDeLaLinea([SALIDA, CODO, { lat: 36.288, lon: -5.33 }, FIN], 5)).toBeCloseTo(rumbo(SALIDA, CODO), 6);
  });

  it('sin codos o sin par: al green', () => {
    expect(rumboDeLaLinea([SALIDA, FIN], 4)).toBeCloseTo(rumbo(SALIDA, FIN), 6);
    expect(rumboDeLaLinea(CON_CODO, null)).toBeCloseTo(rumbo(SALIDA, FIN), 6);
  });

  it('sin línea o con un solo punto, sin rumbo', () => {
    expect(rumboDeLaLinea(null, 4)).toBeNull();
    expect(rumboDeLaLinea([SALIDA], 4)).toBeNull();
  });
});

describe('siguientePuntoDeLaLinea (O2)', () => {
  // Salida al sur, un codo al norte y el green al este del codo
  const S = { lat: 36.28, lon: -5.33 };
  const C = { lat: 36.283, lon: -5.33 };
  const G = { lat: 36.283, lon: -5.326 };
  const L = [S, C, G];

  it('antes del codo, el codo', () => {
    expect(siguientePuntoDeLaLinea({ lat: 36.281, lon: -5.3301 }, L)).toEqual(C);
  });

  it('pasado el codo, el green', () => {
    expect(siguientePuntoDeLaLinea({ lat: 36.2831, lon: -5.328 }, L)).toEqual(G);
  });

  it('detrás de la salida, el primer punto tras ella', () => {
    expect(siguientePuntoDeLaLinea({ lat: 36.279, lon: -5.33 }, L)).toEqual(C);
  });

  it('lo más cerca de un tramo es entre sus dos puntos, no en su prolongación', () => {
    // Al oeste de la calle hacia el codo, casi en la prolongación del tramo al green
    expect(siguientePuntoDeLaLinea({ lat: 36.2825, lon: -5.335 }, L)).toEqual(C);
  });

  it('pasado el codo por fuera de la esquina (empate en el codo), el green', () => {
    expect(siguientePuntoDeLaLinea({ lat: 36.2835, lon: -5.3305 }, L)).toEqual(G);
  });

  it('a menos de 20 m del codo (lo que yerra el GPS), el green', () => {
    expect(siguientePuntoDeLaLinea({ lat: 36.2829, lon: -5.3301 }, L)).toEqual(G);
  });

  it('lejos del ecuador, la longitud cuenta menos (en metros)', () => {
    const linea = [{ lat: 60, lon: 0 }, { lat: 60.02, lon: 0 }, { lat: 60.02, lon: 0.03 }];

    // 0,01° de longitud a 60° son 0,005° de latitud: más cerca del primer tramo
    expect(siguientePuntoDeLaLinea({ lat: 60.013, lon: 0.01 }, linea)).toEqual(linea[1]);
  });

  it('a 21 m del codo, contando lo que mide la longitud, aún el codo', () => {
    // 18 m al oeste y 11 m al sur del codo
    expect(siguientePuntoDeLaLinea({ lat: 36.2829, lon: -5.3302 }, L)).toEqual(C);
  });

  it('en el green o pasado él, el green', () => {
    expect(siguientePuntoDeLaLinea({ lat: 36.2831, lon: -5.3261 }, L)).toEqual(G);
    expect(siguientePuntoDeLaLinea({ lat: 36.283, lon: -5.32 }, L)).toEqual(G);
  });

  it('sin línea, nada', () => {
    expect(siguientePuntoDeLaLinea(S, null)).toBeNull();
    expect(siguientePuntoDeLaLinea(S, [S])).toBeNull();
  });
});
