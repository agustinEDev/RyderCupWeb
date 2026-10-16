import { describe, it, expect } from 'vitest';
import { distanciasDelHoyo, distanciasDesdeLaPosicion } from './distanciasDelHoyo';

// Metros por grado de latitud con el radio que usa distanciaEnMetros
const M_POR_GRADO = (6371008.8 * Math.PI) / 180;
const SALIDA = { lat: 36.28, lon: -5.33 };
const alNorte = (metros) => ({ lat: SALIDA.lat + metros / M_POR_GRADO, lon: SALIDA.lon });
const green = (centro, delante, fondo) => ({ front: alNorte(centro - delante), center: alNorte(centro), back: alNorte(centro + fondo) });

// Agustín, 16 oct: el recuadro es fijo, con los metros oficiales desde la
// salida, y no mira dónde está el jugador
describe('distanciasDelHoyo', () => {
  it('R1: con green dibujado, centro = tarjeta y delante/fondo según lo que mide el green', () => {
    const hoyo = { playLine: [SALIDA, alNorte(300)], green: green(300, 12, 15) };

    expect(distanciasDelHoyo({ metros: 342, hoyo })).toEqual({ front: 330, center: 342, back: 357 });
  });

  it('R2: un hoyo marcado a mano (green a 10 m), ±10', () => {
    const hoyo = { playLine: [SALIDA, alNorte(300)], green: green(300, 10, 10), marcadoPorMi: true };

    expect(distanciasDelHoyo({ metros: 342, hoyo })).toEqual({ front: 332, center: 342, back: 352 });
  });

  // B4 (Agustín, 17 oct): sin green no hay recuadro, aunque la tarjeta traiga metros
  it.each([
    ['sin hoyo', null],
    ['con solo la salida', { playLine: [SALIDA], green: null }],
  ])('B4: %s, no hay recuadro', (_caso, hoyo) => {
    expect(distanciasDelHoyo({ metros: 342, hoyo })).toBeNull();
  });

  it('B3: un green suelto (solo el centro), con la tarjeta: ±10', () => {
    expect(distanciasDelHoyo({ metros: 342, hoyo: { playLine: [], green: { center: alNorte(300) } } })).toEqual({ front: 332, center: 342, back: 352 });
  });

  it('R1: delante nunca por debajo de 0 (pocos metros en la tarjeta, o un green raro)', () => {
    const hoyo = { playLine: [SALIDA, alNorte(300)], green: green(300, 35, 10) };

    expect(distanciasDelHoyo({ metros: 30, hoyo }).front).toBe(0);
  });

  it('R4: sin metros en la tarjeta, medido en el mapa desde la salida siguiendo los codos', () => {
    const hoyo = { playLine: [SALIDA, alNorte(120), alNorte(300)], green: green(300, 12, 15) };

    expect(distanciasDelHoyo({ metros: null, hoyo })).toEqual({ front: 288, center: 300, back: 315 });
  });

  it('R4: siguiendo los codos de verdad (un dogleg mide más que la recta)', () => {
    const codo = { lat: alNorte(150).lat, lon: SALIDA.lon + 0.002 };
    const hoyo = { playLine: [SALIDA, codo, alNorte(300)], green: green(300, 10, 10) };

    expect(distanciasDelHoyo({ metros: null, hoyo }).center).toBeGreaterThan(300);
  });

  it.each([
    ['sin hoyo', null],
    ['sin green', { playLine: [SALIDA, alNorte(300)], green: null }],
    ['sin salida (línea de un punto)', { playLine: [alNorte(300)], green: green(300, 10, 10) }],
  ])('R5: sin metros y %s, no hay recuadro', (_caso, hoyo) => {
    expect(distanciasDelHoyo({ metros: null, hoyo })).toBeNull();
  });

  it.each([0, undefined])('R5: unos metros de %s cuentan como sin metros', (metros) => {
    expect(distanciasDelHoyo({ metros, hoyo: null })).toBeNull();
  });
});

// Agustín, 17 oct: en el hoyo y con buen GPS, el recuadro mide desde donde estás
describe('distanciasDesdeLaPosicion (B1-B4)', () => {
  const G = green(300, 12, 15);
  const aqui = (metros) => alNorte(metros);

  it('B1: con buen GPS y a 750 m o menos del green, desde la posición, a delante, centro y fondo', () => {
    expect(distanciasDesdeLaPosicion({ posicion: aqui(150), precision: 8, green: G })).toEqual({ front: 138, center: 150, back: 165 });
  });

  it.each([
    ['a 750 m justos', 750, 8, true],
    ['a 751 m', 751, 8, false],
    ['con 20 m de error', 150, 20, true],
    ['con 21 m de error', 150, 21, false],
  ])('B1/B2: %s', (_caso, metros, precision, desdeAqui) => {
    const posicion = alNorte(300 - metros);

    expect(distanciasDesdeLaPosicion({ posicion, precision, green: G }) !== null).toBe(desdeAqui);
  });

  it.each([
    ['sin posición', { posicion: null, precision: 5, green: G }],
    ['sin precisión', { posicion: aqui(150), precision: null, green: G }],
    ['sin green', { posicion: aqui(150), precision: 5, green: null }],
  ])('B2/B4: %s, nada (se usa la tarjeta, o no hay recuadro)', (_caso, datos) => {
    expect(distanciasDesdeLaPosicion(datos)).toBeNull();
  });

  it('B3: un green sin contorno (solo el centro), ±10', () => {
    expect(distanciasDesdeLaPosicion({ posicion: aqui(150), precision: 5, green: { center: alNorte(300) } })).toEqual({ front: 140, center: 150, back: 160 });
  });

  it('B3: de lado al green, delante y fondo no se cruzan: lo que mide el green, sobre el centro', () => {
    // A 150 m al este del green, que va de sur a norte: los dos bordes a la misma distancia
    const deLado = { lat: alNorte(300).lat, lon: SALIDA.lon + 150 / (M_POR_GRADO * Math.cos((SALIDA.lat * Math.PI) / 180)) };

    expect(distanciasDesdeLaPosicion({ posicion: deLado, precision: 5, green: G })).toEqual({ front: 138, center: 150, back: 165 });
  });

  it('B3: delante nunca por debajo de 0 (en el green)', () => {
    expect(distanciasDesdeLaPosicion({ posicion: alNorte(295), precision: 5, green: { center: alNorte(300) } }).front).toBe(0);
  });
});
