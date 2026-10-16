import { describe, it, expect } from 'vitest';
import {
  MAX_CODOS,
  MAX_SALIDA_GREEN_M,
  METROS_AL_BORDE_DEL_GREEN,
  MIN_SALIDA_GREEN_M,
  circuloAlrededor,
  aCodosDelPar,
  codosDelPar,
  conCodosDelPar,
  hoyoDeUnaMarca,
  longitudDeLaLinea,
  puntoDesde,
  salidaGreenFueraDeLimites,
  estaLejosDelCampo,
  MAX_DISTANCIA_AL_CAMPO_M,
} from './hoyoMarcado';
import { distanciaEnMetros } from './distanciasAlGreen';
import { rumbo } from './geometriaDelHoyo';

// Metros por grado de latitud con el radio que usa distanciaEnMetros
const M_POR_GRADO = (6371008.8 * Math.PI) / 180;
const SALIDA = { lat: 36.28, lon: -5.33 };
const alNorte = (metros, de = SALIDA) => ({ lat: de.lat + metros / M_POR_GRADO, lon: de.lon });
const GREEN = alNorte(300);
const CODO = { lat: 36.2815, lon: -5.331 };

describe('hoyoMarcado — constantes aprobadas (15 oct)', () => {
  it('delante y fondo a 10 m, hasta 2 codos y límites 40-750 m', () => {
    expect(METROS_AL_BORDE_DEL_GREEN).toBe(10);
    expect(MAX_CODOS).toBe(2);
    expect([MIN_SALIDA_GREEN_M, MAX_SALIDA_GREEN_M]).toEqual([40, 750]);
  });
});

describe('puntoDesde', () => {
  it('300 m al norte sube la latitud y no mueve la longitud', () => {
    const p = puntoDesde(SALIDA, 0, 300);

    expect(distanciaEnMetros(SALIDA, p)).toBe(300);
    expect(p.lon).toBeCloseTo(SALIDA.lon, 9);
    expect(p.lat).toBeGreaterThan(SALIDA.lat);
  });

  it('respeta el rumbo (90° = este)', () => {
    const p = puntoDesde(SALIDA, 90, 200);

    expect(rumbo(SALIDA, p)).toBeCloseTo(90, 3);
    expect(distanciaEnMetros(SALIDA, p)).toBe(200);
  });
});

describe('hoyoDeUnaMarca', () => {
  it('la línea es salida, codos y green; delante y fondo a 10 m sobre el último tramo', () => {
    const hoyo = hoyoDeUnaMarca({ tee: SALIDA, bends: [CODO], greenCenter: GREEN });

    expect(hoyo.playLine).toEqual([SALIDA, CODO, GREEN]);
    expect(hoyo.green.center).toEqual(GREEN);
    expect(distanciaEnMetros(hoyo.green.front, GREEN)).toBe(10);
    expect(distanciaEnMetros(hoyo.green.back, GREEN)).toBe(10);
    // Delante, del lado del codo; fondo, del otro
    expect(distanciaEnMetros(CODO, hoyo.green.front)).toBe(distanciaEnMetros(CODO, GREEN) - 10);
    expect(distanciaEnMetros(CODO, hoyo.green.back)).toBe(distanciaEnMetros(CODO, GREEN) + 10);
  });

  it('sin codos, la recta de la salida al green', () => {
    const hoyo = hoyoDeUnaMarca({ tee: SALIDA, bends: [], greenCenter: GREEN });

    expect(hoyo.playLine).toEqual([SALIDA, GREEN]);
    expect(distanciaEnMetros(SALIDA, hoyo.green.front)).toBe(290);
    expect(distanciaEnMetros(SALIDA, hoyo.green.back)).toBe(310);
  });

  it('sin marca, o sin salida, no hay hoyo', () => {
    expect(hoyoDeUnaMarca(null)).toBeNull();
    expect(hoyoDeUnaMarca({ tee: null, bends: [], greenCenter: GREEN })).toBeNull();
  });
});

describe('longitudDeLaLinea', () => {
  it('suma los tramos', () => {
    const linea = [SALIDA, alNorte(100), alNorte(250)];

    expect(longitudDeLaLinea(linea)).toBe(250);
  });

  it('con codo, más que la recta', () => {
    const recta = distanciaEnMetros(SALIDA, GREEN);

    expect(longitudDeLaLinea([SALIDA, CODO, GREEN])).toBeGreaterThan(recta);
  });

  it('un punto o ninguno, 0', () => {
    expect(longitudDeLaLinea([SALIDA])).toBe(0);
    expect(longitudDeLaLinea([])).toBe(0);
  });
});

describe('salidaGreenFueraDeLimites (40-750 m en recta)', () => {
  it.each([
    [10, 'cerca'],
    [39, 'cerca'],
    [41, null],
    [300, null],
    [749, null],
    [751, 'lejos'],
  ])('green a %i m → %s', (metros, resultado) => {
    expect(salidaGreenFueraDeLimites(SALIDA, alNorte(metros))).toBe(resultado);
  });
});

// Agustín, 16 oct: al marcar el green salen ya los codos del par
describe('codosDelPar', () => {
  it.each([
    [3, 0],
    [4, 1],
    [5, 2],
    [null, 1],
    [undefined, 1],
    [6, 2],
  ])('par %s → %i codos', (par, codos) => {
    expect(codosDelPar(par)).toBe(codos);
  });
});

describe('conCodosDelPar', () => {
  it('par 3: la recta, sin codos', () => {
    expect(conCodosDelPar([SALIDA, GREEN], 3)).toEqual([SALIDA, GREEN]);
  });

  it('par 4 (y sin par): un codo en mitad de la recta', () => {
    for (const par of [4, null]) {
      const [s, codo, g] = conCodosDelPar([SALIDA, GREEN], par);

      expect([s, g]).toEqual([SALIDA, GREEN]);
      expect(distanciaEnMetros(SALIDA, codo)).toBe(150);
      expect(distanciaEnMetros(codo, GREEN)).toBe(150);
    }
  });

  it('par 5: dos codos, a un tercio y a dos tercios', () => {
    const linea = conCodosDelPar([SALIDA, GREEN], 5);

    expect(linea).toHaveLength(4);
    expect(linea.slice(1, 3).map((p) => distanciaEnMetros(SALIDA, p))).toEqual([100, 200]);
  });

  it('la longitud no cambia: los codos van sobre la recta', () => {
    expect(longitudDeLaLinea(conCodosDelPar([SALIDA, GREEN], 5))).toBe(300);
  });

  it('una línea que ya tiene los codos del par (o más) no cambia', () => {
    const conUno = [SALIDA, CODO, GREEN];
    const conTres = [SALIDA, alNorte(50), alNorte(100), alNorte(150), GREEN];

    expect(conCodosDelPar(conUno, 4)).toBe(conUno);
    expect(conCodosDelPar(conUno, 3)).toBe(conUno);
    expect(conCodosDelPar(conTres, 5)).toBe(conTres);
  });

  it('par 5 con un codo: el que falta, en mitad del último tramo', () => {
    const codo = alNorte(100);
    const [, primero, segundo, g] = conCodosDelPar([SALIDA, codo, GREEN], 5);

    expect(primero).toEqual(codo);
    expect(distanciaEnMetros(codo, segundo)).toBe(100);
    expect(g).toEqual(GREEN);
  });

  it('sin línea (un punto o nada), nada que añadir', () => {
    expect(conCodosDelPar([SALIDA], 5)).toEqual([SALIDA]);
    expect(conCodosDelPar([], 4)).toEqual([]);
  });
});

// QA del 16 oct (P2): una línea de OSM con muchos puntos no cabía en la muestra
describe('aCodosDelPar', () => {
  const linea = [SALIDA, alNorte(50), alNorte(100), alNorte(160), alNorte(210), alNorte(250), GREEN];

  it('par 4: la salida, el punto más cercano a la mitad del recorrido y el green', () => {
    expect(aCodosDelPar(linea, 4)).toEqual([SALIDA, alNorte(160), GREEN]);
  });

  it('par 5: los más cercanos a un tercio y a dos tercios', () => {
    expect(aCodosDelPar(linea, 5)).toEqual([SALIDA, alNorte(100), alNorte(210), GREEN]);
  });

  it('par 3: la recta', () => {
    expect(aCodosDelPar(linea, 3)).toEqual([SALIDA, GREEN]);
  });

  it('sin par: como un par 4', () => {
    expect(aCodosDelPar(linea, null)).toEqual([SALIDA, alNorte(160), GREEN]);
  });

  it('una línea que ya cabe (o con menos puntos) no cambia', () => {
    const corta = [SALIDA, CODO, GREEN];

    expect(aCodosDelPar(corta, 4)).toBe(corta);
    expect(aCodosDelPar(corta, 5)).toBe(corta);
    expect(aCodosDelPar([SALIDA, GREEN], 4)).toEqual([SALIDA, GREEN]);
  });

  it('los codos van en el orden de la línea aunque se elijan en otro', () => {
    // Al tercio (100 m) el más cercano es el de 120; a los dos tercios ya solo
    // quedan los de antes: el de 55. La línea sigue de la salida al green
    const linea2 = [SALIDA, alNorte(20), alNorte(55), alNorte(120), GREEN];

    expect(aCodosDelPar(linea2, 5)).toEqual([SALIDA, alNorte(55), alNorte(120), GREEN]);
  });

  it('no repite un punto: dos tercios que caen en el mismo se separan', () => {
    const pocos = [SALIDA, alNorte(10), alNorte(150), alNorte(290), GREEN];

    const r = aCodosDelPar(pocos, 5);

    expect(r).toHaveLength(4);
    expect(new Set(r.map((p) => p.lat)).size).toBe(4);
    expect([r[0], r.at(-1)]).toEqual([SALIDA, GREEN]);
  });
});

describe('circuloAlrededor', () => {
  it('un anillo cerrado de puntos a esa distancia', () => {
    const anillo = circuloAlrededor(SALIDA, 142);

    expect(anillo.length).toBeGreaterThan(30);
    expect(anillo[0]).toEqual(anillo.at(-1));
    for (const p of anillo) expect(distanciaEnMetros(SALIDA, p)).toBe(142);
  });
});

describe('estaLejosDelCampo (más de 3 km, como el servidor con las marcas)', () => {
  it.each([
    [2999, false],
    [3001, true],
  ])('a %i m → %s', (metros, lejos) => {
    expect(MAX_DISTANCIA_AL_CAMPO_M).toBe(3000);
    expect(estaLejosDelCampo(alNorte(metros), SALIDA)).toBe(lejos);
  });

  it('sin posición o sin campo, no se sabe: no está lejos', () => {
    expect(estaLejosDelCampo(null, SALIDA)).toBe(false);
    expect(estaLejosDelCampo(SALIDA, null)).toBe(false);
  });
});
