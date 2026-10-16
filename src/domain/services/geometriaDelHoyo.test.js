import { describe, it, expect } from 'vitest';
import { rumbo, orientacionDelHoyo, limitesDelHoyo, esPosicionValida, encuadreGirado } from './geometriaDelHoyo';

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

  it('el centro es el del hoyo girado (la mitad de la línea)', () => {
    const { center } = encuadreGirado({ playLine: [S, noreste(500)], green: null }, 45, pantalla);

    expect(center.lat).toBeCloseTo(noreste(250).lat, 6);
    expect(center.lon).toBeCloseTo(noreste(250).lon, 6);
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

  it('un solo punto (o sin sitio libre): zoom 19, y sin hoyo, null', () => {
    expect(encuadreGirado({ playLine: [S], green: null }, 0, pantalla).zoom).toBe(19);
    expect(encuadreGirado({ playLine: [S, norte(500)], green: null }, 0, { ancho: 80, alto: 300, padding: pantalla.padding }).zoom).toBe(19);
    expect(encuadreGirado(null, 0, pantalla)).toBeNull();
  });
});
