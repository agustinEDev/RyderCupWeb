import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import QuickMatchScorecardTable from './QuickMatchScorecardTable';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
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
    const participant = [
      { participantId: 'p-1', name: 'Alice', handicap: 18, team: null, isGuest: false, color: 'YELLOW', teeGender: 'MALE' },
    ];
    const tees = [{ color: 'YELLOW', gender: 'MALE', courseRating: 7, slopeRating: 113 }];
    const holeScores = [{ holeNumber: 1, participantId: 'p-1', score: 5 }];

    // 20% allowance drops the Playing Handicap well below stroke index 5, so no dot should show
    render(
      <QuickMatchScorecardTable
        holes={holes}
        holeScores={holeScores}
        participants={participant}
        currentParticipantId="p-1"
        tees={tees}
        allowancePercentage={20}
      />
    );

    expect(screen.queryByTestId('stroke-dots')).not.toBeInTheDocument();
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
});
