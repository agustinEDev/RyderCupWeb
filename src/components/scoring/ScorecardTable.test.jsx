import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ScorecardTable from './ScorecardTable';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => opts ? `${key} ${JSON.stringify(opts)}` : key,
    i18n: { language: 'en' },
  }),
}));

const holes = Array.from({ length: 18 }, (_, i) => ({
  holeNumber: i + 1,
  par: 4,
  strokeIndex: i + 1,
}));

const players = [
  { userId: 'u1', userName: 'Player A', team: 'A' },
  { userId: 'u2', userName: 'Player B', team: 'B' },
];

describe('ScorecardTable', () => {
  it('should render the scorecard', () => {
    render(<ScorecardTable holes={holes} players={players} currentUserId="u1" />);
    expect(screen.getByTestId('scorecard-table')).toBeInTheDocument();
  });

  it('should display OUT and IN sections', () => {
    render(<ScorecardTable holes={holes} players={players} currentUserId="u1" />);
    expect(screen.getByTestId('scorecard-table')).toHaveTextContent('scorecard.out');
    expect(screen.getByTestId('scorecard-table')).toHaveTextContent('scorecard.in');
  });

  it('should display player names', () => {
    render(<ScorecardTable holes={holes} players={players} currentUserId="u1" />);
    expect(screen.getByTestId('scorecard-table')).toHaveTextContent('Player A');
    expect(screen.getByTestId('scorecard-table')).toHaveTextContent('Player B');
  });

  it('should display par values', () => {
    render(<ScorecardTable holes={holes} players={players} currentUserId="u1" />);
    expect(screen.getByTestId('scorecard-table')).toHaveTextContent('scorecard.par');
  });

  it('should display stroke index values', () => {
    render(<ScorecardTable holes={holes} players={players} currentUserId="u1" />);
    expect(screen.getByTestId('scorecard-table')).toHaveTextContent('scorecard.si');
  });

  it('should show dash when no score', () => {
    render(<ScorecardTable holes={holes} players={players} scores={[]} currentUserId="u1" />);
    const table = screen.getByTestId('scorecard-table');
    expect(table).toBeInTheDocument();
  });

  /**
   * La coincidencia entre anotadores se decidió que vive en la anotación, no en
   * la tarjeta: aquí se viene a leer el resultado, y un icono por celda competía
   * con él en las 18 columnas.
   */
  it('no pinta el icono de coincidencia en las celdas', () => {
    const scores = [
      {
        holeNumber: 1,
        playerScores: [
          { userId: 'u1', ownScore: 5, netScore: 4, validationStatus: 'match' },
          { userId: 'u2', ownScore: 6, netScore: 6, validationStatus: 'mismatch' },
        ],
      },
    ];

    render(<ScorecardTable holes={holes} players={players} scores={scores} currentUserId="u1" />);

    expect(screen.queryByTestId('validation-icon')).not.toBeInTheDocument();
    // pero los resultados siguen estando: GolfFigure emite el mismo testid para
    // su guión de "sin resultado", así que contar iconos no distinguiría una
    // tarjeta con datos de una vacía
    const figures = screen.getAllByTestId('golf-figure').map((f) => f.textContent);
    expect(figures).toContain('5');
    expect(figures).toContain('6');
  });

  it('should highlight current user row', () => {
    const scores = [{ holeNumber: 1, playerScores: [{ userId: 'u1', ownScore: 5, netScore: 4, validationStatus: 'match' }] }];
    render(<ScorecardTable holes={holes} players={players} scores={scores} currentUserId="u1" />);
    const table = screen.getByTestId('scorecard-table');
    expect(table.innerHTML).toContain('bg-blue-50');
  });

  it('should render with empty arrays', () => {
    render(<ScorecardTable />);
    expect(screen.getByTestId('scorecard-table')).toBeInTheDocument();
  });

  it('should display result row', () => {
    render(<ScorecardTable holes={holes} players={players} currentUserId="u1" />);
    expect(screen.getByTestId('scorecard-table')).toHaveTextContent('scorecard.result');
  });

  it('should show hole result winner with team name', () => {
    const scores = [{ holeNumber: 1, playerScores: [{ userId: 'u1', ownScore: 4, validationStatus: 'match' }], holeResult: { winner: 'A', standing: '1UP' } }];
    render(<ScorecardTable holes={holes} players={players} scores={scores} currentUserId="u1" teamAName="Team Red" teamBName="Team Blue" />);
    expect(screen.getByTestId('scorecard-table')).toHaveTextContent('Team Red');
  });

  it('should show halved symbol for halved holes', () => {
    const scores = [{ holeNumber: 1, playerScores: [{ userId: 'u1', ownScore: 4, validationStatus: 'match' }], holeResult: { winner: 'HALVED', standing: 'AS' } }];
    render(<ScorecardTable holes={holes} players={players} scores={scores} currentUserId="u1" teamAName="Team Red" teamBName="Team Blue" />);
    expect(screen.getByTestId('scorecard-table')).toHaveTextContent('scorecard.halved');
  });

  it('should show team B name when team B wins hole', () => {
    const scores = [{ holeNumber: 1, playerScores: [{ userId: 'u2', ownScore: 3, validationStatus: 'match' }], holeResult: { winner: 'B', standing: '1UP' } }];
    render(<ScorecardTable holes={holes} players={players} scores={scores} currentUserId="u1" teamAName="Team Red" teamBName="Team Blue" />);
    expect(screen.getByTestId('scorecard-table')).toHaveTextContent('Team Blue');
  });

  describe('FOURSOMES format', () => {
    const foursomePlayers = [
      { userId: 'u1', userName: 'Player A1', team: 'A' },
      { userId: 'u2', userName: 'Player A2', team: 'A' },
      { userId: 'u3', userName: 'Player B1', team: 'B' },
      { userId: 'u4', userName: 'Player B2', team: 'B' },
    ];

    it('should render 2 rows with combined names for FOURSOMES', () => {
      render(<ScorecardTable holes={holes} players={foursomePlayers} currentUserId="u1" matchFormat="FOURSOMES" teamAName="Team Red" teamBName="Team Blue" />);
      const table = screen.getByTestId('scorecard-table');
      expect(table).toHaveTextContent('Player A1 / Player A2');
      expect(table).toHaveTextContent('Player B1 / Player B2');
    });

    it('should show team names above player names in FOURSOMES', () => {
      render(<ScorecardTable holes={holes} players={foursomePlayers} currentUserId="u1" matchFormat="FOURSOMES" teamAName="Team Red" teamBName="Team Blue" />);
      const table = screen.getByTestId('scorecard-table');
      expect(table).toHaveTextContent('Team Red');
      expect(table).toHaveTextContent('Team Blue');
    });

    it('should show team color borders in FOURSOMES', () => {
      render(<ScorecardTable holes={holes} players={foursomePlayers} currentUserId="u1" matchFormat="FOURSOMES" teamAName="Team Red" teamBName="Team Blue" />);
      const table = screen.getByTestId('scorecard-table');
      expect(table.innerHTML).toContain('border-l-blue-500');
      expect(table.innerHTML).toContain('border-l-red-500');
    });

    it('should use first available score from teammates in FOURSOMES', () => {
      const foursomeScores = [{
        holeNumber: 1,
        playerScores: [
          { userId: 'u1', ownScore: 4, validationStatus: 'match' },
          { userId: 'u3', ownScore: 5, validationStatus: 'match' },
        ],
      }];
      render(<ScorecardTable holes={holes} players={foursomePlayers} scores={foursomeScores} currentUserId="u1" matchFormat="FOURSOMES" />);
      expect(screen.getByTestId('scorecard-table')).toBeInTheDocument();
    });

    it('should not show best-ball highlighting in FOURSOMES', () => {
      const scoresWithBestBall = [{
        holeNumber: 1,
        playerScores: [{ userId: 'u1', ownScore: 4, validationStatus: 'match' }],
        holeResult: { winner: 'A', bestBallPlayerA: ['u1'] },
      }];
      render(<ScorecardTable holes={holes} players={foursomePlayers} scores={scoresWithBestBall} currentUserId="u1" matchFormat="FOURSOMES" />);
      expect(screen.getByTestId('scorecard-table').innerHTML).not.toContain('bg-yellow-50');
    });
  });

  describe('FOURBALL format', () => {
    const fourballPlayers = [
      { userId: 'u1', userName: 'Player A1', team: 'A' },
      { userId: 'u2', userName: 'Player A2', team: 'A' },
      { userId: 'u3', userName: 'Player B1', team: 'B' },
      { userId: 'u4', userName: 'Player B2', team: 'B' },
    ];

    it('should show team color borders for FOURBALL', () => {
      render(<ScorecardTable holes={holes} players={fourballPlayers} currentUserId="u1" matchFormat="FOURBALL" teamAName="Team Red" teamBName="Team Blue" />);
      const table = screen.getByTestId('scorecard-table');
      expect(table.innerHTML).toContain('border-l-blue-500');
      expect(table.innerHTML).toContain('border-l-red-500');
    });

    it('should render 4 individual rows for FOURBALL', () => {
      render(<ScorecardTable holes={holes} players={fourballPlayers} currentUserId="u1" matchFormat="FOURBALL" teamAName="Team Red" teamBName="Team Blue" />);
      const table = screen.getByTestId('scorecard-table');
      expect(table).toHaveTextContent('Player A1');
      expect(table).toHaveTextContent('Player A2');
      expect(table).toHaveTextContent('Player B1');
      expect(table).toHaveTextContent('Player B2');
    });

    it('should show team names above player names in FOURBALL', () => {
      render(<ScorecardTable holes={holes} players={fourballPlayers} currentUserId="u1" matchFormat="FOURBALL" teamAName="Team Red" teamBName="Team Blue" />);
      const table = screen.getByTestId('scorecard-table');
      expect(table).toHaveTextContent('Team Red');
      expect(table).toHaveTextContent('Team Blue');
    });
  });

  describe('SINGLES format', () => {
    it('should not show team color borders for SINGLES', () => {
      render(<ScorecardTable holes={holes} players={players} currentUserId="u1" matchFormat="SINGLES" />);
      const table = screen.getByTestId('scorecard-table');
      expect(table.innerHTML).not.toContain('border-l-blue-500');
      expect(table.innerHTML).not.toContain('border-l-red-500');
    });
  });
});
/**
 * La rejilla comparte las filas Par y SI entre todos los jugadores, pero la
 * FIGURA de cada casilla es de quien juega esa bola: en 25 de los 800 campos
 * federados el par cambia entre barras, y quien no jugaba la primera veía su
 * resultado dibujado contra un par ajeno. Ver RyderCupWeb#417.
 */
describe('ScorecardTable · la figura sale del par de cada jugador', () => {
  const courseHoles = Array.from({ length: 18 }, (_, i) => ({
    holeNumber: i + 1,
    par: 4,
    strokeIndex: i + 1,
  }));

  // El de naranjas juega un par 3 donde la tarjeta del campo dice 4
  const orangeCard = courseHoles.map((h) => (h.holeNumber === 1 ? { ...h, par: 3 } : h));

  const players = [
    { userId: 'u1', userName: 'Naranjas', team: 'A', holeCard: orangeCard },
    { userId: 'u2', userName: 'Campo', team: 'B', holeCard: [] },
  ];

  const scores = [
    {
      holeNumber: 1,
      playerScores: [
        { userId: 'u1', ownScore: 3 },
        { userId: 'u2', ownScore: 3 },
      ],
    },
  ];

  it('pinta par para quien juega un par 3 y birdie para quien juega el par 4 del campo', () => {
    render(
      <ScorecardTable
        holes={courseHoles}
        players={players}
        scores={scores}
        currentUserId="u1"
      />
    );

    const figures = screen.getAllByTestId('golf-figure');
    const titles = figures.map((f) => f.getAttribute('title')).filter(Boolean);

    // Mismo 3 en el mismo hoyo, dos figuras distintas: cada una contra su par
    expect(titles).toContain('figures.par');
    expect(titles).toContain('figures.birdie');
  });

  it('cae al par del campo para quien no trae tarjeta de barra', () => {
    render(
      <ScorecardTable
        holes={courseHoles}
        players={[players[1]]}
        scores={[{ holeNumber: 1, playerScores: [{ userId: 'u2', ownScore: 3 }] }]}
        currentUserId="u2"
      />
    );

    const titles = screen
      .getAllByTestId('golf-figure')
      .map((f) => f.getAttribute('title'))
      .filter(Boolean);

    expect(titles).toContain('figures.birdie');
    expect(titles).not.toContain('figures.par');
  });
});
/**
 * En foursomes la fila es el bando entero. Leer el par del primero le pintaba
 * al compañero un par que no juega, así que un bando con los dos en barras de
 * distinto par se queda con la del campo: no es la de ninguno de los dos, y por
 * eso es preferible a la de uno. Ver RyderCupWeb#417.
 */
describe('ScorecardTable · foursomes con los dos jugadores en barras distintas', () => {
  const courseHoles = Array.from({ length: 18 }, (_, i) => ({
    holeNumber: i + 1,
    par: 4,
    strokeIndex: i + 1,
  }));

  const cardWithPar = (par) =>
    courseHoles.map((h) => (h.holeNumber === 1 ? { ...h, par } : h));

  const scores = [
    {
      holeNumber: 1,
      playerScores: [
        { userId: 'a1', ownScore: 3 },
        { userId: 'a2', ownScore: 3 },
        { userId: 'b1', ownScore: 3 },
        { userId: 'b2', ownScore: 3 },
      ],
    },
  ];

  it('usa el par del campo cuando el bando no comparte par', () => {
    const players = [
      // Bando A: uno juega un par 3 en el hoyo 1 y el otro un par 5
      { userId: 'a1', userName: 'A uno', team: 'A', holeCard: cardWithPar(3) },
      { userId: 'a2', userName: 'A dos', team: 'A', holeCard: cardWithPar(5) },
      // Bando B: los dos en la misma barra, par 3
      { userId: 'b1', userName: 'B uno', team: 'B', holeCard: cardWithPar(3) },
      { userId: 'b2', userName: 'B dos', team: 'B', holeCard: cardWithPar(3) },
    ];

    render(
      <ScorecardTable
        holes={courseHoles}
        players={players}
        scores={scores}
        currentUserId="a1"
        matchFormat="FOURSOMES"
      />
    );

    const titles = screen
      .getAllByTestId('golf-figure')
      .map((f) => f.getAttribute('title'))
      .filter(Boolean);

    // El bando mixto va contra el par 4 del campo: un 3 es birdie.
    // El bando que comparte barra va contra su par 3: el mismo 3 es par.
    expect(titles).toContain('figures.birdie');
    expect(titles).toContain('figures.par');
  });

  it('usa el par del campo si a un miembro del bando le falta la tarjeta', () => {
    const players = [
      { userId: 'a1', userName: 'A uno', team: 'A', holeCard: cardWithPar(3) },
      { userId: 'a2', userName: 'A dos', team: 'A', holeCard: [] },
      { userId: 'b1', userName: 'B uno', team: 'B', holeCard: [] },
      { userId: 'b2', userName: 'B dos', team: 'B', holeCard: [] },
    ];

    render(
      <ScorecardTable
        holes={courseHoles}
        players={players}
        scores={scores}
        currentUserId="a1"
        matchFormat="FOURSOMES"
      />
    );

    const titles = screen
      .getAllByTestId('golf-figure')
      .map((f) => f.getAttribute('title'))
      .filter(Boolean);

    // Ninguna fila puede resolver un par compartido: las dos van al par 4
    expect(titles).toEqual(['figures.birdie', 'figures.birdie']);
  });
});
