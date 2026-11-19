import { describe, it, expect } from 'vitest';
import {
  habraPuntosQueArrastrar,
  pasoDeLaMarca,
  puntosDelUltimoPaso,
  seVeLaGuia,
} from './ayudaParaMarcar';

const T = { lat: 36.28, lon: -5.33 };
const G = { lat: 36.29, lon: -5.332 };
// Codos de verdad: a cientos de metros de la recta de la salida al green
const CODO = { lat: 36.284, lon: -5.335 };
const CODO_2 = { lat: 36.287, lon: -5.336 };
// Vértices de OSM casi sobre la recta (a menos de 15 m): no cuentan como codos
const EN_LA_RECTA = (f) => ({
  lat: T.lat + (G.lat - T.lat) * f,
  lon: T.lon + (G.lon - T.lon) * f,
});

describe('seVeLaGuia (G1, G4)', () => {
  const base = {
    fase: 'pregunta',
    sinMapa: false,
    reporte: null,
    vista: false,
    pedida: false,
  };

  it.each([
    ['G1: no vista, en la pregunta', {}, true],
    ['G1: no vista, pidiendo la salida o el green', { fase: 'pidiendo' }, true],
    ['G1: no vista, sin marcar (fase null)', { fase: null }, false],
    ['G1: no vista, tras «Ahora no»', { fase: 'pausado' }, false],
    ['G1: ya vista no vuelve sola', { vista: true }, false],
    ['B1: ya vista, pedida con el «?»', { vista: true, pedida: true }, true],
    ['B1: pedida aunque no se marque', { fase: null, pedida: true }, true],
    ['G4: sin WebGL no sale', { sinMapa: true }, false],
    ['sin saber aún si hay mapa, no sale', { sinMapa: null }, false],
    [
      'sin saber aún si hay mapa, tampoco pedida',
      { sinMapa: null, pedida: true },
      false,
    ],
    ['G4: sin WebGL tampoco pedida', { sinMapa: true, pedida: true }, false],
    ['G4: reportando no sale', { reporte: { fase: 'salida' } }, false],
    [
      'G4: reportando tampoco pedida',
      { reporte: { fase: 'motivos' }, pedida: true },
      false,
    ],
  ])('%s', (_caso, cambio, esperado) => {
    expect(seVeLaGuia({ ...base, ...cambio })).toBe(esperado);
  });
});

describe('pasoDeLaMarca (P1-P5 y par 3)', () => {
  const base = {
    pidiendo: true,
    marca: { fase: 'pidiendo', tee: null },
    marcandoSalida: true,
    greenYaPuesto: null,
    par: 4,
  };

  it.each([
    ['P5: la pregunta no lleva número', { pidiendo: false }, null],
    ['P1: salida y green, la salida', {}, { n: 1, de: 3 }],
    [
      'P1: con mal GPS, también la salida',
      { marca: { fase: 'pidiendo', tee: null, malGps: true } },
      { n: 1, de: 3 },
    ],
    [
      'P1/P2: con la salida puesta (tocada o por el GPS), el green',
      { marca: { fase: 'pidiendo', tee: T } },
      { n: 2, de: 3 },
    ],
    [
      'tras el «No», solo el green: sin número (se mide desde ti, no habrá placa)',
      { marca: { fase: 'pidiendo', tee: null, soloGreen: true } },
      null,
    ],
    [
      'tras el «No» en un par 5, también sin número',
      { par: 5, marca: { fase: 'pidiendo', tee: null, soloGreen: true } },
      null,
    ],
    [
      'P3: con la salida conocida, solo el green',
      { marcandoSalida: false, lineaAprobada: [T] },
      { n: 1, de: 2 },
    ],
    ['par 5: como el par 4', { par: 5 }, { n: 1, de: 3 }],
    ['sin par: como el par 4', { par: null }, { n: 1, de: 3 }],
    ['par 3: salida y green, la salida', { par: 3 }, { n: 1, de: 2 }],
    [
      'par 3: salida y green, el green',
      { par: 3, marca: { fase: 'pidiendo', tee: T } },
      { n: 2, de: 2 },
    ],
    [
      'par 3: solo el green tras el «No», sin número',
      { par: 3, marca: { fase: 'pidiendo', tee: null, soloGreen: true } },
      null,
    ],
    [
      'par 3: solo el green con la salida conocida, sin número',
      { par: 3, marcandoSalida: false },
      null,
    ],
    [
      'solo el green sobre una línea aprobada con su codo (par 4): sin número',
      { marcandoSalida: false, lineaAprobada: [T, CODO, G] },
      null,
    ],
    [
      'solo el green sobre una línea con un codo en un par 5: con puntos en medio, sin número',
      { marcandoSalida: false, lineaAprobada: [T, CODO, G], par: 5 },
      null,
    ],
    [
      'solo el green sobre una línea con dos codos en un par 5: sin número',
      { marcandoSalida: false, lineaAprobada: [T, CODO, CODO_2, G], par: 5 },
      null,
    ],
    [
      'solo el green sobre una línea de OSM casi recta: depende del toque, sin número',
      {
        marcandoSalida: false,
        lineaAprobada: [T, EN_LA_RECTA(0.3), EN_LA_RECTA(0.6), G],
      },
      null,
    ],
    [
      'solo el green sobre una línea con la salida repetida: con puntos en medio, sin número',
      { marcandoSalida: false, lineaAprobada: [T, T, G] },
      null,
    ],
    [
      'solo el green sobre salida y final (sin puntos en medio), par 4: «1 de 2»',
      { marcandoSalida: false, lineaAprobada: [T, G] },
      { n: 1, de: 2 },
    ],
    [
      'solo el green sobre salida y final, par 5: «1 de 2»',
      { marcandoSalida: false, lineaAprobada: [T, G], par: 5 },
      { n: 1, de: 2 },
    ],
    [
      'solo el green con la salida sola (sin codos): «1 de 2»',
      { marcandoSalida: false, lineaAprobada: [T] },
      { n: 1, de: 2 },
    ],
    [
      'con el green ya puesto, solo la salida: sin número (19 nov)',
      { greenYaPuesto: G },
      null,
    ],
  ])('%s', (_caso, cambio, esperado) => {
    expect(pasoDeLaMarca({ ...base, ...cambio })).toEqual(esperado);
  });
});

describe('habraPuntosQueArrastrar (solo el green: seguro, o sin número)', () => {
  it.each([
    ['la salida sola, par 4', [T], 4, true],
    ['la salida sola, par 5', [T], 5, true],
    ['la salida sola, par 3', [T], 3, false],
    ['salida y final, par 4', [T, G], 4, true],
    ['salida y final, par 3', [T, G], 3, false],
    ['con su codo, par 4', [T, CODO, G], 4, false],
    ['con un codo, par 5: puntos en medio, no se sabe', [T, CODO, G], 5, false],
    [
      'OSM casi recta, par 4: puntos en medio, no se sabe',
      [T, EN_LA_RECTA(0.3), EN_LA_RECTA(0.6), G],
      4,
      false,
    ],
    ['la salida repetida, par 4', [T, T, G], 4, false],
    ['sin línea', [], 4, false],
  ])('%s', (_caso, linea, par, esperado) => {
    expect(habraPuntosQueArrastrar(linea, par)).toBe(esperado);
  });
});

describe('puntosDelUltimoPaso (P4)', () => {
  it.each([
    ['con un punto añadido', 1, null, 1],
    ['con dos puntos añadidos (par 5)', 2, null, 2],
    ['sin puntos que arrastrar (par 3, movidos o «Listo»)', false, null, 0],
    ['sin puntos añadidos', 0, null, 0],
    ['con un aviso pendiente, espera', 2, 'mapa.fueraDeLimites', 0],
  ])('%s', (_caso, conAyudaDeCodos, avisoDeMarca, esperado) => {
    expect(puntosDelUltimoPaso({ conAyudaDeCodos, avisoDeMarca })).toBe(
      esperado,
    );
  });
});
