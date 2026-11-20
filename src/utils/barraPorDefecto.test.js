import { describe, it, expect } from 'vitest';
import {
  barraPorDefecto,
  barrasDeMiGenero,
  barrasParaElegir,
  colorHabitual,
  ultimasBarras,
} from './barraPorDefecto';

/**
 * La barra que sale elegida y las que se ven (FE #1025, tabla aprobada el
 * 3 nov 2026: P5, P8, P10 y P4 afinada):
 *
 *   #    caso                                       | resultado
 *   -----|-------------------------------------------|----------------------------------
 *   U1   la de la última vez, y el campo la tiene   | esa
 *   U2   la de la última vez ya no está             | la de tu género
 *   U3   hombre                                     | amarillas de hombre; si no hay,
 *        |                                           | amarillas mixtas; si no, ninguna
 *   U4   mujer                                      | rojas de mujer; si no, rojas
 *        |                                           | mixtas; si no, ninguna
 *   U5   sin género ni última vez                   | ninguna
 *   U6   un campo sin barras                        | ninguna
 *   U7   la última vez de cada uno en ese campo     | la partida más reciente en él;
 *        |                                           | otros campos y quien no llevaba
 *        |                                           | barra no cuentan
 *   U8   las que se ven                             | las de tu género y las mixtas;
 *        |                                           | sin género, ninguna (va el panel)
 */

const tee = (color, gender) => ({ color, gender });
const FEDERADO = [
  tee('WHITE', 'MALE'),
  tee('YELLOW', 'MALE'),
  tee('YELLOW', 'FEMALE'),
  tee('RED', 'FEMALE'),
  tee('BLUE', 'FEMALE'),
];

describe('barraPorDefecto', () => {
  it('U1: la de la última vez, si el campo la tiene', () => {
    expect(
      barraPorDefecto({ tees: FEDERADO, genero: 'MALE', ultima: 'WHITE|MALE' }),
    ).toBe('WHITE|MALE');
  });

  it('U2: la de la última vez ya no está: la de tu género', () => {
    expect(
      barraPorDefecto({ tees: FEDERADO, genero: 'MALE', ultima: 'BLACK|MALE' }),
    ).toBe('YELLOW|MALE');
  });

  it.each([
    ['amarillas de hombre', FEDERADO, 'YELLOW|MALE'],
    ['amarillas mixtas', [tee('YELLOW', null), tee('RED', null)], 'YELLOW|'],
    ['ninguna', [tee('WHITE', 'MALE'), tee('RED', 'FEMALE')], ''],
  ])('U3: hombre → %s', (_, tees, esperada) => {
    expect(barraPorDefecto({ tees, genero: 'MALE', ultima: null })).toBe(
      esperada,
    );
  });

  it.each([
    ['rojas de mujer', FEDERADO, 'RED|FEMALE'],
    ['rojas mixtas', [tee('YELLOW', null), tee('RED', null)], 'RED|'],
    ['ninguna', [tee('WHITE', 'MALE'), tee('YELLOW', 'FEMALE')], ''],
  ])('U4: mujer → %s', (_, tees, esperada) => {
    expect(barraPorDefecto({ tees, genero: 'FEMALE', ultima: null })).toBe(
      esperada,
    );
  });

  it('U5: sin género ni última vez, ninguna', () => {
    expect(
      barraPorDefecto({ tees: FEDERADO, genero: null, ultima: null }),
    ).toBe('');
  });

  it('U6: un campo sin barras, ninguna (también con última vez)', () => {
    expect(
      barraPorDefecto({ tees: [], genero: 'MALE', ultima: 'YELLOW|MALE' }),
    ).toBe('');
  });
});

describe('ultimasBarras', () => {
  const jugador = (userId, color, teeGender = 'MALE') => ({
    userId,
    color,
    teeGender,
    isGuest: false,
  });
  const partida = (golfCourseId, cuando, participants) => ({
    golfCourseId,
    playedAt: cuando,
    createdAt: cuando,
    participants,
  });

  it('U7: la de la partida más reciente en ese campo, por jugador', () => {
    const partidas = [
      partida('gc-1', '2026-10-01T10:00:00Z', [
        jugador('yo', 'WHITE'),
        jugador('ana', 'RED', 'FEMALE'),
      ]),
      partida('gc-1', '2026-10-20T10:00:00Z', [jugador('yo', 'YELLOW')]),
      partida('gc-2', '2026-11-01T10:00:00Z', [
        jugador('yo', 'BLUE'),
        jugador('ana', 'YELLOW', 'FEMALE'),
      ]),
    ];

    const ultimas = ultimasBarras(partidas, 'gc-1');

    expect(ultimas.get('yo')).toBe('YELLOW|MALE');
    expect(ultimas.get('ana')).toBe('RED|FEMALE');
  });

  it('U7: quien no llevaba barra, o un invitado, no cuenta', () => {
    const partidas = [
      partida('gc-1', '2026-10-01T10:00:00Z', [jugador('yo', 'WHITE')]),
      partida('gc-1', '2026-10-20T10:00:00Z', [
        jugador('yo', null, null),
        { userId: null, color: 'RED', teeGender: 'FEMALE', isGuest: true },
      ]),
    ];

    const ultimas = ultimasBarras(partidas, 'gc-1');

    expect(ultimas.get('yo')).toBe('WHITE|MALE');
    expect(ultimas.size).toBe(1);
  });

  it('U7: sin partidas (o sin poder leerlas), vacío', () => {
    expect(ultimasBarras([], 'gc-1').size).toBe(0);
    expect(ultimasBarras(null, 'gc-1').size).toBe(0);
  });
});

describe('barrasDeMiGenero', () => {
  it.each([
    ['hombre', 'MALE', ['WHITE|MALE', 'YELLOW|MALE', 'GREEN|']],
    [
      'mujer',
      'FEMALE',
      ['YELLOW|FEMALE', 'RED|FEMALE', 'BLUE|FEMALE', 'GREEN|'],
    ],
  ])('U8: %s ve las suyas y las mixtas', (_, genero, esperadas) => {
    const tees = [...FEDERADO, tee('GREEN', null)];
    expect(
      barrasDeMiGenero(tees, genero).map((t) => `${t.color}|${t.gender ?? ''}`),
    ).toEqual(esperadas);
  });

  it('U8: sin género no se filtra: va el panel de siempre', () => {
    expect(barrasDeMiGenero(FEDERADO, null)).toBeNull();
  });
});

/**
 * Lo que se ofrece al elegir o cambiar la barra en una competición (FE #1214):
 *
 *   #    caso                                         | resultado
 *   -----|---------------------------------------------|----------------------------------
 *   E1   mujer: las de mujer y las mixtas de todos     | sin repetir, en el orden de
 *        los campos                                   | TeeColor; las de hombre no
 *   E2   hombre                                       | las de hombre y las mixtas
 *   E3   sin género                                   | solo las mixtas
 *   E4   sin barras                                   | ninguna
 *   H1   la habitual de cada género                   | hombre amarillas, mujer rojas,
 *        |                                             | sin género ninguna
 */
describe('barrasParaElegir', () => {
  const barras = [
    { color: 'RED', gender: 'FEMALE' },
    { color: 'YELLOW', gender: 'MALE' },
    { color: 'BLUE', gender: null },
    { color: 'RED', gender: 'FEMALE' },
    { color: 'WHITE', gender: 'MALE' },
    { color: 'YELLOW', gender: 'FEMALE' },
  ];

  it('E1: mujer, las suyas y las mixtas, sin repetir y en orden', () => {
    expect(barrasParaElegir(barras, 'FEMALE')).toEqual([
      'YELLOW',
      'BLUE',
      'RED',
    ]);
  });

  it('E2: hombre, las suyas y las mixtas', () => {
    expect(barrasParaElegir(barras, 'MALE')).toEqual([
      'WHITE',
      'YELLOW',
      'BLUE',
    ]);
  });

  it('E3: sin género, solo las mixtas', () => {
    expect(barrasParaElegir(barras, null)).toEqual(['BLUE']);
  });

  it('E4: sin barras, ninguna', () => {
    expect(barrasParaElegir([], 'MALE')).toEqual([]);
    expect(barrasParaElegir(null, 'MALE')).toEqual([]);
  });

  it('H1: la habitual de cada género', () => {
    expect(colorHabitual('MALE')).toBe('YELLOW');
    expect(colorHabitual('FEMALE')).toBe('RED');
    expect(colorHabitual(null)).toBeNull();
  });
});
