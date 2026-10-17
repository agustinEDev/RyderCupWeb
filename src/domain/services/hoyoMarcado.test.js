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
  salidaPorMetros,
  hoyoDeUnaMarca,
  longitudDeLaLinea,
  puntoDesde,
  salidaGreenFueraDeLimites,
  estaLejosDelCampo,
  MAX_DISTANCIA_AL_CAMPO_M,
  lineaDePuntos,
  lineaDeOsm,
  puntosDeLaLinea,
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

// QA del 16 oct (P2): una línea de OSM con muchos puntos no cabía en la muestra.
// Agustín, 16 oct: los codos, donde de verdad gira el hoyo (no a partes iguales)
describe('aCodosDelPar', () => {
  const alEste = (m, de) => ({ lat: de.lat, lon: de.lon + m / (M_POR_GRADO * Math.cos((de.lat * Math.PI) / 180)) });

  it('un par 4 en dogleg conserva su esquina, aunque no esté en la mitad del recorrido', () => {
    // 300 m al norte y 100 m al este: con vértices cada 50 m, la esquina es la de los 300
    const esquina = alNorte(300);
    const green = alEste(100, esquina);
    const linea = [SALIDA, alNorte(50), alNorte(100), alNorte(150), alNorte(200), alNorte(250), esquina, alEste(50, esquina), green];

    expect(aCodosDelPar(linea, 4)).toEqual([SALIDA, esquina, green]);
  });

  it('un par 5 en doble dogleg conserva sus dos esquinas, en orden', () => {
    const e1 = alNorte(200);
    const e2 = alEste(150, e1);
    const green = { lat: e2.lat + 150 / M_POR_GRADO, lon: e2.lon };
    const linea = [SALIDA, alNorte(100), e1, alEste(75, e1), e2, { lat: e2.lat + 75 / M_POR_GRADO, lon: e2.lon }, green];

    expect(aCodosDelPar(linea, 5)).toEqual([SALIDA, e1, e2, green]);
  });

  it('los vértices casi en línea (menos de 15 m) no son codos: la recta', () => {
    const casi = alEste(5, alNorte(150));

    expect(aCodosDelPar([SALIDA, alNorte(50), casi, alNorte(250), GREEN], 4)).toEqual([SALIDA, GREEN]);
  });

  it('un par 3 va siempre recto, aunque OSM tenga un giro', () => {
    const giro = alEste(60, alNorte(120));

    expect(aCodosDelPar([SALIDA, giro, alNorte(200)], 3)).toEqual([SALIDA, alNorte(200)]);
  });

  it('un par 4 con un giro de verdad y otro menor se queda con el mayor', () => {
    const grande = alEste(80, alNorte(150));
    const pequeño = alEste(20, alNorte(250));

    expect(aCodosDelPar([SALIDA, grande, pequeño, GREEN], 4)).toEqual([SALIDA, grande, GREEN]);
  });

  it('sin par: como un par 4 (un codo)', () => {
    const esquina = alEste(80, alNorte(150));

    expect(aCodosDelPar([SALIDA, alNorte(50), esquina, GREEN], null)).toEqual([SALIDA, esquina, GREEN]);
  });

  it('una línea que ya cabe en su par no cambia', () => {
    const corta = [SALIDA, CODO, GREEN];

    expect(aCodosDelPar(corta, 4)).toBe(corta);
    expect(aCodosDelPar(corta, 5)).toBe(corta);
    expect(aCodosDelPar([SALIDA, GREEN], 4)).toEqual([SALIDA, GREEN]);
  });

  it('un nodo repetido seguido (OSM) se quita, también en una línea que ya cabe', () => {
    expect(aCodosDelPar([SALIDA, alNorte(100), alNorte(100), GREEN], 5)).toEqual([SALIDA, alNorte(100), GREEN]);
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

// V2 (Agustín, 17 oct): una referencia por hoyo; la salida de cada jugador se
// coloca sobre el primer tramo según los metros de su tarjeta
describe('salidaPorMetros', () => {
  const linea = [SALIDA, alNorte(250), GREEN]; // 250 + 50 = 300 m

  it('con la tarjeta más corta que la línea, la salida va hacia delante sobre el primer tramo', () => {
    const [salida, ...resto] = salidaPorMetros(linea, 270);

    expect(distanciaEnMetros(SALIDA, salida)).toBe(30);
    expect(resto).toEqual([alNorte(250), GREEN]);
    expect(longitudDeLaLinea([salida, ...resto])).toBe(270);
  });

  it('con la tarjeta más larga, hacia atrás, en la misma dirección', () => {
    const [salida] = salidaPorMetros(linea, 340);

    expect(distanciaEnMetros(SALIDA, salida)).toBe(40);
    expect(salida.lat).toBeLessThan(SALIDA.lat);
  });

  it.each([
    ['sin metros', null],
    ['metros que no son un número', 'x'],
    ['los mismos metros', 300],
  ])('%s: la línea, tal cual', (_caso, metros) => {
    expect(salidaPorMetros(linea, metros)).toBe(linea);
  });

  it('si adelantarla pasa del primer codo, no se mueve', () => {
    expect(salidaPorMetros(linea, 40)).toBe(linea);
  });

  it('si atrasarla es más que lo que mide el primer tramo, no se mueve (será otro hoyo o la tarjeta mal)', () => {
    expect(salidaPorMetros(linea, 560)).toBe(linea);
  });

  it('en un par 3 (recto), adelantarla no deja el green a menos de 40 m', () => {
    const recta = [SALIDA, GREEN];

    expect(salidaPorMetros(recta, 30)).toBe(recta);
    expect(distanciaEnMetros(SALIDA, salidaPorMetros(recta, 280)[0])).toBe(20);
  });

  it.each([[0], [-50]])('con %i metros, no se mueve', (metros) => {
    expect(salidaPorMetros(linea, metros)).toBe(linea);
  });

  it('atrasarla no deja el green a más de 750 m', () => {
    const larga = [SALIDA, alNorte(400), alNorte(720)];

    expect(salidaPorMetros(larga, 770)).toBe(larga);
    expect(distanciaEnMetros(salidaPorMetros(larga, 740)[0], alNorte(720))).toBe(740);
  });

  it('una línea con un punto roto no se mueve', () => {
    const rota = [SALIDA, { lat: Number.NaN, lon: -5.33 }, GREEN];

    expect(salidaPorMetros(rota, 250)).toBe(rota);
  });

  it('sin línea (un punto o nada), nada', () => {
    expect(salidaPorMetros([GREEN], 300)).toEqual([GREEN]);
    expect(salidaPorMetros(null, 300)).toBeNull();
  });
});

describe('lineaDePuntos (17 oct)', () => {
  it('es la inversa de puntosDeLaLinea', () => {
    const linea = { tee: { lat: 1, lon: 1 }, bends: [{ lat: 2, lon: 2 }, { lat: 3, lon: 3 }], greenCenter: { lat: 4, lon: 4 } };
    expect(lineaDePuntos(puntosDeLaLinea(linea))).toEqual(linea);
    expect(lineaDePuntos([linea.tee, linea.greenCenter])).toEqual({ tee: linea.tee, bends: [], greenCenter: linea.greenCenter });
  });
});

describe('lineaDeOsm (17 oct: la usan el jugador y el admin)', () => {
  const S = { lat: 36.28, lon: -5.33 };
  const V = { lat: 36.2815, lon: -5.3300001 };
  const FIN = { lat: 36.2826, lon: -5.33 };
  const G = { lat: 36.2827, lon: -5.33 };

  it('acaba en el centro del green, no donde termina la línea de OSM', () => {
    expect(lineaDeOsm([S, FIN], G, 3)).toEqual([S, G]);
  });

  it('se queda con los codos de su par: un vértice casi en línea en un par 3 no es un codo', () => {
    expect(lineaDeOsm([S, V, FIN], G, 3)).toEqual([S, G]);
  });

  it('en un par 4 recto, el codo que le toca sobre la recta', () => {
    const linea = lineaDeOsm([S, FIN], G, 4);
    expect(linea).toHaveLength(3);
    expect([linea[0], linea[2]]).toEqual([S, G]);
  });

  it('sin green, o sin línea, nada', () => {
    expect(lineaDeOsm([S, FIN], null, 4)).toBeNull();
    expect(lineaDeOsm([S], G, 4)).toBeNull();
    expect(lineaDeOsm(undefined, G, 4)).toBeNull();
  });
});
