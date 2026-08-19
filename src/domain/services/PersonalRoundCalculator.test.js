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

  describe('el par, contra la tarjeta de su barra', () => {
    /**
     * Este número se contaba contra la tarjeta del campo —la de la PRIMERA
     * barra— porque era la que usaba el ranking de la clasificación, que va
     * justo encima. Desde RyderCupWeb#417 la resolución vive en
     * `computeParticipantTotals`, del que comen las tres superficies, así que
     * ya se puede contar por barra sin que la pantalla se contradiga: es lo que
     * hace el backend (`GolfCourse.hole_card_for`) y por tanto lo que dice el
     * historial de la misma vuelta.
     */
    it('cuenta el par de su barra, no el del campo', () => {
      const result = PersonalRoundCalculator.compute({
        me: { participantId: 'p-1', name: 'Alice', handicap: 0, color: 'RED', teeGender: 'FEMALE' },
        participants: [{ participantId: 'p-1', name: 'Alice', handicap: 0, color: 'RED', teeGender: 'FEMALE' }],
        holes: [{ holeNumber: 1, par: 4, strokeIndex: 5 }],
        holeScores: [{ holeNumber: 1, participantId: 'p-1', score: 5 }],
        tees: [{ color: 'RED', gender: 'FEMALE', holes: [{ holeNumber: 1, par: 5, strokeIndex: 5 }] }],
        matchFormat: null,
        allowancePercentage: 100,
      });

      // Su barra dice par 5 y ahí hizo 5: PAR. Contra el par 4 del campo, que
      // es el que se contaba antes, salía +1
      expect(result.personalToPar).toBe('PAR');
    });
  });

  describe('cuándo no hay vuelta que enseñar', () => {
    /**
     * En foursomes la pareja juega una sola bola a golpes alternos: lo anotado
     * es del equipo, no la vuelta de nadie. Los golpes brutos sí son del
     * equipo, y el historial los pinta: devolver null a secas dejaba esa
     * tarjeta entera en blanco.
     */
    it('no da ninguna de las dos lecturas en foursomes, pero sí los golpes del equipo', () => {
      const result = compute({ matchFormat: 'FOURSOMES' });

      expect(result.personalToPar).toBeNull();
      expect(result.matchToPar).toBeNull();
      expect(result.totalStrokes).toBe(6);
    });

    it('no da nada en foursomes sin ningún hoyo anotado', () => {
      expect(compute({ matchFormat: 'FOURSOMES', holeScores: [] })).toBeNull();
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

describe('PersonalRoundCalculator · los golpes del bando en foursomes', () => {
  const partner = { participantId: 'p-3', name: 'Carol', handicap: 8, team: 'A' };
  const teamMe = { ...me, team: 'A' };
  const teamRival = { ...rival, team: 'B' };

  const computeFoursomes = (holeScores, participants = [teamMe, partner, teamRival]) =>
    PersonalRoundCalculator.compute({
      me: teamMe,
      participants,
      holes,
      holeScores,
      tees: [],
      participantStrokes: [],
      matchFormat: 'FOURSOMES',
      allowancePercentage: 50,
      playMode: 'HANDICAP',
    });

  /**
   * Como se juega de verdad: una bola por bando y cada hoyo a nombre de quien
   * golpeó. Contando solo los del jugador que mira la pantalla, el hoyo del
   * compañero se perdía y el total salía a la mitad.
   */
  it('suma los hoyos que anotó el compañero', () => {
    const result = computeFoursomes([
      { holeNumber: 1, participantId: 'p-1', score: 4 },
      { holeNumber: 2, participantId: 'p-3', score: 3 },
    ]);

    expect(result.totalStrokes).toBe(7);
  });

  /**
   * Antes de la casilla única los dos compañeros anotaban el MISMO golpe.
   * Sumarlos duplicaría el total de una vuelta ya jugada.
   */
  it('no duplica cuando los dos anotaron el mismo hoyo', () => {
    const result = computeFoursomes([
      { holeNumber: 1, participantId: 'p-1', score: 4 },
      { holeNumber: 1, participantId: 'p-3', score: 4 },
      { holeNumber: 2, participantId: 'p-1', score: 3 },
      { holeNumber: 2, participantId: 'p-3', score: 3 },
    ]);

    expect(result.totalStrokes).toBe(7);
  });

  /**
   * Con anotación cruzada los dos bandos pueden escribir la misma bola. Si no
   * coinciden se aclara entre las parejas, pero mientras tanto este total y la
   * tarjeta tienen que enseñar el mismo número: el del primero del bando.
   */
  it('toma la misma nota que la tarjeta cuando las dos anotaciones difieren', () => {
    const result = computeFoursomes([
      { holeNumber: 1, participantId: 'p-3', score: 6 },
      { holeNumber: 1, participantId: 'p-1', score: 4 },
    ]);

    expect(result.totalStrokes).toBe(4);
  });

  it('ignora los golpes del bando rival', () => {
    const result = computeFoursomes([
      { holeNumber: 1, participantId: 'p-1', score: 4 },
      { holeNumber: 1, participantId: 'p-2', score: 6 },
      { holeNumber: 2, participantId: 'p-2', score: 6 },
    ]);

    expect(result.totalStrokes).toBe(4);
  });

  /** Sin `team` no se puede saber el bando: se cuenta solo lo propio. */
  it('cuenta solo lo propio cuando no hay bando', () => {
    const result = PersonalRoundCalculator.compute({
      me,
      participants: [me, rival],
      holes,
      holeScores: [
        { holeNumber: 1, participantId: 'p-1', score: 4 },
        { holeNumber: 2, participantId: 'p-3', score: 3 },
      ],
      tees: [],
      participantStrokes: [],
      matchFormat: 'FOURSOMES',
      allowancePercentage: 50,
      playMode: 'HANDICAP',
    });

    expect(result.totalStrokes).toBe(4);
  });

  it('sigue sin dar vuelta propia', () => {
    const result = computeFoursomes([{ holeNumber: 1, participantId: 'p-3', score: 5 }]);

    expect(result.personalToPar).toBeNull();
    expect(result.matchToPar).toBeNull();
    expect(result.totalStrokes).toBe(5);
  });
});
