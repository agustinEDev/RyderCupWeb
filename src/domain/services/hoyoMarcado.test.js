import { describe, it, expect } from 'vitest';
import {
  MARGEN_DE_LA_TARJETA,
  MAX_CODOS,
  MAX_SALIDA_GREEN_M,
  METROS_AL_BORDE_DEL_GREEN,
  MIN_SALIDA_GREEN_M,
  circuloAlrededor,
  difiereDeLaTarjeta,
  hoyoDeUnaMarca,
  longitudDeLaLinea,
  puntoDesde,
  puntosParaArrastrar,
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
  it('delante y fondo a 10 m, hasta 2 codos, aviso al 25 % y límites 40-750 m', () => {
    expect(METROS_AL_BORDE_DEL_GREEN).toBe(10);
    expect(MAX_CODOS).toBe(2);
    expect(MARGEN_DE_LA_TARJETA).toBe(0.25);
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
  it('marca entera: la línea es salida, codos y green; delante y fondo a 10 m sobre el último tramo', () => {
    const hoyo = hoyoDeUnaMarca({ tee: SALIDA, bends: [CODO], greenCenter: GREEN });

    expect(hoyo.playLine).toEqual([SALIDA, CODO, GREEN]);
    expect(hoyo.green.center).toEqual(GREEN);
    expect(distanciaEnMetros(hoyo.green.front, GREEN)).toBe(10);
    expect(distanciaEnMetros(hoyo.green.back, GREEN)).toBe(10);
    // Delante, del lado del codo; fondo, del otro
    expect(distanciaEnMetros(CODO, hoyo.green.front)).toBe(distanciaEnMetros(CODO, GREEN) - 10);
    expect(distanciaEnMetros(CODO, hoyo.green.back)).toBe(distanciaEnMetros(CODO, GREEN) + 10);
    expect(hoyo.marcadoPorMi).toBe(true);
  });

  it('sin codos, la recta de la salida al green', () => {
    const hoyo = hoyoDeUnaMarca({ tee: SALIDA, bends: [], greenCenter: GREEN });

    expect(hoyo.playLine).toEqual([SALIDA, GREEN]);
    expect(distanciaEnMetros(SALIDA, hoyo.green.front)).toBe(290);
    expect(distanciaEnMetros(SALIDA, hoyo.green.back)).toBe(310);
  });

  it('solo green: la línea aprobada termina en el green marcado (conserva sus codos)', () => {
    const aprobado = { playLine: [SALIDA, CODO, alNorte(280)], green: null };

    const hoyo = hoyoDeUnaMarca({ tee: null, bends: [], greenCenter: GREEN }, aprobado);

    expect(hoyo.playLine).toEqual([SALIDA, CODO, GREEN]);
    expect(hoyo.green.center).toEqual(GREEN);
  });

  it('solo green con una línea aprobada de un solo tramo', () => {
    const aprobado = { playLine: [SALIDA, alNorte(250)], green: null };

    expect(hoyoDeUnaMarca({ tee: null, bends: [], greenCenter: GREEN }, aprobado).playLine).toEqual([SALIDA, GREEN]);
  });

  it('solo green con una línea aprobada de un solo punto: de esa salida al green', () => {
    expect(hoyoDeUnaMarca({ tee: null, bends: [], greenCenter: GREEN }, { playLine: [SALIDA], green: null }).playLine).toEqual([SALIDA, GREEN]);
  });

  it('solo green sin línea aprobada (no debería pasar) no da hoyo', () => {
    expect(hoyoDeUnaMarca({ tee: null, bends: [], greenCenter: GREEN }, null)).toBeNull();
    expect(hoyoDeUnaMarca({ tee: null, bends: [], greenCenter: GREEN }, { playLine: [], green: null })).toBeNull();
  });

  it('sin marca, no hay hoyo', () => {
    expect(hoyoDeUnaMarca(null)).toBeNull();
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

describe('difiereDeLaTarjeta (más de un 25 %)', () => {
  it.each([
    [142, 185, true],
    [142, 178, true],
    [142, 177, false],
    [142, 142, false],
    [142, 107, false],
    [142, 106, true],
    [400, 501, true],
    [400, 500, false],
  ])('tarjeta %i m, marcado %i m → %s', (tarjeta, marcado, avisa) => {
    expect(difiereDeLaTarjeta(marcado, tarjeta)).toBe(avisa);
  });

  it('sin metros en la tarjeta, nunca avisa', () => {
    expect(difiereDeLaTarjeta(500, null)).toBe(false);
    expect(difiereDeLaTarjeta(500, undefined)).toBe(false);
    expect(difiereDeLaTarjeta(500, 0)).toBe(false);
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

describe('puntosParaArrastrar', () => {
  it('sin codos, uno en mitad de la recta, que se inserta tras la salida', () => {
    const [p, ...resto] = puntosParaArrastrar([SALIDA, GREEN]);

    expect(resto).toEqual([]);
    expect(p.indice).toBe(1);
    expect(distanciaEnMetros(SALIDA, p.punto)).toBe(150);
    expect(distanciaEnMetros(p.punto, GREEN)).toBe(150);
  });

  it('con un codo, uno en cada tramo', () => {
    const puntos = puntosParaArrastrar([SALIDA, CODO, GREEN]);

    expect(puntos.map((p) => p.indice)).toEqual([1, 2]);
  });

  it('par 5: la recta lleva dos, a un tercio y a dos tercios, que entran tras la salida', () => {
    const puntos = puntosParaArrastrar([SALIDA, GREEN], { par: 5 });

    expect(puntos.map((p) => p.indice)).toEqual([1, 1]);
    expect(puntos.map((p) => distanciaEnMetros(SALIDA, p.punto))).toEqual([100, 200]);
  });

  it('par 5 con un codo: ya uno en cada tramo, como siempre', () => {
    expect(puntosParaArrastrar([SALIDA, CODO, GREEN], { par: 5 }).map((p) => p.indice)).toEqual([1, 2]);
  });

  it.each([3, 4, null])('par %s: uno en medio', (par) => {
    expect(puntosParaArrastrar([SALIDA, GREEN], { par })).toHaveLength(1);
  });

  it('con dos codos, ninguno más', () => {
    expect(puntosParaArrastrar([SALIDA, CODO, alNorte(200), GREEN])).toEqual([]);
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
