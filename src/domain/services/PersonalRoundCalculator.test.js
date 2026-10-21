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

  /**
   * La raya del bando: recogieron la bola. El hoyo esta jugado —el resultado
   * del partido lo cuenta como cualquier otro—, asi que aqui tambien, con su
   * doble bogey bruto. Dejandolo fuera, el total salia de menos hoyos de los
   * que el propio partido dice que se jugaron.
   *
   * Misma cuenta que `_foursomes_side_strokes` en el backend.
   */
  it('cuenta la raya del bando como doble bogey bruto', () => {
    const result = computeFoursomes([
      { holeNumber: 1, participantId: 'p-1', score: 4 },
      { holeNumber: 2, participantId: 'p-3', score: null },
    ]);

    // 4 en el hoyo 1, y el 2 es par 3 recogido -> 5
    expect(result.totalStrokes).toBe(9);
  });

  it('prefiere el numero del companero a la raya del titular', () => {
    // Una bola, dos anotaciones distintas: manda el numero, porque es con el
    // que `_best_ball` adjudica el hoyo. Si aqui contara la raya, los golpes no
    // explicarian el resultado del partido. Es la unica regla de estas dos que
    // NO coincide con la de la tarjeta, que pinta la del primero del bando.
    const result = computeFoursomes([
      { holeNumber: 1, participantId: 'p-1', score: null },
      { holeNumber: 1, participantId: 'p-3', score: 5 },
    ]);

    expect(result.totalStrokes).toBe(5);
  });

  it('sigue sin contar el hoyo que nadie anoto', () => {
    // Solo el hoyo 1 tiene anotacion (una raya, par 4 -> 6); el 2 no existe.
    const result = computeFoursomes([{ holeNumber: 1, participantId: 'p-1', score: null }]);

    expect(result.totalStrokes).toBe(6);
  });
});

/**
 * «Tu vuelta» mientras se anota (21 oct): el acumulado neto contra el par con
 * el hándicap de juego PROPIO —el «Hcp de juego» de la tarjeta: su hándicap
 * con el allowance del formato—, repartido por SUS índices. Nunca la
 * diferencia del match play.
 *
 *   N3  hándicap de juego propio x allowance        | R1, R2, R3, R4, R5
 *   N4  Stableford: neto y puntos                   | R6, R7
 *   N5  foursomes: nada                             | R8
 *   N6  SCRATCH: contra el par                      | R9
 *   N7  solo los hoyos anotados                     | R10
 *   N8  la raya, doble bogey neto                   | R11
 *   N9  sin hoyos anotados: sin resultado           | R12
 *       hándicap plus devuelve golpes               | R13
 *       sin jugador no hay vuelta                   | R14
 *       los índices de SU barra                     | R15
 */
describe('PersonalRoundCalculator.runningResult · «Tu vuelta» al anotar', () => {
  const running = (overrides = {}) =>
    PersonalRoundCalculator.runningResult({
      me,
      participants: [me, rival],
      holes,
      holeScores: scores,
      tees: [],
      participantStrokes: [],
      matchFormat: null,
      scoringFormat: 'MEDAL',
      allowancePercentage: 100,
      playMode: 'HANDICAP',
      ...overrides,
    });

  it('R1: aplica el allowance del formato al hándicap propio', () => {
    // Hcp 2 al 50% = 1 golpe, en el hoyo más difícil: netos 3 y 2 sobre par 7
    const result = running({ allowancePercentage: 50 });

    expect(result.toParLabel).toBe('-2');
    expect(result.toPar).toBe(-2);
    expect(result.holesPlayed).toBe(2);
  });

  it('R2: al 100% recibe su hándicap entero', () => {
    // Netos 3 y 1 sobre par 7
    expect(running().toParLabel).toBe('-3');
  });

  it('R3: en match play el de menos hándicap recibe SUS golpes, no la diferencia', () => {
    // El backend le da 0 golpes de reparto (la diferencia es del rival), pero
    // su hándicap de juego es 2: la vuelta cuenta con esos 2
    const result = running({
      matchFormat: 'SINGLES',
      scoringFormat: null,
      participantStrokes: [
        { participantId: 'p-1', playingHandicap: 2, strokesByHole: {} },
        { participantId: 'p-2', playingHandicap: 12, strokesByHole: { 1: 1, 2: 1 } },
      ],
    });

    expect(result.toParLabel).toBe('-3');
  });

  it('R4: usa el hándicap de juego que enseña la tarjeta (el del backend)', () => {
    // Localmente saldría 2; el backend guardó 1, que es el que pinta la tarjeta
    const result = running({
      matchFormat: 'FOURBALL',
      scoringFormat: null,
      participantStrokes: [
        { participantId: 'p-1', playingHandicap: 1, strokesByHole: {} },
        { participantId: 'p-2', playingHandicap: 12, strokesByHole: { 1: 1 } },
      ],
    });

    expect(result.toParLabel).toBe('-2');
  });

  it('R5: sin reparto del backend lo calcula con su hándicap y el allowance', () => {
    const result = running({ matchFormat: 'SINGLES', scoringFormat: null, allowancePercentage: null });

    // Sin allowance conocido, el 100%: 2 golpes
    expect(result.toParLabel).toBe('-3');
  });

  it('R6: en Stableford da también los puntos acumulados', () => {
    // Netos 3 (par 4) y 1 (par 3): 3 + 4 puntos
    const result = running({ scoringFormat: 'STABLEFORD' });

    expect(result.stablefordPoints).toBe(7);
    expect(result.toParLabel).toBe('-3');
  });

  it('R7: fuera de Stableford no hay puntos', () => {
    expect(running().stablefordPoints).toBeNull();
    expect(running({ matchFormat: 'SINGLES', scoringFormat: null }).stablefordPoints).toBeNull();
  });

  it('R8: en foursomes no hay vuelta propia', () => {
    expect(running({ matchFormat: 'FOURSOMES', scoringFormat: null })).toBeNull();
  });

  it('R9: en SCRATCH no recibe golpes y se mide contra el par', () => {
    const result = running({
      playMode: 'SCRATCH',
      participantStrokes: [{ participantId: 'p-1', playingHandicap: 2, strokesByHole: { 1: 1, 2: 1 } }],
    });

    // Brutos 4 y 2 sobre par 7
    expect(result.toParLabel).toBe('-1');
  });

  it('R10: cuenta solo los hoyos anotados', () => {
    const result = running({ holeScores: [scores[0]] });

    // Hoyo 1: 4 golpes, recibe 1 → neto 3 sobre par 4
    expect(result.toParLabel).toBe('-1');
    expect(result.holesPlayed).toBe(1);
  });

  it('R11: la raya cuenta como doble bogey neto', () => {
    const result = running({
      holeScores: [scores[0], { holeNumber: 2, participantId: 'p-1', score: null }],
    });

    // Neto 3 + raya 5 sobre par 7
    expect(result.toParLabel).toBe('+1');
  });

  it('R12: sin hoyos anotados no hay resultado todavía', () => {
    const result = running({ holeScores: [] });

    expect(result.toParLabel).toBeNull();
    expect(result.toPar).toBeNull();
    expect(result.holesPlayed).toBe(0);
  });

  it('R13: un hándicap plus devuelve golpes en los hoyos más fáciles', () => {
    const card = Array.from({ length: 18 }, (_, i) => ({
      holeNumber: i + 1,
      par: 4,
      strokeIndex: i + 1,
    }));
    const plus = { participantId: 'p-1', name: 'Alice', handicap: -1 };
    const result = running({
      me: plus,
      participants: [plus, rival],
      holes: card,
      holeScores: [{ holeNumber: 18, participantId: 'p-1', score: 4 }],
    });

    // Cede el golpe en el índice 18: 4 brutos son 5 netos
    expect(result.toParLabel).toBe('+1');
  });

  it('R15: reparte por los índices de SU barra, no los del campo', () => {
    // Su barra invierte la dificultad: el hoyo 2 es el más difícil
    const yellow = { ...me, color: 'Amarillas', teeGender: 'MALE' };
    const tees = [
      {
        color: 'Amarillas',
        gender: 'MALE',
        holes: [
          { holeNumber: 1, par: 4, strokeIndex: 15 },
          { holeNumber: 2, par: 3, strokeIndex: 5 },
        ],
      },
    ];
    const result = running({
      me: yellow,
      participants: [yellow, rival],
      tees,
      allowancePercentage: 50,
      holeScores: [scores[1]],
    });

    // Hcp 2 al 50% = 1 golpe, en el hoyo 2: 2 golpes, neto 1 sobre par 3
    expect(result.toParLabel).toBe('-2');
  });

  it('R14: sin jugador no hay vuelta', () => {
    expect(running({ me: null })).toBeNull();
  });

  it('R14b: lo que llega undefined toma su valor por defecto, como un parámetro', () => {
    const result = PersonalRoundCalculator.runningResult({
      me,
      participants: undefined,
      holes,
      holeScores: undefined,
      tees: undefined,
      participantStrokes: undefined,
      playMode: undefined,
    });

    expect(result).toEqual({ toPar: null, toParLabel: null, stablefordPoints: null, holesPlayed: 0 });
    expect(
      PersonalRoundCalculator.compute({ me, holes, holeScores: scores, tees: undefined, participants: undefined })
    ).not.toBeNull();
  });

  // Revisión final del 21 oct. Una tarjeta de 18 hoyos de par 4 con índices
  // 1..18 y un hándicap 20: cada golpe de diferencia en el hándicap de juego se
  // ve en el resultado, así que el 95%, el 90% y el 100% dan números distintos
  describe('el hándicap de juego que falta', () => {
    const card = Array.from({ length: 18 }, (_, i) => ({
      holeNumber: i + 1,
      par: 4,
      strokeIndex: i + 1,
    }));
    const alto = { participantId: 'p-1', name: 'Alice', handicap: 20 };
    const todos = card.map((h) => ({ holeNumber: h.holeNumber, participantId: 'p-1', score: 4 }));
    const deAlto = (overrides = {}) =>
      running({ me: alto, participants: [alto, rival], holes: card, holeScores: todos, ...overrides });

    it('R16: si el reparto del backend no trae a quien anota, usa su hándicap local, no 0', () => {
      const result = deAlto({
        matchFormat: 'SINGLES',
        scoringFormat: null,
        allowancePercentage: 100,
        participantStrokes: [{ participantId: 'p-2', playingHandicap: 12, strokesByHole: {} }],
      });

      // Hcp 20 al 100% = 20 golpes: 72 brutos son 52 netos sobre par 72
      expect(result.toPar).toBe(-20);
    });

    it('R16b: y con el allowance del partido (fourball al 90%)', () => {
      const result = deAlto({
        matchFormat: 'FOURBALL',
        scoringFormat: null,
        allowancePercentage: 90,
        participantStrokes: [{ participantId: 'p-2', playingHandicap: 12, strokesByHole: {} }],
      });

      expect(result.toPar).toBe(-18);
    });

    it('R17: sin allowance, el de partido libre es el 95% del formato, no el 100%', () => {
      const result = deAlto({ matchFormat: null, scoringFormat: 'STABLEFORD', allowancePercentage: null });

      // 20 al 95% = 19
      expect(result.toPar).toBe(-19);
    });

    it('R17b: sin allowance en fourball, su 90%', () => {
      const result = deAlto({
        matchFormat: 'FOURBALL',
        scoringFormat: null,
        allowancePercentage: undefined,
        participantStrokes: [{ participantId: 'p-2', playingHandicap: 12, strokesByHole: {} }],
      });

      expect(result.toPar).toBe(-18);
    });

    it('R17c: sin allowance en singles, su 100%', () => {
      const result = deAlto({
        matchFormat: 'SINGLES',
        scoringFormat: null,
        allowancePercentage: null,
        participantStrokes: [{ participantId: 'p-2', playingHandicap: 12, strokesByHole: {} }],
      });

      expect(result.toPar).toBe(-20);
    });

    it('R17d: un allowance explícito manda sobre el del formato', () => {
      expect(deAlto({ matchFormat: null, allowancePercentage: 100 }).toPar).toBe(-20);
    });
  });
});
