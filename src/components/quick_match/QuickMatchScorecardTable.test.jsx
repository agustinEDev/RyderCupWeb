import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import QuickMatchScorecardTable from './QuickMatchScorecardTable';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => (opts ? `${key} ${JSON.stringify(opts)}` : key),
    i18n: { language: 'en' },
  }),
}));

const holes = [
  { holeNumber: 1, par: 4, strokeIndex: 5 },
  { holeNumber: 2, par: 3, strokeIndex: 15 },
];

const participants = [
  { participantId: 'p-1', name: 'Alice', handicap: 0, team: null, isGuest: false },
  { participantId: 'p-2', name: 'Bob', handicap: 0, team: null, isGuest: false },
];

describe('QuickMatchScorecardTable', () => {
  it('should render the hole-by-hole grid with GolfFigure scores', () => {
    const holeScores = [{ holeNumber: 1, participantId: 'p-1', score: 4 }];

    render(
      <QuickMatchScorecardTable holes={holes} holeScores={holeScores} participants={participants} currentParticipantId="p-1" />
    );

    expect(screen.getByTestId('quick-match-scorecard-table')).toBeInTheDocument();
    expect(screen.getAllByTestId('golf-figure').length).toBeGreaterThan(0);
  });

  it('should not render a classification table anymore (moved to its own tab)', () => {
    render(
      <QuickMatchScorecardTable holes={holes} holeScores={[]} participants={participants} currentParticipantId="p-1" />
    );

    expect(screen.queryByTestId('quick-match-classification-table')).not.toBeInTheDocument();
  });

  it('should mark a hole with a stroke dot when the participant receives a stroke there', () => {
    // handicap 18 -> exactly 1 stroke on every hole (mirrors StablefordCalculator's own test fixture)
    const highHandicapParticipants = [
      { participantId: 'p-1', name: 'Alice', handicap: 18, team: null, isGuest: false },
    ];
    const holeScores = [{ holeNumber: 1, participantId: 'p-1', score: 5 }];

    render(
      <QuickMatchScorecardTable
        holes={holes}
        holeScores={holeScores}
        participants={highHandicapParticipants}
        currentParticipantId="p-1"
      />
    );

    expect(screen.getAllByTestId('stroke-dots').length).toBeGreaterThan(0);
  });

  it('should not mark a stroke dot for a scratch (0 handicap) participant', () => {
    const scratchParticipants = [
      { participantId: 'p-1', name: 'Alice', handicap: 0, team: null, isGuest: false },
    ];
    const holeScores = [{ holeNumber: 1, participantId: 'p-1', score: 5 }];

    render(
      <QuickMatchScorecardTable
        holes={holes}
        holeScores={holeScores}
        participants={scratchParticipants}
        currentParticipantId="p-1"
      />
    );

    expect(screen.queryByTestId('stroke-dots')).not.toBeInTheDocument();
  });

  it('should use the Playing Handicap (via tee + allowance) instead of the raw handicap when resolving stroke dots', () => {
    // Campo entero y valorable: con un par de dos hoyos el tee queda fuera del
    // rango WHS y el reparto cae al Handicap Index, que no es lo que se prueba
    const fullHoles = Array.from({ length: 18 }, (_, i) => ({
      holeNumber: i + 1,
      par: 4,
      strokeIndex: i + 1,
    }));
    const participant = [
      { participantId: 'p-1', name: 'Alice', handicap: 18, team: null, isGuest: false, color: 'YELLOW', teeGender: 'MALE' },
    ];
    const tees = [{ color: 'YELLOW', gender: 'MALE', courseRating: 72, slopeRating: 113 }];

    // Con allowance 20% el hándicap de juego baja a 4: solo los cuatro hoyos
    // más difíciles llevan punto, no los 18 que daría el hándicap en bruto
    render(
      <QuickMatchScorecardTable
        holes={fullHoles}
        holeScores={[]}
        participants={participant}
        currentParticipantId="p-1"
        tees={tees}
        allowancePercentage={20}
      />
    );

    expect(screen.getAllByTestId('stroke-dots')).toHaveLength(4);
  });

  it('should render a separate card per participant instead of one shared table', () => {
    const holeScores = [{ holeNumber: 1, participantId: 'p-1', score: 4 }];

    render(
      <QuickMatchScorecardTable holes={holes} holeScores={holeScores} participants={participants} currentParticipantId="p-1" />
    );

    expect(screen.getByTestId('quick-match-player-card-p-1')).toBeInTheDocument();
    expect(screen.getByTestId('quick-match-player-card-p-2')).toBeInTheDocument();
  });

  it('should show Stableford points per hole when scoringFormat is STABLEFORD', () => {
    const holeScores = [{ holeNumber: 1, participantId: 'p-1', score: 4 }];

    render(
      <QuickMatchScorecardTable
        holes={holes}
        holeScores={holeScores}
        participants={participants}
        currentParticipantId="p-1"
        scoringFormat="STABLEFORD"
      />
    );

    expect(screen.getAllByTestId('hole-points').length).toBeGreaterThan(0);
    expect(screen.queryByTestId('hole-net-strokes')).not.toBeInTheDocument();
  });

  it('should show net strokes per hole when scoringFormat is MEDAL', () => {
    const holeScores = [{ holeNumber: 1, participantId: 'p-1', score: 4 }];

    render(
      <QuickMatchScorecardTable
        holes={holes}
        holeScores={holeScores}
        participants={participants}
        currentParticipantId="p-1"
        scoringFormat="MEDAL"
      />
    );

    expect(screen.getAllByTestId('hole-net-strokes').length).toBeGreaterThan(0);
    expect(screen.queryByTestId('hole-points')).not.toBeInTheDocument();
  });

  it('should not show points or net strokes badges for match-play formats', () => {
    const holeScores = [{ holeNumber: 1, participantId: 'p-1', score: 4 }];

    render(
      <QuickMatchScorecardTable holes={holes} holeScores={holeScores} participants={participants} currentParticipantId="p-1" />
    );

    expect(screen.queryByTestId('hole-points')).not.toBeInTheDocument();
    expect(screen.queryByTestId('hole-net-strokes')).not.toBeInTheDocument();
  });
});

describe('QuickMatchScorecardTable - reparto de golpes por formato', () => {
  // Golf de Meis, barras amarillas por género. Los mismos datos que destaparon
  // el fallo: un 18.0 recibía más golpes que un 20.7 porque cada tarjeta
  // repartía el Playing Handicap entero en vez de la diferencia.
  const meisTees = [
    { color: 'YELLOW', gender: 'MALE', courseRating: 73.1, slopeRating: 140 },
    { color: 'YELLOW', gender: 'FEMALE', courseRating: 79.4, slopeRating: 147 },
  ];
  const meisStrokeIndex = [7, 1, 13, 5, 15, 9, 3, 11, 17, 16, 2, 14, 12, 8, 18, 6, 4, 10];
  const meisPars = [4, 5, 4, 4, 3, 4, 5, 4, 3, 3, 4, 5, 4, 4, 3, 4, 5, 4];
  const meisHoles = meisStrokeIndex.map((si, i) => ({
    holeNumber: i + 1,
    par: meisPars[i],
    strokeIndex: si,
  }));

  const singlesParticipants = [
    {
      participantId: 'p-1',
      name: 'Agustin',
      handicap: 18.0,
      color: 'YELLOW',
      teeGender: 'MALE',
      isGuest: false,
    },
    {
      participantId: 'p-2',
      name: 'Alberto',
      handicap: 20.7,
      color: 'YELLOW',
      teeGender: 'MALE',
      isGuest: false,
    },
  ];

  // El fourball que se anotó contra el despliegue local: 18/8 contra 20/28 en
  // Meis amarillas masculinas al 90%. Course handicaps 23/11/26/36, el menor es
  // 11, y el reparto sale (ch - 11) x 90%: 11 / 0 / 14 / 23. Los hándicaps de
  // juego que se ENSEÑAN son otros —21/10/23/32—, y por eso 23 - 10 no da 14.
  const fourballParticipants = [
    { participantId: 'p-1', name: 'Agustin', handicap: 18.0, color: 'YELLOW', teeGender: 'MALE', team: 'A', isGuest: false },
    { participantId: 'p-2', name: 'Companero', handicap: 8.0, color: 'YELLOW', teeGender: 'MALE', team: 'A', isGuest: false },
    { participantId: 'p-3', name: 'RivalUno', handicap: 20.0, color: 'YELLOW', teeGender: 'MALE', team: 'B', isGuest: false },
    { participantId: 'p-4', name: 'RivalDos', handicap: 28.0, color: 'YELLOW', teeGender: 'MALE', team: 'B', isGuest: false },
  ];

  const renderSingles = (props = {}) =>
    render(
      <QuickMatchScorecardTable
        holes={meisHoles}
        holeScores={[]}
        participants={singlesParticipants}
        currentParticipantId="p-1"
        tees={meisTees}
        allowancePercentage={100}
        matchFormat="SINGLES"
        {...props}
      />
    );

  it('en match play solo pinta puntos al de más hándicap', () => {
    const { container } = renderSingles();

    const cards = container.querySelectorAll('[data-testid^="quick-match-player-card-"]');
    const dotsInCard = (card) => card.querySelectorAll('[data-testid="stroke-dots"]').length;

    // El de menos Playing Handicap (18.0 -> 23) juega off scratch
    expect(dotsInCard(cards[0])).toBe(0);
    // El de 20.7 -> 27 recibe la diferencia: 4 golpes
    expect(dotsInCard(cards[1])).toBe(4);
  });

  it('muestra la barra y el hándicap de juego de cada jugador', () => {
    renderSingles();

    // La barra es lo que faltaba: una salida del género equivocado cambia el
    // Playing Handicap varios golpes y no había forma de verlo desde la tarjeta
    expect(screen.getByTestId('quick-match-player-handicap-p-1')).toHaveTextContent('(M)');
    expect(screen.getByTestId('quick-match-player-handicap-p-2')).toHaveTextContent('(M)');
  });

  it('en scratch no pinta ningún punto', () => {
    const { container } = renderSingles({ playMode: 'SCRATCH' });

    expect(container.querySelectorAll('[data-testid="stroke-dots"]').length).toBe(0);
    expect(screen.getByTestId('quick-match-player-handicap-p-1')).toHaveTextContent(
      'scoring.scorecard.scratchMatch'
    );
  });

  it('en partido libre sí reparte el hándicap entero a cada uno', () => {
    const { container } = render(
      <QuickMatchScorecardTable
        holes={meisHoles}
        holeScores={[]}
        participants={singlesParticipants}
        currentParticipantId="p-1"
        tees={meisTees}
        allowancePercentage={100}
        matchFormat={null}
        scoringFormat="STABLEFORD"
      />
    );

    const cards = container.querySelectorAll('[data-testid^="quick-match-player-card-"]');
    // Los dos reciben: aquí el reparto individual es el correcto
    expect(cards[0].querySelectorAll('[data-testid="stroke-dots"]').length).toBe(18);
    expect(cards[1].querySelectorAll('[data-testid="stroke-dots"]').length).toBe(18);
  });

  /**
   * El FOURBALL es el único formato cuyo reparto no se puede leer de la
   * cabecera: sale de los Course Handicaps, que no se enseñan. Con "Hcp de
   * juego 23" y "Hcp de juego 10" delante, un fourball al 90% reparte 14 y la
   * resta da 13.
   */
  it('nombra el allowance en fourball, donde la resta de la cabecera no cuadra', () => {
    render(
      <QuickMatchScorecardTable
        holes={meisHoles}
        holeScores={[]}
        participants={fourballParticipants}
        currentParticipantId="p-1"
        tees={meisTees}
        allowancePercentage={90}
        matchFormat="FOURBALL"
      />
    );

    const receiver = screen.getByTestId('quick-match-player-handicap-p-3');
    expect(receiver).toHaveTextContent('scoring.scorecard.ofTheDifference');
    // y con el allowance de verdad dentro, no con uno cualquiera
    expect(receiver).toHaveTextContent('"allowance":90');

    // el de menor hándicap no recibe nada, así que no hay nada que explicarle
    expect(screen.getByTestId('quick-match-player-handicap-p-2')).not.toHaveTextContent(
      'scoring.scorecard.ofTheDifference'
    );
  });

  /**
   * En SINGLES los golpes son `phA - phB` con el allowance ya dentro de los
   * dos, así que la resta de los dos números de la cabecera cuadra siempre.
   * Decir aquí "el 90% de la diferencia" sería sencillamente falso.
   */
  it('no nombra el allowance en singles, donde la resta ya cuadra', () => {
    renderSingles({ allowancePercentage: 90 });

    const header = screen.getByTestId('quick-match-player-handicap-p-2');
    expect(header).toHaveTextContent('scoring.scorecard.receivesStrokes');
    expect(header).not.toHaveTextContent('scoring.scorecard.ofTheDifference');
  });

  /**
   * En FOURSOMES el reparto sale de la diferencia de PROMEDIOS por equipo.
   * Mientras la cabecera enseñaba el hándicap de un jugador no había par de
   * números que reproducirlo y esta explicación no valía; desde #423 enseña el
   * del bando, así que la resta ya se le parece —y solo se separa por el
   * redondeo de cada bando, que es justo lo que la nota explica—.
   */
  it('nombra el allowance en foursomes, donde el redondeo de cada bando separa la resta', () => {
    render(
      <QuickMatchScorecardTable
        holes={meisHoles}
        holeScores={[]}
        participants={fourballParticipants}
        currentParticipantId="p-1"
        tees={meisTees}
        allowancePercentage={50}
        matchFormat="FOURSOMES"
      />
    );

    // Al bando que recibe, que es a quien hay que explicarle de dónde sale
    const receiver = screen.getByTestId('quick-match-player-handicap-p-3');
    expect(receiver).toHaveTextContent('scoring.scorecard.receivesStrokes');
    expect(receiver).toHaveTextContent('scoring.scorecard.ofTheDifference');
    expect(receiver).toHaveTextContent('"allowance":50');
  });

  it('no nombra el allowance en partido libre, donde no hay diferencia que explicar', () => {
    render(
      <QuickMatchScorecardTable
        holes={meisHoles}
        holeScores={[]}
        participants={singlesParticipants}
        currentParticipantId="p-1"
        tees={meisTees}
        allowancePercentage={95}
        matchFormat={null}
        scoringFormat="STABLEFORD"
      />
    );

    // Recibe golpes —y muchos— pero son su Playing Handicap entero, no una
    // diferencia contra nadie
    const header = screen.getByTestId('quick-match-player-handicap-p-1');
    expect(header).toHaveTextContent('scoring.scorecard.receivesStrokes');
    expect(header).not.toHaveTextContent('scoring.scorecard.ofTheDifference');
  });
});

describe('QuickMatchScorecardTable · una tarjeta por bando en foursomes', () => {
  const holes = [
    { holeNumber: 1, par: 4, strokeIndex: 1 },
    { holeNumber: 2, par: 3, strokeIndex: 2 },
  ];

  const sideParticipants = [
    { participantId: 'p-1', name: 'Agustin', handicap: 18.0, team: 'A' },
    { participantId: 'p-2', name: 'Companero', handicap: 8.0, team: 'A' },
    { participantId: 'p-3', name: 'RivalUno', handicap: 20.0, team: 'B' },
    { participantId: 'p-4', name: 'RivalDos', handicap: 28.0, team: 'B' },
  ];

  const renderFoursomes = (holeScores, participants = sideParticipants) =>
    render(
      <QuickMatchScorecardTable
        holes={holes}
        holeScores={holeScores}
        participants={participants}
        currentParticipantId="p-1"
        tees={[]}
        allowancePercentage={50}
        matchFormat="FOURSOMES"
      />
    );

  it('junta a los dos compañeros en una sola tarjeta', () => {
    renderFoursomes([]);

    expect(screen.getByText(/Agustin & Companero/)).toBeInTheDocument();
    expect(screen.getByText(/RivalUno & RivalDos/)).toBeInTheDocument();
    expect(screen.getByTestId('quick-match-player-card-p-1')).toBeInTheDocument();
    expect(screen.queryByTestId('quick-match-player-card-p-2')).not.toBeInTheDocument();
    expect(screen.queryByTestId('quick-match-player-card-p-4')).not.toBeInTheDocument();
  });

  /**
   * Bola alterna: cada hoyo lo anota quien golpeó. Con una tarjeta por jugador
   * cada compañero se quedaba con la mitad de los hoyos y la otra en blanco.
   */
  it('recoge los hoyos anotados por cualquiera de los dos', () => {
    renderFoursomes([
      { holeNumber: 1, participantId: 'p-1', score: 5 },
      { holeNumber: 2, participantId: 'p-2', score: 4 },
    ]);

    const card = screen.getByTestId('quick-match-player-card-p-1');
    expect(card).toHaveTextContent('5');
    expect(card).toHaveTextContent('4');
    // IDA: los dos hoyos del bando, no solo el propio
    expect(card).toHaveTextContent('9');
  });

  /**
   * Con anotación cruzada los dos bandos escriben la misma bola. Si no
   * coinciden se aclara entre las parejas; mientras tanto la tarjeta enseña la
   * del primero del bando, la misma que el total de la vuelta.
   */
  it('enseña la del primero del bando cuando las dos anotaciones difieren', () => {
    renderFoursomes([
      { holeNumber: 1, participantId: 'p-2', score: 8 },
      { holeNumber: 1, participantId: 'p-1', score: 5 },
    ]);

    // Sobre las celdas de golpes y no sobre la tarjeta entera: su cabecera
    // lleva el hándicap (18.0), así que un `not.toHaveTextContent('8')` contra
    // todo el bloque solo pasaba mientras el mock de traducción se comiera los
    // valores interpolados.
    const scoreCells = screen
      .getByTestId('quick-match-player-card-p-1')
      .querySelectorAll('[data-testid^="quick-match-score-cell-"]');
    const shown = [...scoreCells].map((cell) => cell.textContent);

    expect(shown).toContain('5');
    expect(shown).not.toContain('8');
  });

  /**
   * Sin `team` no hay bando: cada uno con su tarjeta. Agruparlos a todos bajo
   * el mismo dejaba una sola tarjeta con los cuatro nombres.
   */
  it('da una tarjeta por jugador cuando no hay bando', () => {
    renderFoursomes(
      [],
      sideParticipants.map((p) => ({ ...p, team: null }))
    );

    expect(screen.getByTestId('quick-match-player-card-p-1')).toBeInTheDocument();
    expect(screen.getByTestId('quick-match-player-card-p-2')).toBeInTheDocument();
    expect(screen.getByTestId('quick-match-player-card-p-3')).toBeInTheDocument();
    expect(screen.getByTestId('quick-match-player-card-p-4')).toBeInTheDocument();
  });
});

/**
 * `holes` es la tarjeta de la PRIMERA barra del campo, no la de cada jugador.
 * De los 800 campos federados importados, 25 cambian de par entre barras: Son
 * Parc es par 71 en amarillas y 58 en naranjas. La pantalla de anotación ya
 * resuelve la barra desde #412; la tarjeta seguía pintando —y puntuando—
 * contra el par ajeno. Ver RyderCupWeb#417.
 */
describe('QuickMatchScorecardTable · el par sale de la barra de cada tarjeta', () => {
  // Par distinto en el hoyo 1: 4 en la tarjeta del campo, 3 en la de naranjas
  const courseHoles = [
    { holeNumber: 1, par: 4, strokeIndex: 1 },
    { holeNumber: 2, par: 3, strokeIndex: 2 },
  ];

  const orangeCard = [
    { holeNumber: 1, par: 3, strokeIndex: 1 },
    { holeNumber: 2, par: 3, strokeIndex: 2 },
  ];

  const tees = [
    { color: 'YELLOW', gender: 'MALE', courseRating: 70, slopeRating: 120, holes: courseHoles },
    { color: 'ORANGE', gender: 'MALE', courseRating: 60, slopeRating: 100, holes: orangeCard },
  ];

  const onOrange = [
    {
      participantId: 'p-1',
      name: 'Naranjas',
      handicap: 0,
      team: null,
      color: 'ORANGE',
      teeGender: 'MALE',
    },
  ];

  const renderOnOrange = (props = {}) =>
    render(
      <QuickMatchScorecardTable
        holes={courseHoles}
        holeScores={[{ holeNumber: 1, participantId: 'p-1', score: 3 }]}
        participants={onOrange}
        currentParticipantId="p-1"
        tees={tees}
        scoringFormat="STABLEFORD"
        {...props}
      />
    );

  it('pinta la figura contra el par de su barra, no contra el del campo', () => {
    renderOnOrange();

    // 3 golpes en un par 3 es par. Contra el par 4 del campo salía birdie.
    expect(screen.getAllByTestId('golf-figure')[0]).toHaveAttribute('title', 'figures.par');
  });

  it('puntúa el Stableford contra el par de su barra', () => {
    renderOnOrange();

    // Par sin golpe recibido son 2 puntos; contra el par 4 del campo eran 3
    expect(screen.getAllByTestId('hole-points')[0]).toHaveTextContent('2');
  });

  it('enseña el par de su barra en la fila Par', () => {
    renderOnOrange();

    expect(screen.getByTestId('quick-match-par-p-1-1')).toHaveTextContent('3');
  });

  /**
   * Un bando de foursomes con los dos jugadores en barras distintas no tiene
   * una sola tarjeta que pintar: se queda con la del campo antes que inventar
   * un par que no juega ninguno de los dos.
   */
  it('cae a la tarjeta del campo cuando el bando sale de dos barras', () => {
    const mixedSide = [
      { participantId: 'p-1', name: 'Uno', handicap: 0, team: 'A', color: 'ORANGE', teeGender: 'MALE' },
      { participantId: 'p-2', name: 'Dos', handicap: 0, team: 'A', color: 'YELLOW', teeGender: 'MALE' },
      { participantId: 'p-3', name: 'Tres', handicap: 0, team: 'B', color: 'ORANGE', teeGender: 'MALE' },
      { participantId: 'p-4', name: 'Cuatro', handicap: 0, team: 'B', color: 'ORANGE', teeGender: 'MALE' },
    ];

    render(
      <QuickMatchScorecardTable
        holes={courseHoles}
        holeScores={[]}
        participants={mixedSide}
        currentParticipantId="p-1"
        tees={tees}
        matchFormat="FOURSOMES"
      />
    );

    // El bando mixto se queda con el par del campo...
    expect(screen.getByTestId('quick-match-par-p-1-1')).toHaveTextContent('4');
    // ...y el que sí comparte barra estrena el suyo
    expect(screen.getByTestId('quick-match-par-p-3-1')).toHaveTextContent('3');
  });
});

/**
 * La tarjeta de foursomes es del BANDO desde #421, pero su cabecera seguía
 * leyendo el hándicap de juego del primer jugador. Ver RyderCupWeb#423.
 */
describe('QuickMatchScorecardTable · el hándicap de la tarjeta de foursomes es el del bando', () => {
  const holes = [
    { holeNumber: 1, par: 4, strokeIndex: 1 },
    { holeNumber: 2, par: 3, strokeIndex: 2 },
  ];

  // Sin barra valorable el Course Handicap es el hándicap redondeado, así que
  // los promedios se leen a ojo: A (18 y 8) juega a 13, B (20 y 28) a 24.
  const sides = [
    { participantId: 'p-1', name: 'Agustin', handicap: 18.0, team: 'A' },
    { participantId: 'p-2', name: 'Companero', handicap: 8.0, team: 'A' },
    { participantId: 'p-3', name: 'RivalUno', handicap: 20.0, team: 'B' },
    { participantId: 'p-4', name: 'RivalDos', handicap: 28.0, team: 'B' },
  ];

  const renderSides = () =>
    render(
      <QuickMatchScorecardTable
        holes={holes}
        holeScores={[]}
        participants={sides}
        currentParticipantId="p-1"
        tees={[]}
        allowancePercentage={50}
        matchFormat="FOURSOMES"
      />
    );

  it('promedia a los dos jugadores en vez de enseñar el del primero', () => {
    renderSides();

    // 13 al 50% son 7 (el de p-1 solo serían 9), y 24 al 50% son 12 (p-3: 10)
    expect(screen.getByTestId('quick-match-player-handicap-p-1')).toHaveTextContent('"value":7');
    expect(screen.getByTestId('quick-match-player-handicap-p-3')).toHaveTextContent('"value":12');
  });

  it('deja los dos bandos con números distintos cuando juegan a hándicaps distintos', () => {
    renderSides();

    const sideA = screen.getByTestId('quick-match-player-handicap-p-1');
    const sideB = screen.getByTestId('quick-match-player-handicap-p-3');

    // El bando que no recibe es el de menor hándicap, y el que recibe lo dice
    expect(sideA).toHaveTextContent('scoring.scorecard.receivesNoStrokes');
    expect(sideB).toHaveTextContent('scoring.scorecard.receivesStrokes');
  });

  /**
   * Cada bando se redondea por su cuenta, así que la resta puede quedarse a un
   * golpe del reparto: aquí 12 - 7 = 5 frente a los 6 que se reparten. Es el
   * mismo margen que el FOURBALL, y por eso ahora también se nombra.
   */
  it('nombra el allowance, que es lo que separa la resta del reparto', () => {
    renderSides();

    const sideB = screen.getByTestId('quick-match-player-handicap-p-3');
    expect(sideB).toHaveTextContent('scoring.scorecard.ofTheDifference');
    expect(sideB).toHaveTextContent('"allowance":50');
  });
});
/**
 * El servidor manda los hándicaps de juego POR JUGADOR y ya redondeados, así
 * que promediarlos no es el promedio del que sale el reparto. Usarlos mientras
 * hubiera red devolvía a la cabecera un número que no cuadra con los golpes de
 * al lado —el defecto que cerró #423—, así que solo se recurre a ellos cuando
 * no llegó el campo y no hay con qué calcular.
 */
describe('QuickMatchScorecardTable · de dónde sale el hándicap del bando', () => {
  const holes = [
    { holeNumber: 1, par: 4, strokeIndex: 1 },
    { holeNumber: 2, par: 3, strokeIndex: 2 },
  ];
  const tees = [{ color: 'YELLOW', gender: 'MALE', courseRating: 70, slopeRating: 120 }];
  const sides = [
    { participantId: 'p-1', name: 'Uno', handicap: 18.0, team: 'A', color: 'YELLOW', teeGender: 'MALE' },
    { participantId: 'p-2', name: 'Dos', handicap: 8.0, team: 'A', color: 'YELLOW', teeGender: 'MALE' },
    { participantId: 'p-3', name: 'Tres', handicap: 20.0, team: 'B', color: 'YELLOW', teeGender: 'MALE' },
    { participantId: 'p-4', name: 'Cuatro', handicap: 28.0, team: 'B', color: 'YELLOW', teeGender: 'MALE' },
  ];

  // Hándicaps de juego individuales, como los manda el backend. Su promedio
  // (9) NO es el del bando por promedio de Course Handicaps (7).
  const participantStrokes = [
    { participantId: 'p-1', playingHandicap: 11, strokesByHole: {} },
    { participantId: 'p-2', playingHandicap: 7, strokesByHole: {} },
    { participantId: 'p-3', playingHandicap: 12, strokesByHole: { 1: 1 } },
    { participantId: 'p-4', playingHandicap: 12, strokesByHole: { 1: 1 } },
  ];

  it('con campo cargado calcula el del bando, aunque el servidor mande los suyos', () => {
    render(
      <QuickMatchScorecardTable
        holes={holes}
        holeScores={[]}
        participants={sides}
        currentParticipantId="p-1"
        tees={tees}
        allowancePercentage={50}
        matchFormat="FOURSOMES"
        participantStrokes={participantStrokes}
      />
    );

    // El promedio de Course Handicaps (13 al 50% = 7), no el de los 11 y 7 que
    // manda el servidor, que daría 9
    expect(screen.getByTestId('quick-match-player-handicap-p-1')).toHaveTextContent('"value":7');
  });

  it('sin campo cargado se apoya en los del servidor, que es lo único que hay', () => {
    render(
      <QuickMatchScorecardTable
        holes={[]}
        holeScores={[]}
        participants={sides}
        currentParticipantId="p-1"
        tees={[]}
        allowancePercentage={50}
        matchFormat="FOURSOMES"
        participantStrokes={participantStrokes}
      />
    );

    // Promedio de 11 y 7: sin campo no hay Course Handicap que promediar
    expect(screen.getByTestId('quick-match-player-handicap-p-1')).toHaveTextContent('"value":9');
  });
});

/**
 * `holeCardFor` es todo o nada, así que una barra con tarjeta PARCIAL devuelve
 * menos hoyos. Comparar solo hoyo a hoyo dejaba pasar ese caso en vacío y el
 * bando salía pintado con la tarjeta del compañero. Ver RyderCupAm#215.
 */
describe('QuickMatchScorecardTable · bando con una tarjeta de barra más corta', () => {
  const courseHoles = [
    { holeNumber: 1, par: 4, strokeIndex: 1 },
    { holeNumber: 2, par: 3, strokeIndex: 2 },
  ];

  const tees = [
    {
      color: 'YELLOW',
      gender: 'MALE',
      courseRating: 70,
      slopeRating: 120,
      holes: [
        { holeNumber: 1, par: 5, strokeIndex: 1 },
        { holeNumber: 2, par: 5, strokeIndex: 2 },
      ],
    },
    // Tarjeta parcial: solo trae el hoyo 1
    {
      color: 'ORANGE',
      gender: 'MALE',
      courseRating: 60,
      slopeRating: 100,
      holes: [{ holeNumber: 1, par: 5, strokeIndex: 1 }],
    },
  ];

  it('se queda con la tarjeta del campo en vez de con la del compañero', () => {
    const members = [
      { participantId: 'p-1', name: 'Larga', handicap: 0, team: 'A', color: 'YELLOW', teeGender: 'MALE' },
      { participantId: 'p-2', name: 'Corta', handicap: 0, team: 'A', color: 'ORANGE', teeGender: 'MALE' },
      { participantId: 'p-3', name: 'Rival', handicap: 0, team: 'B', color: 'YELLOW', teeGender: 'MALE' },
      { participantId: 'p-4', name: 'Rival2', handicap: 0, team: 'B', color: 'YELLOW', teeGender: 'MALE' },
    ];

    render(
      <QuickMatchScorecardTable
        holes={courseHoles}
        holeScores={[]}
        participants={members}
        currentParticipantId="p-1"
        tees={tees}
        matchFormat="FOURSOMES"
      />
    );

    // El par 4 del campo, no el 5 de la barra del compañero
    expect(screen.getByTestId('quick-match-par-p-1-1')).toHaveTextContent('4');
    // Y el bando que sí comparte barra entera sigue con la suya
    expect(screen.getByTestId('quick-match-par-p-3-1')).toHaveTextContent('5');
  });
});

describe('QuickMatchScorecardTable - raya (bola recogida)', () => {
  it('pinta la raya en su casilla, distinta del hoyo sin anotar', () => {
    const holeScores = [{ holeNumber: 1, participantId: 'p-1', score: null }];

    render(
      <QuickMatchScorecardTable
        holes={holes}
        holeScores={holeScores}
        participants={[participants[0]]}
        currentParticipantId="p-1"
        scoringFormat="STABLEFORD"
      />
    );

    const celda = screen.getByTestId('quick-match-score-cell-p-1-1');
    const sinAnotar = screen.getByTestId('quick-match-score-cell-p-1-2');
    expect(celda.querySelector('[data-picked-up="true"]')).not.toBeNull();
    expect(sinAnotar.querySelector('[data-picked-up="true"]')).toBeNull();
  });

  it('le da cero puntos Stableford, no ninguno', () => {
    // La raya vale cero, que no es lo mismo que un hoyo sin puntuar: sin el
    // cero, la tarjeta parece tener un hoyo pendiente.
    const holeScores = [{ holeNumber: 1, participantId: 'p-1', score: null }];

    render(
      <QuickMatchScorecardTable
        holes={holes}
        holeScores={holeScores}
        participants={[participants[0]]}
        currentParticipantId="p-1"
        scoringFormat="STABLEFORD"
      />
    );

    expect(screen.getByTestId('hole-points')).toHaveTextContent('0');
  });

  it('suma el doble bogey neto al total, para cuadrar con la clasificacion', () => {
    // Un par 4 recogido a scratch cuenta 6. Con el hueco, el total de la
    // tarjeta y el de la clasificacion daban numeros distintos.
    const holeScores = [
      { holeNumber: 1, participantId: 'p-1', score: null },
      { holeNumber: 2, participantId: 'p-1', score: 3 },
    ];

    render(
      <QuickMatchScorecardTable
        holes={holes}
        holeScores={holeScores}
        participants={[participants[0]]}
        currentParticipantId="p-1"
        scoringFormat="STABLEFORD"
      />
    );

    expect(screen.getByTestId('quick-match-scorecard-table')).toHaveTextContent('9');
  });
});

/**
 * FE #550: la tarjeta propia se lee la primera, y en parejas sube el bando
 * entero. Lo que se ordena es la lista de tarjetas: `participants` no se toca
 * porque la bola de un bando se guarda a nombre de su primer miembro
 * (`sideCardHolder`) y el reparto usa `[0]` y `[1]` como bandos cuando no hay
 * `team`.
 */
describe('QuickMatchScorecardTable — la tarjeta de quien mira va primero', () => {
  const cuatro = [
    { participantId: 'p-1', name: 'Ana', handicap: 0, team: 'A', isGuest: false },
    { participantId: 'p-2', name: 'Beto', handicap: 0, team: 'A', isGuest: false },
    { participantId: 'p-3', name: 'Carlos', handicap: 0, team: 'B', isGuest: false },
    { participantId: 'p-4', name: 'Diana', handicap: 0, team: 'B', isGuest: false },
  ];

  const tarjetas = (container) => [
    ...container.querySelectorAll('[data-testid^="quick-match-player-card-"]'),
  ];

  const clavesEnOrden = (container) =>
    tarjetas(container).map((card) => card.dataset.testid.replace('quick-match-player-card-', ''));

  it('sube la tarjeta propia en una partida sin bandos', () => {
    const { container } = render(
      <QuickMatchScorecardTable holes={holes} holeScores={[]} participants={participants} currentParticipantId="p-2" />
    );

    expect(clavesEnOrden(container)).toEqual(['p-2', 'p-1']);
  });

  it('en fourball sube al compañero detrás y respeta el orden de los rivales', () => {
    const { container } = render(
      <QuickMatchScorecardTable holes={holes} holeScores={[]} participants={cuatro} currentParticipantId="p-4" matchFormat="FOURBALL" />
    );

    expect(clavesEnOrden(container)).toEqual(['p-4', 'p-3', 'p-1', 'p-2']);
  });

  it('en foursomes sube el bando propio y escribe delante a quien mira', () => {
    const { container } = render(
      <QuickMatchScorecardTable holes={holes} holeScores={[]} participants={cuatro} currentParticipantId="p-4" matchFormat="FOURSOMES" />
    );

    // La tarjeta sigue siendo la del dueño de la bola —el primer miembro del
    // bando, p-3—: lo que cambia de sitio es la tarjeta, no el bando.
    expect(clavesEnOrden(container)).toEqual(['p-3', 'p-1']);
    expect(tarjetas(container)[0]).toHaveTextContent('Diana & Carlos');
    expect(tarjetas(container)[1]).toHaveTextContent('Ana & Beto');
  });

  it('deja el orden de alta a quien no juega la partida', () => {
    const { container } = render(
      <QuickMatchScorecardTable holes={holes} holeScores={[]} participants={cuatro} currentParticipantId="p-9" matchFormat="FOURSOMES" />
    );

    expect(clavesEnOrden(container)).toEqual(['p-1', 'p-3']);
    expect(tarjetas(container)[0]).toHaveTextContent('Ana & Beto');
  });

  /**
   * La prueba que pide la issue: mover la tarjeta de sitio no mueve un golpe.
   * Los mismos hoyos anotados se leen igual jugando el bando B —que sube— que
   * mirándolo desde fuera.
   */
  it('no cambia los golpes de cada bando al reordenar las tarjetas', () => {
    const holeScores = [
      { holeNumber: 1, participantId: 'p-1', score: 5 },
      { holeNumber: 1, participantId: 'p-3', score: 3 },
    ];

    const comoJugador = render(
      <QuickMatchScorecardTable holes={holes} holeScores={holeScores} participants={cuatro} currentParticipantId="p-4" matchFormat="FOURSOMES" />
    );
    const golpesDelJugador = tarjetas(comoJugador.container).map(
      (card) => card.querySelector('table').textContent
    );

    comoJugador.unmount();

    const comoEspectador = render(
      <QuickMatchScorecardTable holes={holes} holeScores={holeScores} participants={cuatro} currentParticipantId="p-9" matchFormat="FOURSOMES" />
    );
    const golpesDelEspectador = tarjetas(comoEspectador.container).map(
      (card) => card.querySelector('table').textContent
    );

    expect(golpesDelJugador[0]).toEqual(golpesDelEspectador[1]);
    expect(golpesDelJugador[1]).toEqual(golpesDelEspectador[0]);
    expect(golpesDelJugador[0]).not.toEqual(golpesDelJugador[1]);
  });
});

/**
 * En un bando de foursomes la cabecera enseña UNA barra. Con el nombre propio
 * delante, esa barra tiene que ser la suya: el foursomes mixto corriente son
 * rojas masculinas con rojas femeninas —dos entradas distintas de `tees`—, así
 * que la del compañero al lado del nombre propio es el defecto de #417 otra vez.
 */
describe('QuickMatchScorecardTable — la barra sigue al nombre que encabeza', () => {
  const dieciocho = Array.from({ length: 18 }, (_, i) => ({
    holeNumber: i + 1,
    par: 4,
    strokeIndex: i + 1,
  }));

  const bandoMixto = [
    { participantId: 'p-1', name: 'Carlos', handicap: 10, team: 'A', color: 'RED', teeGender: 'MALE' },
    { participantId: 'p-2', name: 'Diana', handicap: 10, team: 'A', color: 'RED', teeGender: 'FEMALE' },
  ];

  const tees = [
    { color: 'RED', gender: 'MALE', identifier: 'Rojas M', courseRating: 70, slopeRating: 113 },
    { color: 'RED', gender: 'FEMALE', identifier: 'Rojas F', courseRating: 72, slopeRating: 120 },
  ];

  it('enseña la barra de quien mira cuando su nombre sube al frente', () => {
    render(
      <QuickMatchScorecardTable
        holes={dieciocho}
        holeScores={[]}
        participants={bandoMixto}
        currentParticipantId="p-2"
        matchFormat="FOURSOMES"
        tees={tees}
      />
    );

    const cabecera = screen.getByTestId('quick-match-player-handicap-p-1');
    expect(cabecera).toHaveTextContent('Rojas F (F)');
    expect(cabecera).not.toHaveTextContent('Rojas M');
  });

  it('mantiene la del dueño de la bola para quien solo mira', () => {
    render(
      <QuickMatchScorecardTable
        holes={dieciocho}
        holeScores={[]}
        participants={bandoMixto}
        currentParticipantId="p-9"
        matchFormat="FOURSOMES"
        tees={tees}
      />
    );

    expect(screen.getByTestId('quick-match-player-handicap-p-1')).toHaveTextContent('Rojas M (M)');
  });
});
