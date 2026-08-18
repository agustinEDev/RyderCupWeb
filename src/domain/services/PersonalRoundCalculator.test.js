import { describe, it, expect } from 'vitest';
import PersonalRoundCalculator from './PersonalRoundCalculator';

const holes = [
  { holeNumber: 1, par: 4, strokeIndex: 5 },
  { holeNumber: 2, par: 3, strokeIndex: 15 },
];

const me = { participantId: 'p-1', name: 'Alice', handicap: 2 };
const rival = { participantId: 'p-2', name: 'Bob', handicap: 12 };

const scores = [
  { holeNumber: 1, participantId: 'p-1', score: 4 },
  { holeNumber: 2, participantId: 'p-1', score: 2 },
];

const compute = (overrides = {}) =>
  PersonalRoundCalculator.compute({
    me,
    participants: [me, rival],
    holes,
    holeScores: scores,
    tees: [],
    participantStrokes: [],
    matchFormat: 'SINGLES',
    allowancePercentage: 100,
    playMode: 'HANDICAP',
    ...overrides,
  });

describe('PersonalRoundCalculator', () => {
  describe('las dos lecturas de una vuelta', () => {
    /**
     * En match play los golpes se dan por DIFERENCIA, así que al de hándicap
     * más bajo no le toca ninguno y su vuelta saldría a bruto. Con su hándicap
     * de juego entero sí cuentan: son dos números distintos y los dos ciertos.
     */
    it('da la vuelta personal y la del partido cuando el reparto difiere', () => {
      const result = compute({
        participantStrokes: [
          { participantId: 'p-1', playingHandicap: 2, strokesByHole: {} },
          { participantId: 'p-2', playingHandicap: 12, strokesByHole: { 1: 1, 2: 1 } },
        ],
      });

      expect(result.personalToPar).toBe('-3');
      expect(result.matchToPar).toBe('-1');
    });

    it('deja la del partido en null cuando coincide con la personal', () => {
      const result = compute({
        participantStrokes: [
          { participantId: 'p-1', playingHandicap: 2, strokesByHole: { 1: 1, 2: 1 } },
          { participantId: 'p-2', playingHandicap: 12, strokesByHole: { 1: 1, 2: 1 } },
        ],
      });

      expect(result.personalToPar).toBe('-3');
      expect(result.matchToPar).toBeNull();
    });

    /**
     * El allowance del backend en juego libre es el 95% (FREE_PLAY_ALLOWANCE),
     * no el 100%: sin la segunda lectura, el historial y la clasificación
     * daban dos resultados para la misma vuelta sin decir por qué.
     */
    it('usa el reparto que mandó el backend para la del partido, no lo recalcula', () => {
      const result = compute({
        matchFormat: null,
        allowancePercentage: 95,
        participantStrokes: [{ participantId: 'p-1', playingHandicap: 1, strokesByHole: { 1: 1 } }],
      });

      // Con los golpes del backend: netos 3 y 2 sobre par jugado 7
      expect(result.matchToPar).toBe('-2');
    });

    it('devuelve también los golpes brutos, que el historial pinta debajo', () => {
      expect(compute().totalStrokes).toBe(6);
    });
  });

  describe('el par, contra la tarjeta del campo', () => {
    /**
     * DELIBERADO, y pendiente de RyderCupWeb#417: el par se cuenta contra la
     * tarjeta del campo —la de la PRIMERA barra— porque es la que usa el
     * ranking de la clasificación, que va justo encima de este número. En 25 de
     * los 800 campos federados el par cambia entre barras, así que para esos
     * jugadores el resultado sale desviado esa diferencia; contarlo aquí por
     * barra y en la tabla por campo ponía dos números distintos para la misma
     * vuelta en la misma pantalla, que es peor. Se arregla en las tres
     * superficies a la vez, y entonces este test debe cambiar.
     */
    it('cuenta el par del campo aunque su barra tenga otro, como el ranking', () => {
      const result = PersonalRoundCalculator.compute({
        me: { participantId: 'p-1', name: 'Alice', handicap: 0, color: 'RED', teeGender: 'FEMALE' },
        participants: [{ participantId: 'p-1', name: 'Alice', handicap: 0, color: 'RED', teeGender: 'FEMALE' }],
        holes: [{ holeNumber: 1, par: 4, strokeIndex: 5 }],
        holeScores: [{ holeNumber: 1, participantId: 'p-1', score: 5 }],
        tees: [{ color: 'RED', gender: 'FEMALE', holes: [{ holeNumber: 1, par: 5, strokeIndex: 5 }] }],
        matchFormat: null,
        allowancePercentage: 100,
      });

      // Su barra dice par 5, pero se cuenta contra el par 4 del campo: +1.
      // Cuando se arregle la #417 esto pasará a ser PAR.
      expect(result.personalToPar).toBe('+1');
    });
  });

  describe('cuándo no hay vuelta que enseñar', () => {
    /**
     * En foursomes la pareja juega una sola bola a golpes alternos: lo anotado
     * es del equipo, no la vuelta de nadie.
     */
    it('no da vuelta en foursomes', () => {
      expect(compute({ matchFormat: 'FOURSOMES' })).toBeNull();
    });

    it('no da vuelta sin participante', () => {
      expect(compute({ me: null })).toBeNull();
    });

    it('no da vuelta sin ningún hoyo anotado', () => {
      expect(compute({ holeScores: [] })).toBeNull();
    });
  });

  describe('a bruto', () => {
    it('no reparte ningún golpe en SCRATCH', () => {
      const result = compute({ playMode: 'SCRATCH', participantStrokes: [] });

      // 6 golpes sobre un par jugado de 7, sin descontar nada
      expect(result.personalToPar).toBe('-1');
      expect(result.matchToPar).toBeNull();
    });
  });
});
