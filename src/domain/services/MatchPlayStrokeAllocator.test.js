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
