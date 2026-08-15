import { describe, it, expect } from 'vitest';
import MatchPlayStrokeAllocator from './MatchPlayStrokeAllocator';

/**
 * Paridad con `StrokeAllocationService` del backend.
 *
 * Los números no son inventados: salen del caso real que destapó el fallo, la
 * partida "Prueba" en Golf de Meis, y son exactamente los mismos que fija el
 * test de Python (test_stroke_allocation_service.py). Si estos dos ficheros se
 * separan, la anotación sin conexión empieza a contar otra cosa que el servidor.
 */

// Golf de Meis (RFEG 487), recorrido Par 72
const MEIS_TEES = [
  { color: 'YELLOW', gender: 'MALE', courseRating: 73.1, slopeRating: 140, identifier: null },
  { color: 'YELLOW', gender: 'FEMALE', courseRating: 79.4, slopeRating: 147, identifier: null },
];

const MEIS_STROKE_INDEX = [7, 1, 13, 5, 15, 9, 3, 11, 17, 16, 2, 14, 12, 8, 18, 6, 4, 10];
const MEIS_PARS = [4, 5, 4, 4, 3, 4, 5, 4, 3, 3, 4, 5, 4, 4, 3, 4, 5, 4];

const meisHoles = () =>
  MEIS_STROKE_INDEX.map((si, i) => ({
    holeNumber: i + 1,
    par: MEIS_PARS[i],
    strokeIndex: si,
  }));

// Campo genérico: par 72 y stroke index = número de hoyo
const flatHoles = () =>
  Array.from({ length: 18 }, (_, i) => ({ holeNumber: i + 1, par: 4, strokeIndex: i + 1 }));

const player = (id, handicap, gender = 'MALE', team = null) => ({
  participantId: id,
  handicap,
  color: 'YELLOW',
  teeGender: gender,
  team,
});

const holesWithStrokes = (entry) =>
  Object.entries(entry.strokesByHole)
    .filter(([, count]) => count > 0)
    .map(([hole]) => Number(hole))
    .sort((a, b) => a - b);

const totalStrokes = (entry) =>
  Object.values(entry.strokesByHole).reduce((sum, count) => sum + count, 0);

describe('MatchPlayStrokeAllocator', () => {
  describe('SINGLES en Golf de Meis (el caso que destapó el fallo)', () => {
    it('solo da golpes al de más hándicap, y le da la diferencia', () => {
      const me = player('me', 18.0);
      const rival = player('rival', 20.7);

      const result = MatchPlayStrokeAllocator.allocate({
        participants: [me, rival],
        holes: meisHoles(),
        tees: MEIS_TEES,
        matchFormat: 'SINGLES',
        allowancePercentage: 100,
        playMode: 'HANDICAP',
      });

      // Mismos Playing Handicaps que calcula el backend
      expect(result.me.playingHandicap).toBe(23);
      expect(result.rival.playingHandicap).toBe(27);

      // Reparto diferencial: el de menos PH juega off scratch
      expect(holesWithStrokes(result.me)).toEqual([]);
      // 27 - 23 = 4 golpes, en los hoyos de SI 1 a 4 -> hoyos 2, 7, 11 y 17
      expect(holesWithStrokes(result.rival)).toEqual([2, 7, 11, 17]);
    });

    it('nunca da golpes a los dos jugadores a la vez', () => {
      // El escenario de la captura: barra femenina contra masculina
      const me = player('me', 18.0, 'FEMALE');
      const rival = player('rival', 20.7, 'MALE');

      const result = MatchPlayStrokeAllocator.allocate({
        participants: [me, rival],
        holes: meisHoles(),
        tees: MEIS_TEES,
        matchFormat: 'SINGLES',
        allowancePercentage: 100,
        playMode: 'HANDICAP',
      });

      expect(result.me.playingHandicap).toBe(31);
      expect(result.rival.playingHandicap).toBe(27);
      expect(holesWithStrokes(result.rival)).toEqual([]);
      expect(totalStrokes(result.me)).toBe(4);
    });

    it('no da golpes a nadie si los dos tienen el mismo hándicap de juego', () => {
      const result = MatchPlayStrokeAllocator.allocate({
        participants: [player('a', 18.0), player('b', 18.0)],
        holes: meisHoles(),
        tees: MEIS_TEES,
        matchFormat: 'SINGLES',
        allowancePercentage: 100,
        playMode: 'HANDICAP',
      });

      expect(totalStrokes(result.a)).toBe(0);
      expect(totalStrokes(result.b)).toBe(0);
    });
  });

  describe('SCRATCH', () => {
    it.each(['SINGLES', 'FOURBALL', 'FOURSOMES', null])(
      'no reparte nada en formato %s',
      (matchFormat) => {
        const result = MatchPlayStrokeAllocator.allocate({
          participants: [player('a', 5.0, 'MALE', 'A'), player('b', 30.0, 'MALE', 'B')],
          holes: flatHoles(),
          tees: MEIS_TEES,
          matchFormat,
          allowancePercentage: 100,
          playMode: 'SCRATCH',
        });

        expect(totalStrokes(result.a)).toBe(0);
        expect(totalStrokes(result.b)).toBe(0);
        expect(result.a.playingHandicap).toBe(0);
      }
    );
  });

  describe('Partido libre', () => {
    it('da a cada uno su hándicap de juego entero', () => {
      const result = MatchPlayStrokeAllocator.allocate({
        participants: [player('a', 18.0), player('b', 20.7)],
        holes: meisHoles(),
        tees: MEIS_TEES,
        matchFormat: null,
        allowancePercentage: 100,
        playMode: 'HANDICAP',
      });

      expect(totalStrokes(result.a)).toBe(23);
      expect(totalStrokes(result.b)).toBe(27);
    });

    it('aplica el allowance', () => {
      const result = MatchPlayStrokeAllocator.allocate({
        participants: [player('a', 18.0)],
        holes: flatHoles(),
        tees: MEIS_TEES,
        matchFormat: null,
        allowancePercentage: 95,
        playMode: 'HANDICAP',
      });

      // CH 23.40 x 0.95 = 22.23 -> 22
      expect(result.a.playingHandicap).toBe(22);
    });
  });

  describe('Datos incompletos', () => {
    it('trata como scratch a quien no tiene hándicap', () => {
      const result = MatchPlayStrokeAllocator.allocate({
        participants: [player('a', 18.0), player('b', null)],
        holes: flatHoles(),
        tees: MEIS_TEES,
        matchFormat: 'SINGLES',
        allowancePercentage: 100,
        playMode: 'HANDICAP',
      });

      expect(result.b.playingHandicap).toBe(0);
      expect(totalStrokes(result.a)).toBe(23);
    });

    it('usa el hándicap índice cuando no encuentra la barra', () => {
      const result = MatchPlayStrokeAllocator.allocate({
        participants: [player('a', 18.0), player('b', 20.7)],
        holes: flatHoles(),
        tees: [],
        matchFormat: 'SINGLES',
        allowancePercentage: 100,
        playMode: 'HANDICAP',
      });

      expect(result.a.playingHandicap).toBe(18);
      expect(result.b.playingHandicap).toBe(21);
      expect(totalStrokes(result.b)).toBe(3);
    });

    it('no reparte nada si el 1 vs 1 está a medio montar', () => {
      const result = MatchPlayStrokeAllocator.allocate({
        participants: [player('a', 18.0)],
        holes: flatHoles(),
        tees: MEIS_TEES,
        matchFormat: 'SINGLES',
        allowancePercentage: 100,
        playMode: 'HANDICAP',
      });

      expect(totalStrokes(result.a)).toBe(0);
    });
  });

  describe('FOURSOMES', () => {
    it('da el mismo reparto a los dos jugadores del equipo', () => {
      const result = MatchPlayStrokeAllocator.allocate({
        participants: [
          player('a1', 10.0, 'MALE', 'A'),
          player('a2', 12.0, 'MALE', 'A'),
          player('b1', 20.0, 'MALE', 'B'),
          player('b2', 24.0, 'MALE', 'B'),
        ],
        holes: flatHoles(),
        tees: MEIS_TEES,
        matchFormat: 'FOURSOMES',
        allowancePercentage: 50,
        playMode: 'HANDICAP',
      });

      expect(result.a1.strokesByHole).toEqual(result.a2.strokesByHole);
      expect(result.b1.strokesByHole).toEqual(result.b2.strokesByHole);
      // Solo recibe el equipo de mayor CH promedio
      expect(totalStrokes(result.a1)).toBe(0);
      expect(totalStrokes(result.b1)).toBeGreaterThan(0);
    });
  });

  describe('FOURBALL', () => {
    it('deja off scratch al de menor course handicap', () => {
      const result = MatchPlayStrokeAllocator.allocate({
        participants: [
          player('a1', 5.0, 'MALE', 'A'),
          player('a2', 15.0, 'MALE', 'A'),
          player('b1', 20.0, 'MALE', 'B'),
          player('b2', 25.0, 'MALE', 'B'),
        ],
        holes: flatHoles(),
        tees: MEIS_TEES,
        matchFormat: 'FOURBALL',
        allowancePercentage: 90,
        playMode: 'HANDICAP',
      });

      expect(totalStrokes(result.a1)).toBe(0);
      const counts = ['a1', 'a2', 'b1', 'b2'].map((id) => totalStrokes(result[id]));
      expect(counts).toEqual([...counts].sort((a, b) => a - b));
    });
  });

  describe('Hándicap plus (Regla WHS 8.2)', () => {
    // Campo neutro: slope 113 y CR = par, para que el PH sea el HI exacto
    const neutralTees = [
      { color: 'YELLOW', gender: 'MALE', courseRating: 72, slopeRating: 113 },
    ];
    const par72Holes = () =>
      Array.from({ length: 18 }, (_, i) => ({ holeNumber: i + 1, par: 4, strokeIndex: i + 1 }));

    it('cede golpes al campo en partido libre, empezando por el hoyo más fácil', () => {
      const result = MatchPlayStrokeAllocator.allocate({
        participants: [player('plus', -2.0)],
        holes: par72Holes(),
        tees: neutralTees,
        matchFormat: null,
        allowancePercentage: 100,
        playMode: 'HANDICAP',
      });

      expect(result.plus.playingHandicap).toBe(-2);
      expect(result.plus.strokesByHole).toEqual({ 17: -1, 18: -1 });
      expect(totalStrokes(result.plus)).toBe(-2);
    });

    it('en match play juega off scratch y el rival recibe la diferencia entera', () => {
      const result = MatchPlayStrokeAllocator.allocate({
        participants: [player('plus', -2.0), player('high', 20.0)],
        holes: par72Holes(),
        tees: neutralTees,
        matchFormat: 'SINGLES',
        allowancePercentage: 100,
        playMode: 'HANDICAP',
      });

      expect(result.plus.playingHandicap).toBe(0);
      expect(result.high.playingHandicap).toBe(20);
      expect(totalStrokes(result.plus)).toBe(0);
      expect(totalStrokes(result.high)).toBe(20);
    });
  });

  describe('Barras no valorables', () => {
    // El backend descarta las barras fuera del rango WHS y hace jugar con el
    // Handicap Index. Si aquí se aceptasen, el reparto cambiaría al caerse la
    // red — justo cuando este cálculo tiene que servir.
    it('descarta un pitch & putt fuera del rango de slope del backend', () => {
      const pitchAndPutt = Array.from({ length: 18 }, (_, i) => ({
        holeNumber: i + 1,
        par: 3,
        strokeIndex: i + 1,
      }));
      const tees = [{ color: 'YELLOW', gender: 'MALE', courseRating: 46.8, slopeRating: 47 }];

      const result = MatchPlayStrokeAllocator.allocate({
        participants: [player('a', 18.0)],
        holes: pitchAndPutt,
        tees,
        matchFormat: null,
        allowancePercentage: 100,
        playMode: 'HANDICAP',
      });

      // Handicap Index a pelo (18), no el 0 que saldría de valorar esa barra
      expect(result.a.playingHandicap).toBe(18);
    });

    it('acepta una barra dentro del rango', () => {
      expect(
        MatchPlayStrokeAllocator.isRatable({ courseRating: 73.1, slopeRating: 140 }, 72)
      ).toBe(true);
    });

    it('rechaza un par fuera del rango WHS', () => {
      expect(
        MatchPlayStrokeAllocator.isRatable({ courseRating: 73.1, slopeRating: 140 }, 54)
      ).toBe(false);
    });
  });

  describe('Orden de dificultad', () => {
    it('reparte por el orden de stroke index, no por su valor en bruto', () => {
      // Tarjeta importada con stroke index no consecutivos: el backend recorre
      // los hoyos ya ordenados y usa la posición, así que aquí igual
      const holes = [
        { holeNumber: 1, par: 4, strokeIndex: 40 },
        { holeNumber: 2, par: 4, strokeIndex: 3 },
        { holeNumber: 3, par: 4, strokeIndex: 21 },
      ];

      const result = MatchPlayStrokeAllocator.allocate({
        participants: [player('a', 18.0)],
        holes,
        tees: [],
        matchFormat: null,
        allowancePercentage: 100,
        playMode: 'HANDICAP',
      });

      // PH 18: los tres hoyos llevan golpe, y el más difícil es el 2 (SI 3)
      expect(result.a.strokesByHole).toEqual({ 1: 1, 2: 1, 3: 1 });
    });
  });

  describe('Hándicap de juego que se enseña', () => {
    it('en fourball enseña el hándicap de juego, no la diferencia repartida', () => {
      const players = [
        player('a1', 5.0, 'MALE', 'A'),
        player('a2', 15.0, 'MALE', 'A'),
        player('b1', 20.0, 'MALE', 'B'),
        player('b2', 25.0, 'MALE', 'B'),
      ];

      const result = MatchPlayStrokeAllocator.allocate({
        participants: players,
        holes: flatHoles(),
        tees: MEIS_TEES,
        matchFormat: 'FOURBALL',
        allowancePercentage: 90,
        playMode: 'HANDICAP',
      });

      // El de 25 recibe menos golpes de los que dice su hándicap de juego: los
      // golpes son la diferencia respecto al mejor, el hándicap es suyo
      const worst = result.b2;
      expect(worst.playingHandicap).toBeGreaterThan(totalStrokes(worst));
      // Y el de menor hándicap juega off scratch pero conserva el suyo
      expect(totalStrokes(result.a1)).toBe(0);
      expect(result.a1.playingHandicap).toBeGreaterThan(0);
    });
  });

  describe('resolve', () => {
    it('prefiere el reparto del backend cuando llega', () => {
      const result = MatchPlayStrokeAllocator.resolve({
        participantStrokes: [
          { participantId: 'a', playingHandicap: 27, strokesByHole: { 2: 1 } },
        ],
        participants: [player('a', 18.0)],
        holes: flatHoles(),
        tees: MEIS_TEES,
        matchFormat: null,
        allowancePercentage: 100,
        playMode: 'HANDICAP',
      });

      expect(result.a).toEqual({ playingHandicap: 27, strokesByHole: { 2: 1 } });
    });

    it('recalcula en local cuando no llega nada (sin conexión)', () => {
      const result = MatchPlayStrokeAllocator.resolve({
        participantStrokes: [],
        participants: [player('a', 18.0)],
        holes: meisHoles(),
        tees: MEIS_TEES,
        matchFormat: null,
        allowancePercentage: 100,
        playMode: 'HANDICAP',
      });

      expect(result.a.playingHandicap).toBe(23);
    });
  });

  describe('parFor', () => {
    it('usa el par propio de la barra cuando la trae', () => {
      const tee = { color: 'YELLOW', gender: 'MALE', holes: [{ par: 3 }, { par: 4 }] };
      expect(MatchPlayStrokeAllocator.parFor(tee, [{ par: 5 }, { par: 5 }])).toBe(7);
    });

    it('cae al par del campo si la barra no trae tarjeta', () => {
      expect(MatchPlayStrokeAllocator.parFor({}, [{ par: 5 }, { par: 5 }])).toBe(10);
    });
  });

  describe('strokesOnHole', () => {
    it('reparte un segundo golpe cuando el hándicap pasa de 18', () => {
      // PH 23: base 1 en todos, y uno extra en los SI 1 a 5
      expect(MatchPlayStrokeAllocator.strokesOnHole(23, 1)).toBe(2);
      expect(MatchPlayStrokeAllocator.strokesOnHole(23, 5)).toBe(2);
      expect(MatchPlayStrokeAllocator.strokesOnHole(23, 6)).toBe(1);
      expect(MatchPlayStrokeAllocator.strokesOnHole(23, 18)).toBe(1);
    });

    it('no reparte nada con hándicap de juego cero', () => {
      expect(MatchPlayStrokeAllocator.strokesOnHole(0, 1)).toBe(0);
    });

    it('cede desde el hoyo más fácil hacia atrás con hándicap plus', () => {
      expect(MatchPlayStrokeAllocator.strokesOnHole(-2, 18)).toBe(-1);
      expect(MatchPlayStrokeAllocator.strokesOnHole(-2, 17)).toBe(-1);
      expect(MatchPlayStrokeAllocator.strokesOnHole(-2, 16)).toBe(0);
      expect(MatchPlayStrokeAllocator.strokesOnHole(-2, 1)).toBe(0);
    });
  });

  describe('findTee', () => {
    it('distingue la misma barra por género', () => {
      const male = MatchPlayStrokeAllocator.findTee(player('a', 18, 'MALE'), MEIS_TEES);
      const female = MatchPlayStrokeAllocator.findTee(player('a', 18, 'FEMALE'), MEIS_TEES);

      expect(male.courseRating).toBe(73.1);
      expect(female.courseRating).toBe(79.4);
    });

    it('devuelve null si el participante no eligió barra', () => {
      expect(MatchPlayStrokeAllocator.findTee({ color: null }, MEIS_TEES)).toBeNull();
    });
  });
});
