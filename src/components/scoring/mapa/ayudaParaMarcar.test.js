import { describe, it, expect } from 'vitest';
import { pasoDeLaMarca, seVeElUltimoPaso, seVeLaGuia } from './ayudaParaMarcar';

const T = { lat: 36.28, lon: -5.33 };
const G = { lat: 36.29, lon: -5.332 };

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
      'P3: tras el «No», solo el green',
      { marca: { fase: 'pidiendo', tee: null, soloGreen: true } },
      { n: 1, de: 2 },
    ],
    [
      'P3: con la salida conocida, solo el green',
      { marcandoSalida: false },
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
      { marcandoSalida: false, lineaAprobada: [T, T, G] },
      null,
    ],
    [
      'solo el green sobre una línea con un codo en un par 5 (falta otro): «1 de 2»',
      { marcandoSalida: false, lineaAprobada: [T, T, G], par: 5 },
      { n: 1, de: 2 },
    ],
    [
      'solo el green sobre una línea con dos codos en un par 5: sin número',
      { marcandoSalida: false, lineaAprobada: [T, T, T, G], par: 5 },
      null,
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

describe('seVeElUltimoPaso (P4)', () => {
  it.each([
    ['tras guardar con puntos que arrastrar', true, null, true],
    [
      'sin puntos que arrastrar (par 3, o ya movidos, o «Listo»)',
      false,
      null,
      false,
    ],
    ['con un aviso pendiente, espera', true, 'mapa.fueraDeLimites', false],
  ])('%s', (_caso, conAyudaDeCodos, avisoDeMarca, esperado) => {
    expect(seVeElUltimoPaso({ conAyudaDeCodos, avisoDeMarca })).toBe(esperado);
  });
});
