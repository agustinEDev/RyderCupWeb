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
   * En FOURSOMES el número sale de promedios por equipo y los dos compañeros
   * reciben lo mismo junto a hándicaps de juego distintos: ningún par de
   * números en pantalla lo reproduce, así que esta explicación no vale.
   */
  it('no nombra el allowance en foursomes, que necesitaría otra explicación', () => {
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

    // Una tarjeta por bando: comparten bola, así que comparten tarjeta.
    for (const id of ['p-1', 'p-3']) {
      expect(screen.getByTestId(`quick-match-player-handicap-${id}`)).not.toHaveTextContent(
        'scoring.scorecard.ofTheDifference'
      );
    }
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

    const card = screen.getByTestId('quick-match-player-card-p-1');
    expect(card).toHaveTextContent('5');
    // El par de los dos hoyos suma 7, así que un 8 solo puede venir de la otra
    // anotación del mismo hoyo.
    expect(card).not.toHaveTextContent('8');
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
