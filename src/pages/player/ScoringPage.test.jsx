import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

// Mock dependencies
vi.mock('react-router', () => ({
  useParams: () => ({ matchId: 'm-1' }),
  useNavigate: () => vi.fn(),
  Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => opts ? `${key} ${JSON.stringify(opts)}` : key,
    i18n: { language: 'en' },
  }),
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'u1', first_name: 'Test', last_name: 'User' },
    loading: false,
  }),
}));

const mockUseScoring = {
  scoringView: {
    matchNumber: 1,
    matchFormat: 'SINGLES',
    matchStatus: 'IN_PROGRESS',
    competitionId: 'c-1',
    isDecided: false,
    decidedResult: null,
    teamAName: 'Europe',
    teamBName: 'USA',
    markerAssignments: [
      { scorerUserId: 'u1', marksUserId: 'u2', marksName: 'Player B', markedByName: 'Player B', markedByUserId: 'u2' },
    ],
    players: [
      { userId: 'u1', userName: 'Player A', team: 'A' },
      { userId: 'u2', userName: 'Player B', team: 'B' },
    ],
    holes: Array.from({ length: 18 }, (_, i) => ({ holeNumber: i + 1, par: 4, strokeIndex: i + 1 })),
    scores: [],
    matchStanding: null,
    scorecardSubmittedBy: [],
  },
  currentHole: 1,
  isLoading: false,
  error: null,
  isSubmitting: false,
  matchSummary: null,
  isOffline: false,
  isSessionBlocked: false,
  pendingQueueSize: 0,
  noGuardados: {},
  scoresVisibles: [],
  isMatchPlayer: true,
  canScore: true,
  hasSubmitted: false,
  isOwnScoreLocked: false,
  isMarkerScoreLocked: false,
  isFullyLocked: false,
  validatedHoles: 0,
  totalHoles: 18,
  holesToSubmit: 18,
  canSubmitScorecard: false,
  partidoAcabado: false,
  setCurrentHole: vi.fn(),
  submitScore: vi.fn(),
  submitScorecard: vi.fn(),
  concedeMatch: vi.fn(),
  takeOverSession: vi.fn(),
  refetch: vi.fn(),
  // Como el hook con un solo marcado: sin marcado, o con él entregado
  marcaBloqueadaPara: (id) => !id || mockUseScoring.isMarkerScoreLocked,
  marcadoPendienteEn: () => null,
  retirando: false,
};

const mapaHoyo = vi.hoisted(() => ({
  args: null,
  ventana: null,
  valor: { abierto: false, abrir: () => {}, cerrar: () => {}, mapaDelCampo: null, disponible: true },
}));
vi.mock('../../hooks/useMapaDelHoyo', () => ({
  useMapaDelHoyo: (args) => {
    mapaHoyo.args = args;
    return mapaHoyo.valor;
  },
}));
vi.mock('../../components/scoring/mapa/VentanaDelMapa', () => ({
  default: (props) => {
    mapaHoyo.ventana = props;
    return null;
  },
}));
vi.mock('../../hooks/useScoring', () => ({
  useScoring: () => mockUseScoring,
}));

vi.mock('../../composition', () => ({
  getLeaderboardUseCase: { execute: vi.fn().mockResolvedValue(null) },
}));

vi.mock('../../components/layout/HeaderAuth', () => ({
  default: () => <div data-testid="header-auth">Header</div>,
}));

// Lo último que recibió la casilla, para mirar qué le llega (FE #606)
// Y cuántas veces se montó: al no poder guardarse su hoyo, la casilla se vuelve
// a montar para enseñar lo que de verdad está guardado (FE #622)
const casilla = vi.hoisted(() => ({ props: null, montajes: 0 }));

// Mock all scoring components to simple stubs
vi.mock('../../components/scoring/HoleInput', async () => {
  const { useState } = await vi.importActual('react');
  const CasillaDePrueba = (props) => {
    casilla.props = props;
    useState(() => { casilla.montajes += 1; });
    return <div data-testid="hole-input">HoleInput {props.holeNumber}</div>;
  };
  return { default: CasillaDePrueba };
});
// Y lo último que recibieron el selector y la tarjeta, por lo mismo
const selector = vi.hoisted(() => ({ props: null }));
const tarjeta = vi.hoisted(() => ({ props: null }));

vi.mock('../../components/scoring/HoleSelector', () => ({
  default: (props) => {
    selector.props = props;
    return <div data-testid="hole-selector">HoleSelector</div>;
  },
}));
vi.mock('../../components/scoring/ScorecardTable', () => ({
  default: (props) => {
    tarjeta.props = props;
    return <div data-testid="scorecard-table">ScorecardTable</div>;
  },
}));
vi.mock('../../components/scoring/LeaderboardView', () => ({
  default: () => <div data-testid="leaderboard-view">LeaderboardView</div>,
}));
vi.mock('../../components/scoring/MatchSummaryCard', () => ({
  default: ({ winnerName }) => (
    <div data-testid="match-summary-card">MatchSummaryCard {winnerName}</div>
  ),
}));
vi.mock('../../components/scoring/AnotarSinConexion', () => ({
  default: () => <div data-testid="anotar-sin-conexion">AnotarSinConexion</div>,
}));
vi.mock('../../components/scoring/SessionBlockedModal', () => ({
  default: ({ isOpen }) => isOpen ? <div data-testid="session-blocked-modal">SessionBlocked</div> : null,
}));
vi.mock('../../components/scoring/EarlyEndModal', () => ({
  default: ({ isOpen, onConfirm, listaParaEnviar }) => isOpen ? (
    <div data-testid="early-end-modal" data-lista={String(listaParaEnviar)}>
      EarlyEnd
      <button data-testid="early-end-confirm" onClick={onConfirm}>continue</button>
    </div>
  ) : null,
}));
vi.mock('../../components/scoring/ConcedeMatchModal', () => ({
  default: ({ isOpen }) => isOpen ? <div data-testid="concede-match-modal">Concede</div> : null,
}));
vi.mock('../../components/scoring/SubmitScorecardModal', () => ({
  default: ({ isOpen, validatedHoles, totalHoles }) => isOpen ? (
    <div data-testid="submit-scorecard-modal">Submit {validatedHoles}/{totalHoles}</div>
  ) : null,
}));

import ScoringPage from './ScoringPage';
import { getLeaderboardUseCase } from '../../composition';

describe('ScoringPage · la casilla, el selector y la tarjeta leen lo que se ve (FE #606)', () => {
  // Lo que se ve lo compone el hook con el servidor y la cola. La pantalla ya
  // no superpone nada suyo: con una copia propia de lo anotado, un golpe
  // rechazado seguía pintándose y el servidor no volvía a mandar nunca
  const fila = (userId, campos) => ({ userId, ownScore: null, ownSubmitted: false, ...campos });

  afterEach(() => {
    mockUseScoring.scoresVisibles = [];
  });

  /**
   * LA TABLA de la FE #621, parte de pantalla — un partido programado abre a su
   * hora (BE #305):
   *
   *   #    situación                          | la pantalla
   *   -----|-----------------------------------|---------------------------
   *   C1   programado y aún no abre            | dice cuándo, y sin casillas
   *   C2   programado y ya abrió               | casillas: el golpe lo abre
   *   C3   programado sin hora (sin coordenadas)| casillas, como siempre
   */
  // Con `afterEach`, no devolviéndola al final del test: si una aserción falla,
  // el `scoringView` mutado se quedaba puesto y tumbaba los tests siguientes
  // del fichero, que es como un fallo se convierte en veinte sin relación
  const vistaOriginal = mockUseScoring.scoringView;
  afterEach(() => { mockUseScoring.scoringView = vistaOriginal; });

  const conVista = (extra) => {
    mockUseScoring.scoringView = { ...vistaOriginal, ...extra };
  };

  it('C1 · programado y antes de su hora: dice cuándo abre y no ofrece casillas', () => {
    const dentroDeUnaHora = new Date(Date.now() + 3600 * 1000).toISOString();
    conVista({ matchStatus: 'SCHEDULED', scoringOpensAt: dentroDeUnaHora });

    render(<ScoringPage />);

    expect(screen.queryByTestId('hole-input')).not.toBeInTheDocument();
    expect(screen.getByText(/notOpenYet.title|no ha abierto/i)).toBeInTheDocument();
  });

  it('C1 · antes de abrir, dice a quién vas a marcar (16 oct: lo decía «Info del Partido»)', () => {
    const dentroDeUnaHora = new Date(Date.now() + 3600 * 1000).toISOString();
    conVista({ matchStatus: 'SCHEDULED', scoringOpensAt: dentroDeUnaHora });

    render(<ScoringPage />);

    expect(screen.getByTestId('anotaras-a')).toHaveTextContent('notOpenYet.youWillMark');
    expect(screen.getByTestId('anotaras-a')).toHaveTextContent('Player B');
  });

  it('C1 · antes de abrir, en foursomes, a la pareja rival', () => {
    const dentroDeUnaHora = new Date(Date.now() + 3600 * 1000).toISOString();
    conVista({
      matchStatus: 'SCHEDULED',
      scoringOpensAt: dentroDeUnaHora,
      matchFormat: 'FOURSOMES',
      players: [...vistaOriginal.players, { userId: 'u3', userName: 'Player C', team: 'A' }, { userId: 'u4', userName: 'Player D', team: 'B' }],
    });

    render(<ScoringPage />);

    expect(screen.getByTestId('anotaras-a')).toHaveTextContent('notOpenYet.youWillMarkPair');
    expect(screen.getByTestId('anotaras-a')).toHaveTextContent('Player B / Player D');
  });

  it('C1 · antes de abrir no hay «Mapa» (su ventana va con el hoyo)', () => {
    const dentroDeUnaHora = new Date(Date.now() + 3600 * 1000).toISOString();
    conVista({ matchStatus: 'SCHEDULED', scoringOpensAt: dentroDeUnaHora });

    render(<ScoringPage />);

    expect(screen.queryByRole('button', { name: 'mapa.abrir' })).toBeNull();
  });

  it('C1 · antes de abrir, sin a quién marcar, ni la línea', () => {
    const dentroDeUnaHora = new Date(Date.now() + 3600 * 1000).toISOString();
    conVista({ matchStatus: 'SCHEDULED', scoringOpensAt: dentroDeUnaHora, markerAssignments: [] });

    render(<ScoringPage />);

    expect(screen.queryByTestId('anotaras-a')).toBeNull();
  });

  it('C2 · programado pero su hora ya pasó: casillas, que el primer golpe lo abre', () => {
    const haceUnaHora = new Date(Date.now() - 3600 * 1000).toISOString();
    conVista({ matchStatus: 'SCHEDULED', scoringOpensAt: haceUnaHora });

    render(<ScoringPage />);

    expect(screen.getByTestId('hole-input')).toBeInTheDocument();
  });

  it('C3 · programado y sin hora —campo sin coordenadas—: como siempre', () => {
    conVista({ matchStatus: 'SCHEDULED', scoringOpensAt: null });

    render(<ScoringPage />);

    expect(screen.getByTestId('hole-input')).toBeInTheDocument();
  });

  it('un partido de torneo es match play: la casilla ofrece la raya (23 oct 2026)', () => {
    conVista({ matchStatus: 'IN_PROGRESS' });

    render(<ScoringPage />);

    expect(casilla.props.allowPickedUp).toBe(true);
  });

  it('sin el formato del partido en la vista, no se ofrece la raya', () => {
    conVista({ matchStatus: 'IN_PROGRESS', matchFormat: undefined });

    render(<ScoringPage />);

    expect(casilla.props.allowPickedUp).toBe(false);
  });

  it('Q11 · los tres reciben la vista con la cola, no solo lo del servidor', () => {
    // El servidor no tiene el hoyo 1 (`scoringView.scores` vacío); la cola sí
    const conLaCola = [{
      holeNumber: 1,
      playerScores: [
        fila('u1', { ownScore: 5, ownSubmitted: true }),
        fila('u2', { markerScore: 4, markerSubmitted: true }),
      ],
    }];
    mockUseScoring.scoresVisibles = conLaCola;

    render(<ScoringPage />);
    expect(casilla.props.playerScore).toEqual(conLaCola[0].playerScores[0]);
    expect(casilla.props.markedPlayerScore).toEqual(conLaCola[0].playerScores[1]);
    expect(selector.props.scores).toBe(conLaCola);

    fireEvent.click(screen.getByTestId('tab-scorecard'));

    expect(tarjeta.props.scores).toBe(conLaCola);
  });

  it('lo anotado en la casilla no se superpone en la pantalla: a la casilla le llega lo que da el hook', () => {
    const delHook = [{ holeNumber: 1, playerScores: [fila('u1', { ownScore: 3, ownSubmitted: true })] }];
    mockUseScoring.scoresVisibles = delHook;
    const { rerender } = render(<ScoringPage />);

    // Con el golpe que tocó el jugador: el hook lo necesita para saber qué
    // golpe se ha vuelto a anotar (FE #622)
    casilla.props.onScoreChange({ ownScore: 6, markedScore: undefined }, 'ownScore');
    rerender(<ScoringPage />);

    expect(casilla.props.playerScore).toEqual(delHook[0].playerScores[0]);
    expect(mockUseScoring.submitScore).toHaveBeenCalledWith(
      1,
      { ownScore: 6, markedPlayerId: 'u2', markedScore: undefined },
      { tocado: 'ownScore' }
    );
  });
});

describe('ScoringPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the scoring page with tabs', () => {
    render(<ScoringPage />);
    expect(screen.getByTestId('scoring-tabs')).toBeInTheDocument();
    expect(screen.getByTestId('tab-input')).toBeInTheDocument();
    expect(screen.getByTestId('tab-scorecard')).toBeInTheDocument();
    expect(screen.getByTestId('tab-leaderboard')).toBeInTheDocument();
  });

  it('should show input tab by default', () => {
    render(<ScoringPage />);
    expect(screen.getByTestId('hole-input')).toBeInTheDocument();
    expect(screen.getByTestId('hole-selector')).toBeInTheDocument();
  });

  it('16 oct: sin «Info del Partido» (para que la navegación se vea sin desplazar)', () => {
    render(<ScoringPage />);
    expect(screen.queryByTestId('pre-match-info')).toBeNull();
  });

  it('16 oct: «Anotas a …» del hoyo dice a quién marco', () => {
    render(<ScoringPage />);
    expect(casilla.props.markedName).toBe('Player B');
  });

  it('16 oct: en foursomes, «Anotas a …» dice la pareja rival (#710)', () => {
    const vista = mockUseScoring.scoringView;
    mockUseScoring.scoringView = {
      ...vista,
      matchFormat: 'FOURSOMES',
      players: [...vista.players, { userId: 'u3', userName: 'Player C', team: 'A' }, { userId: 'u4', userName: 'Player D', team: 'B' }],
    };
    try {
      render(<ScoringPage />);
      expect(casilla.props.markedName).toBe('Player B / Player D');
    } finally {
      mockUseScoring.scoringView = vista;
    }
  });

  it('16 oct: el campo de la partida, bajo el título', () => {
    const vista = mockUseScoring.scoringView;
    mockUseScoring.scoringView = { ...vista, roundInfo: { ...vista.roundInfo, golfCourseName: 'Golf de Meis - Par 72' } };
    try {
      render(<ScoringPage />);
      expect(screen.getByTestId('campo-de-la-partida')).toHaveTextContent('Golf de Meis - Par 72');
    } finally {
      mockUseScoring.scoringView = vista;
    }
  });

  it('16 oct: sin nombre del campo, ni la línea', () => {
    render(<ScoringPage />);
    expect(screen.queryByTestId('campo-de-la-partida')).toBeNull();
  });

  it('FE #658: las vistas son pestañas de verdad, con su nombre, su panel y las flechas', () => {
    render(<ScoringPage />);

    const barra = screen.getByRole('tablist', { name: 'tabsLabel' });
    expect(barra).toBe(screen.getByTestId('scoring-tabs'));
    const [anotar, tarjeta, clasificacion] = within(barra).getAllByRole('tab');
    expect(anotar).toBe(screen.getByTestId('tab-input'));
    expect(anotar).toHaveAttribute('aria-selected', 'true');
    expect(tarjeta).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tabpanel', { name: 'tabs.input' })).toHaveAttribute('id', anotar.getAttribute('aria-controls'));
    // Anotar está lleno de botones: el panel no es una parada más
    expect(screen.getByRole('tabpanel', { name: 'tabs.input' })).not.toHaveAttribute('tabindex');

    fireEvent.keyDown(anotar, { key: 'ArrowRight' });
    expect(tarjeta).toHaveAttribute('aria-selected', 'true');
    expect(tarjeta).toHaveFocus();
    expect(within(screen.getByRole('tabpanel', { name: 'tabs.scorecard' })).getByTestId('scorecard-table')).toBeInTheDocument();
    // La tarjeta y la clasificación son tablas: el panel sí
    expect(screen.getByRole('tabpanel', { name: 'tabs.scorecard' })).toHaveAttribute('tabindex', '0');

    fireEvent.keyDown(tarjeta, { key: 'ArrowLeft' });
    fireEvent.keyDown(anotar, { key: 'ArrowLeft' });
    expect(clasificacion).toHaveAttribute('aria-selected', 'true');
    expect(within(screen.getByRole('tabpanel', { name: 'tabs.leaderboard' })).getByTestId('leaderboard-view')).toBeInTheDocument();
    expect(screen.getByRole('tabpanel', { name: 'tabs.leaderboard' })).toHaveAttribute('tabindex', '0');
  });

  it('FE #658: abrir la clasificación con el teclado la pide, como al pulsarla', () => {
    render(<ScoringPage />);
    expect(getLeaderboardUseCase.execute).not.toHaveBeenCalled();

    fireEvent.keyDown(screen.getByRole('tab', { name: 'tabs.input' }), { key: 'End' });

    expect(getLeaderboardUseCase.execute).toHaveBeenCalledWith('c-1');
  });

  it('should switch to scorecard tab', () => {
    render(<ScoringPage />);
    fireEvent.click(screen.getByTestId('tab-scorecard'));
    expect(screen.getByTestId('scorecard-table')).toBeInTheDocument();
  });

  it('should switch to leaderboard tab', () => {
    render(<ScoringPage />);
    fireEvent.click(screen.getByTestId('tab-leaderboard'));
    expect(screen.getByTestId('leaderboard-view')).toBeInTheDocument();
  });

  it('should show match header info', () => {
    render(<ScoringPage />);
    expect(screen.getByText(/matchHeader/)).toBeInTheDocument();
    // El formato, traducido (16 oct: salía «SINGLES» tal cual)
    expect(screen.getByText('formats.SINGLES')).toBeInTheDocument();
  });

  it('should render header', () => {
    render(<ScoringPage />);
    expect(screen.getByTestId('header-auth')).toBeInTheDocument();
  });

  it('regresión (12 oct 2026): sin red, quien no juega no recibe el aviso de anotar', () => {
    mockUseScoring.isOffline = true;
    mockUseScoring.isMatchPlayer = false;
    mockUseScoring.canScore = false;
    try {
      render(<ScoringPage />);

      expect(screen.queryByTestId('anotar-sin-conexion')).toBeNull();
    } finally {
      mockUseScoring.isOffline = false;
      mockUseScoring.isMatchPlayer = true;
      mockUseScoring.canScore = true;
    }
  });

  it('revisor: el administrador que anota sin jugar sí recibe el aviso de anotar', () => {
    mockUseScoring.isOffline = true;
    mockUseScoring.isMatchPlayer = false;
    try {
      render(<ScoringPage />);

      expect(screen.getByTestId('anotar-sin-conexion')).toBeInTheDocument();
    } finally {
      mockUseScoring.isOffline = false;
      mockUseScoring.isMatchPlayer = true;
    }
  });

  it('should not show offline banner when online', () => {
    render(<ScoringPage />);
    expect(screen.queryByTestId('anotar-sin-conexion')).toBeNull();
  });

  it('should not show session blocked modal when not blocked', () => {
    render(<ScoringPage />);
    expect(screen.queryByTestId('session-blocked-modal')).toBeNull();
  });

  it('should show prev/next hole navigation', () => {
    render(<ScoringPage />);
    expect(screen.getByText('input.prevHole')).toBeInTheDocument();
    expect(screen.getByText('input.nextHole')).toBeInTheDocument();
  });

  describe('early end modal', () => {
    afterEach(() => {
      mockUseScoring.hasSubmitted = false;
      mockUseScoring.scoringView.isDecided = false;
    });

    it('should show the early end modal when the match is decided and not yet submitted', () => {
      mockUseScoring.hasSubmitted = false;
      mockUseScoring.scoringView.isDecided = true;

      render(<ScoringPage />);

      expect(screen.getByTestId('early-end-modal')).toBeInTheDocument();
    });

    // FE #740 · a quien mira un partido que no juega no le toca entregar nada:
    // Nacho abría el de Óscar contra Agustín y le salía «Continuar para Enviar»
    it('E2: a un espectador no le sale, aunque el partido esté decidido', () => {
      // Quién juega lo decide `useScoring` (`isMatchPlayer`): no se repite aquí
      mockUseScoring.isMatchPlayer = false;
      mockUseScoring.hasSubmitted = false;
      mockUseScoring.scoringView.isDecided = true;

      try {
        render(<ScoringPage />);
        expect(screen.queryByTestId('early-end-modal')).toBeNull();
      } finally {
        mockUseScoring.isMatchPlayer = true;
      }
    });

    it('should not show the early end modal once the player has already submitted', () => {
      mockUseScoring.hasSubmitted = true;
      mockUseScoring.scoringView.isDecided = true;

      render(<ScoringPage />);

      expect(screen.queryByTestId('early-end-modal')).toBeNull();
    });
  });

  describe('scorecard tab — already submitted', () => {
    afterEach(() => {
      mockUseScoring.hasSubmitted = false;
      mockUseScoring.scoringView.players = [
        { userId: 'u1', userName: 'Player A', team: 'A' },
        { userId: 'u2', userName: 'Player B', team: 'B' },
      ];
      mockUseScoring.scoringView.scorecardSubmittedBy = [];
      mockUseScoring.scoringView.matchStatus = 'IN_PROGRESS';
      mockUseScoring.scoringView.matchFormat = 'SINGLES';
    });

    // Foursomes: una tarjeta por pareja (RyderCupAM#377). El servidor ya manda
    // la lista con la regla aplicada: si uno de la pareja entregó, salen los dos
    const enFoursomes = (entregadas) => {
      mockUseScoring.hasSubmitted = true;
      mockUseScoring.scoringView.matchFormat = 'FOURSOMES';
      mockUseScoring.scoringView.players = [
        { userId: 'u1', userName: 'Player A', team: 'A' },
        { userId: 'u2', userName: 'Player B', team: 'A' },
        { userId: 'u3', userName: 'Player C', team: 'B' },
        { userId: 'u4', userName: 'Player D', team: 'B' },
      ];
      mockUseScoring.scoringView.scorecardSubmittedBy = entregadas;
    };

    it('F1: en foursomes dice que la tarjeta de la pareja está entregada', () => {
      enFoursomes(['u1', 'u2']);

      render(<ScoringPage />);
      fireEvent.click(screen.getByTestId('tab-scorecard'));

      // «Tarjeta ya enviada» sería falso para el compañero que no la envió
      expect(screen.getByText('submit.pairSubmitted')).toBeInTheDocument();
      expect(screen.queryByText('submit.alreadySubmitted')).toBeNull();
    });

    it('F2: y espera a la otra pareja, no a «2 jugadores»', () => {
      enFoursomes(['u1', 'u2']);

      render(<ScoringPage />);
      fireEvent.click(screen.getByTestId('tab-scorecard'));

      expect(screen.getByText(/submit\.waitingForPair/)).toHaveTextContent('Player C / Player D');
      expect(screen.queryByText(/submit\.waitingForPlayers/)).toBeNull();
    });

    it('should show the names of players still pending submission', () => {
      mockUseScoring.hasSubmitted = true;
      mockUseScoring.scoringView.matchFormat = 'FOURBALL';
      mockUseScoring.scoringView.players = [
        { userId: 'u1', userName: 'Player A', team: 'A' },
        { userId: 'u2', userName: 'Player B', team: 'A' },
        { userId: 'u3', userName: 'Player C', team: 'B' },
        { userId: 'u4', userName: 'Player D', team: 'B' },
      ];
      mockUseScoring.scoringView.scorecardSubmittedBy = ['u1'];
      mockUseScoring.scoringView.matchStatus = 'IN_PROGRESS';

      render(<ScoringPage />);
      fireEvent.click(screen.getByTestId('tab-scorecard'));

      expect(screen.getByText('submit.alreadySubmitted')).toBeInTheDocument();
      expect(screen.getByText(/submit\.waitingForPlayers/)).toHaveTextContent(
        'Player B, Player C, Player D'
      );
    });

    it('should show a completed message instead of pending players once the match is COMPLETED', () => {
      mockUseScoring.hasSubmitted = true;
      mockUseScoring.scoringView.players = [
        { userId: 'u1', userName: 'Player A', team: 'A' },
        { userId: 'u2', userName: 'Player B', team: 'B' },
      ];
      mockUseScoring.scoringView.scorecardSubmittedBy = ['u1', 'u2'];
      mockUseScoring.scoringView.matchStatus = 'COMPLETED';

      render(<ScoringPage />);
      fireEvent.click(screen.getByTestId('tab-scorecard'));

      expect(screen.getByText('submit.alreadySubmitted')).toBeInTheDocument();
      expect(screen.getByText('submit.matchCompleted')).toBeInTheDocument();
      expect(screen.queryByText(/submit\.waitingForPlayers/)).toBeNull();
    });

    it('should show no secondary message once nobody else is pending', () => {
      mockUseScoring.hasSubmitted = true;
      mockUseScoring.scoringView.players = [
        { userId: 'u1', userName: 'Player A', team: 'A' },
        { userId: 'u2', userName: 'Player B', team: 'B' },
      ];
      mockUseScoring.scoringView.scorecardSubmittedBy = ['u1', 'u2'];
      mockUseScoring.scoringView.matchStatus = 'IN_PROGRESS';

      render(<ScoringPage />);
      fireEvent.click(screen.getByTestId('tab-scorecard'));

      expect(screen.getByText('submit.alreadySubmitted')).toBeInTheDocument();
      expect(screen.queryByText(/submit\.waitingForPlayers/)).toBeNull();
      expect(screen.queryByText('submit.matchCompleted')).toBeNull();
    });
  });

  describe('a match decided before the 18th hole', () => {
    afterEach(() => {
      mockUseScoring.scoringView.isDecided = false;
      mockUseScoring.canSubmitScorecard = false;
      mockUseScoring.hasSubmitted = false;
      mockUseScoring.validatedHoles = 0;
      mockUseScoring.holesToSubmit = 18;
      mockUseScoring.partidoAcabado = false;
    });

    it('takes "continue to submit" to the tab where the submit button lives', () => {
      // The CTA used to just dismiss the dialog, dropping the player back on the
      // hole input with no way to hand in the card
      mockUseScoring.scoringView.isDecided = true;
      mockUseScoring.scoringView.decidedResult = { winner: 'A', score: '9&7' };
      mockUseScoring.canSubmitScorecard = true;

      render(<ScoringPage />);
      fireEvent.click(screen.getByTestId('early-end-confirm'));

      expect(screen.getByText('submit.button')).toBeInTheDocument();
      // Y la pestaña que se marca es la de la tarjeta, no la que se dejó (FE #658)
      expect(screen.getByRole('tab', { name: 'tabs.scorecard' })).toHaveAttribute('aria-selected', 'true');
    });

    it('R3: le dice al aviso si la tarjeta se puede enviar ya', () => {
      mockUseScoring.scoringView.isDecided = true;
      mockUseScoring.canSubmitScorecard = false;
      const { rerender } = render(<ScoringPage />);
      expect(screen.getByTestId('early-end-modal').dataset.lista).toBe('false');

      mockUseScoring.canSubmitScorecard = true;
      rerender(<ScoringPage />);
      expect(screen.getByTestId('early-end-modal').dataset.lista).toBe('true');
    });

    it('says why the card is not ready instead of showing nothing', () => {
      mockUseScoring.scoringView.isDecided = true;
      mockUseScoring.partidoAcabado = true;
      mockUseScoring.canSubmitScorecard = false;

      render(<ScoringPage />);
      fireEvent.click(screen.getByTestId('tab-scorecard'));

      expect(screen.getByText('submit.notReady')).toBeInTheDocument();
      expect(screen.queryByText('submit.button')).toBeNull();
    });

    it('does not reopen the confirmation on its own once submission is possible again', () => {
      // The marker can score a hole while the dialog is open. Hiding it is not
      // enough: the dialog would pop back up by itself when readiness returns
      mockUseScoring.scoringView.isDecided = true;
      mockUseScoring.canSubmitScorecard = true;

      const { rerender } = render(<ScoringPage />);
      fireEvent.click(screen.getByTestId('tab-scorecard'));
      fireEvent.click(screen.getByText('submit.button'));
      expect(screen.getByTestId('submit-scorecard-modal')).toBeInTheDocument();

      mockUseScoring.canSubmitScorecard = false;
      rerender(<ScoringPage />);
      expect(screen.queryByTestId('submit-scorecard-modal')).toBeNull();

      mockUseScoring.canSubmitScorecard = true;
      rerender(<ScoringPage />);
      expect(screen.queryByTestId('submit-scorecard-modal')).toBeNull();
    });

    it('counts the confirmation against the holes played, not always 18', () => {
      mockUseScoring.scoringView.isDecided = true;
      mockUseScoring.canSubmitScorecard = true;
      mockUseScoring.validatedHoles = 11;
      mockUseScoring.holesToSubmit = 11;

      render(<ScoringPage />);
      fireEvent.click(screen.getByTestId('tab-scorecard'));
      fireEvent.click(screen.getByText('submit.button'));

      expect(screen.getByTestId('submit-scorecard-modal')).toHaveTextContent('11/11');
    });
  });

  describe('match summary screen', () => {
    afterEach(() => {
      mockUseScoring.matchSummary = null;
    });

    it('should resolve the winning team and player names', () => {
      mockUseScoring.matchSummary = {
        matchId: 'm-1',
        result: { winner: 'A', score: '3&2' },
        stats: { playerGrossTotal: 82, playerNetTotal: 72, holesWon: 8, holesLost: 5 },
        matchComplete: false,
      };
      render(<ScoringPage />);
      expect(screen.getByTestId('match-summary-card')).toHaveTextContent('Europe (Player A)');
    });

    it('should pass no winner name for a halved match', () => {
      mockUseScoring.matchSummary = {
        matchId: 'm-1',
        result: { winner: 'HALVED', score: 'AS' },
        stats: { playerGrossTotal: 82, playerNetTotal: 82, holesWon: 6, holesLost: 6 },
        matchComplete: false,
      };
      render(<ScoringPage />);
      expect(screen.getByTestId('match-summary-card')).not.toHaveTextContent('Europe');
      expect(screen.getByTestId('match-summary-card')).not.toHaveTextContent('USA');
    });
  });

  describe('el aviso del vaciado (FE #551)', () => {
    afterEach(() => {
      mockUseScoring.avisoDelVaciado = null;
    });

    it('no pinta nada si no lo hay', () => {
      render(<ScoringPage />);
      expect(screen.queryByText(/errors\.vaciado/)).toBeNull();
    });

    it('pinta el paro con la clave compartida de anotación', () => {
      // Con espacio de nombres: el texto vive en `scoring` y lo comparten las
      // dos pantallas, así que la clave no depende del `t` de cada una
      mockUseScoring.avisoDelVaciado = 'no-se-pudo-borrar';
      render(<ScoringPage />);
      expect(screen.getByRole('status')).toHaveTextContent('scoring:errors.vaciado.no-se-pudo-borrar');
    });
  });
});

describe('ScoringPage · sin nada guardado se dice, no se deja la carcasa (FE #614)', () => {
  // Sin cobertura la peticion muere sin respuesta, asi que el hook NO pone
  // error a proposito: la pantalla caia al render normal con la vista a nulo y
  // pintaba una carcasa —«Partido #» sin numero, sin panel del hoyo, tarjeta
  // con cabeceras y nada mas—. Eso no dice que haya pasado, y el jugador se
  // queda mirando una pantalla que no puede usar
  const laVista = mockUseScoring.scoringView;

  afterEach(() => {
    mockUseScoring.scoringView = laVista;
    mockUseScoring.error = null;
    mockUseScoring.isOffline = false;
  });

  it('sin vista y sin error, lo dice en vez de pintar la carcasa vacía', () => {
    mockUseScoring.scoringView = null;
    mockUseScoring.error = null;
    mockUseScoring.isOffline = true;

    render(<ScoringPage />);

    expect(screen.getByTestId('sin-nada-guardado')).toBeInTheDocument();
  });

  it('y no se enseña el selector ni la tarjeta de un partido que no se tiene', () => {
    mockUseScoring.scoringView = null;
    mockUseScoring.error = null;
    mockUseScoring.isOffline = true;

    render(<ScoringPage />);

    expect(screen.queryByTestId('hole-selector')).not.toBeInTheDocument();
    expect(screen.queryByTestId('scorecard-table')).not.toBeInTheDocument();
  });
});

describe('ScoringPage · cuando lo que se ve sale de la foto del móvil (FE #614)', () => {
  const laVista = mockUseScoring.scoringView;

  afterEach(() => {
    mockUseScoring.scoringView = laVista;
    mockUseScoring.pintadoDeMemoria = false;
    mockUseScoring.error = null;
    mockUseScoring.isOffline = false;
    mockUseScoring.pendingQueueSize = 0;
  });

  // Salio de la revision: con un 5xx la pantalla se pintaba entera desde el
  // movil bajo un recuadro rojo, sin decir que era una foto de antes. Y eso
  // pasa CON cobertura, que es donde nadie sospecha
  it('lo dice en ámbar, y el recuadro rojo deja de salir encima', () => {
    mockUseScoring.pintadoDeMemoria = true;
    mockUseScoring.error = Object.assign(new Error('500'), { status: 500 });

    render(<ScoringPage />);

    expect(screen.getByTestId('pintado-de-memoria')).toBeInTheDocument();
    // El boton de reintentar del recuadro rojo: su texto es la clave, porque la
    // `t` de este fichero devuelve la clave
    expect(screen.queryAllByText('retry')).toHaveLength(0);
  });

  it('sin conexión, un solo aviso: el de no tener conexión (QA del 11 oct 2026)', () => {
    mockUseScoring.pintadoDeMemoria = true;
    mockUseScoring.isOffline = true;

    render(<ScoringPage />);

    expect(screen.queryByTestId('pintado-de-memoria')).not.toBeInTheDocument();
    expect(screen.queryAllByText('retry')).toHaveLength(0);
  });

  it('con un error de verdad y sin foto, sigue saliendo el recuadro rojo', () => {
    mockUseScoring.pintadoDeMemoria = false;
    mockUseScoring.error = Object.assign(new Error('500'), { status: 500 });

    render(<ScoringPage />);

    expect(screen.queryByTestId('pintado-de-memoria')).not.toBeInTheDocument();
    expect(screen.getAllByText('retry').length).toBeGreaterThan(0);
  });

  // Tambien de la revision: la foto pudo no caber, desalojarse o borrarse por un
  // 404 a media vuelta, y los golpes del jugador seguir en la cola. Decir «no
  // hay nada guardado» sin contarlos es decirle lo contrario de lo que pasa
  it('sin nada guardado, los golpes pendientes se siguen viendo', () => {
    mockUseScoring.scoringView = null;
    mockUseScoring.isOffline = true;
    mockUseScoring.pendingQueueSize = 2;

    render(<ScoringPage />);

    expect(screen.getByTestId('sin-nada-guardado')).toBeInTheDocument();
    expect(screen.getByTestId('anotar-sin-conexion')).toBeInTheDocument();
  });
});

describe('ScoringPage · servidor caido CON cobertura y sin foto (FE #617)', () => {
  const laVista = mockUseScoring.scoringView;
  const fallaLaRed = () => new TypeError('Failed to fetch (localhost:8000)');

  afterEach(() => {
    mockUseScoring.scoringView = laVista;
    mockUseScoring.error = null;
    mockUseScoring.isOffline = false;
    mockUseScoring.pendingQueueSize = 0;
  });

  // El caso de campo mas probable: club con cobertura y la API caida. El hook SI
  // pone error (no es `isOffline`), asi que la guarda de error se disparaba antes
  // que la de «nada guardado» y el jugador veia el texto crudo de `fetch`
  it('la pantalla de «nada guardado» gana a la de error genérico', () => {
    mockUseScoring.scoringView = null;
    mockUseScoring.error = fallaLaRed();

    render(<ScoringPage />);

    expect(screen.getByTestId('sin-nada-guardado')).toBeInTheDocument();
  });

  it('no se le enseña al jugador el texto técnico de fetch', () => {
    mockUseScoring.scoringView = null;
    mockUseScoring.error = fallaLaRed();

    render(<ScoringPage />);

    expect(screen.queryByText(/Failed to fetch/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/localhost:8000/i)).not.toBeInTheDocument();
  });

  // Lo que mas importa: el golpe esta a salvo en la cola, y callarlo es decirle
  // lo contrario de lo que pasa.
  //
  // Esta fila nacio afirmando `offline-banner`, porque la primera version conto
  // los pendientes por ahi. CodeRabbit senalo que ese banner dice «estas sin
  // conexion» y con cobertura eso es falso, asi que ahora son dos avisos
  // distintos: el suyo se comprueba abajo, y aqui lo que importa es que el
  // jugador SEPA que su golpe esta guardado, cualquiera que sea el vehiculo
  it('los golpes pendientes se anuncian aunque el navegador se crea en línea', () => {
    mockUseScoring.scoringView = null;
    mockUseScoring.error = fallaLaRed();
    mockUseScoring.isOffline = false;
    mockUseScoring.pendingQueueSize = 1;

    render(<ScoringPage />);

    expect(screen.getByTestId('pendientes-a-salvo')).toBeInTheDocument();
    expect(screen.getByText(/offline\.pendingScores/)).toBeInTheDocument();
  });

  // Y un error de verdad del servidor sigue diciendo lo que pasa, pero con
  // NUESTRO texto: el `detail` del backend viene en ingles, y sin cuerpo
  // parseable `api.js` compone «HTTP 503: Service Unavailable». La primera
  // version de esta fila usaba prosa espanola que la API nunca devuelve, asi que
  // bendecia justo el defecto que la #617 venia a quitar (CodeRabbit)
  it('un error con estado se cuenta con nuestro texto, no con el del backend', () => {
    mockUseScoring.scoringView = null;
    mockUseScoring.error = Object.assign(new Error('Match not found'), { status: 404 });

    render(<ScoringPage />);

    expect(screen.getByText('errors.notFound')).toBeInTheDocument();
    expect(screen.queryByText(/Match not found/)).not.toBeInTheDocument();
  });

  it('un 503 no se le enseña como «HTTP 503: Service Unavailable»', () => {
    mockUseScoring.scoringView = null;
    mockUseScoring.error = Object.assign(new Error('HTTP 503: Service Unavailable'), { status: 503 });

    render(<ScoringPage />);

    expect(screen.queryByText(/HTTP 503/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Service Unavailable/)).not.toBeInTheDocument();
  });

  // Fila 2 de CodeRabbit: al cambiar `isOffline` por «hay pendientes» se perdio
  // el aviso de que no hay red cuando la cola esta vacia — el caso mas comun al
  // llegar al campo con un partido que nunca se abrio en ese movil
  it('sin cobertura y sin golpes pendientes, sigue avisando de que no hay red', () => {
    mockUseScoring.scoringView = null;
    mockUseScoring.error = null;
    mockUseScoring.isOffline = true;
    mockUseScoring.pendingQueueSize = 0;

    render(<ScoringPage />);

    expect(screen.getByTestId('anotar-sin-conexion')).toBeInTheDocument();
  });

  // Fila 3: con cobertura, ese banner afirma «Estas sin conexion», que es falso.
  // Los pendientes se cuentan, pero no por ese vehiculo
  it('con cobertura y golpes pendientes, se cuentan sin decir que no hay conexión', () => {
    mockUseScoring.scoringView = null;
    mockUseScoring.error = new TypeError('Failed to fetch');
    mockUseScoring.isOffline = false;
    mockUseScoring.pendingQueueSize = 2;

    render(<ScoringPage />);

    expect(screen.getByTestId('pendientes-a-salvo')).toBeInTheDocument();
    expect(screen.queryByTestId('anotar-sin-conexion')).not.toBeInTheDocument();
  });

  // Fila 4: la pista se escondia por «hay error», y un portal cautivo da error
  // SIN respuesta. Es justo cuando «abrelo una vez con cobertura» es el consejo
  it('si el servidor no contestó, la pista de abrirlo con cobertura sigue estando', () => {
    mockUseScoring.scoringView = null;
    mockUseScoring.error = new TypeError('Failed to fetch');

    render(<ScoringPage />);

    expect(screen.getByText('offline.nothingCachedHint')).toBeInTheDocument();
  });
});

describe('ScoringPage · el gemelo: el recuadro con partido en pantalla (FE #617, CodeRabbit)', () => {
  // CodeRabbit lo dijo en el resumen, no como comentario de linea: arregle solo
  // el camino SIN vista, y el otro recuadro —el que sale con el partido ya
  // pintado cuando falla un sondeo o un envio— seguia imprimiendo `textoDe`. Por
  // ahi siguen llegando el `detail` en ingles del backend y el «HTTP 503:
  // Service Unavailable» que compone `api.js`
  afterEach(() => {
    mockUseScoring.error = null;
    mockUseScoring.pintadoDeMemoria = false;
  });

  it('un 503 con el partido en pantalla no se enseña como «HTTP 503: Service Unavailable»', () => {
    mockUseScoring.error = Object.assign(new Error('HTTP 503: Service Unavailable'), { status: 503 });

    render(<ScoringPage />);

    expect(screen.queryByText(/HTTP 503/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Service Unavailable/)).not.toBeInTheDocument();
  });

  it('y el detail en inglés del backend tampoco', () => {
    mockUseScoring.error = Object.assign(new Error('You are not a participant in this match'), { status: 403 });

    render(<ScoringPage />);

    expect(screen.queryByText(/You are not a participant/)).not.toBeInTheDocument();
    expect(screen.getByText('errors.forbidden')).toBeInTheDocument();
  });

  it('un fallo sin respuesta tampoco enseña el texto interno de fetch', () => {
    mockUseScoring.error = new TypeError('Failed to fetch (localhost:8000)');

    render(<ScoringPage />);

    expect(screen.queryByText(/Failed to fetch/)).not.toBeInTheDocument();
    expect(screen.queryByText(/localhost:8000/)).not.toBeInTheDocument();
  });
});

/**
 * LA TABLA — el recuadro rojo cuenta lo que falló (FE #626).
 *
 *   #   origen     | pintado de la foto | debe
 *   ----|----------|--------------------|-----------------------------------------
 *   1   golpe      | sí                 | rojo: no se guardó en el móvil, y el hoyo
 *   2   golpe      | no                 | igual
 *   3/4 golpe 4xx  | no                 | el texto de enviar la anotación
 *   5   tarjeta    | no                 | el de enviar la tarjeta
 *   5   concesión  | no                 | el de conceder
 *   6   carga 5xx  | no                 | «no se ha podido cargar», como antes
 *   7   carga      | sí                 | sin rojo: ya lo dice el ámbar
 *   8   carga 404  | no                 | «ya no está», como antes
 */
describe('ScoringPage · el recuadro rojo cuenta lo que falló (FE #626)', () => {
  const noSeGuardo = () => Object.assign(new Error('No se pudo guardar el golpe en el móvil'), {
    holeNumber: 14, noSeGuardo: true, i18nKey: 'scoring:errors.noSeGuardoEnElMovil',
  });
  const rechazo = (status) => Object.assign(new Error(`HTTP ${status}`), { status });

  afterEach(() => {
    mockUseScoring.pintadoDeMemoria = false;
    mockUseScoring.error = null;
    mockUseScoring.origenDelError = null;
  });

  it('1 · pintado de la foto, el golpe que no se guardó en el móvil se dice, con su hoyo', () => {
    mockUseScoring.pintadoDeMemoria = true;
    mockUseScoring.error = noSeGuardo();
    mockUseScoring.origenDelError = 'golpe';

    render(<ScoringPage />);

    expect(screen.getByTestId('pintado-de-memoria')).toBeInTheDocument();
    expect(screen.getByText(/scoring:errors\.noSeGuardoEnElMovil/)).toBeInTheDocument();
    expect(screen.getByText(/errors\.enElHoyo \{"hole":14\}/)).toBeInTheDocument();
  });

  it('2 · con la vista del servidor, el mismo texto y no el de carga', () => {
    mockUseScoring.error = noSeGuardo();
    mockUseScoring.origenDelError = 'golpe';

    render(<ScoringPage />);

    expect(screen.getByText(/scoring:errors\.noSeGuardoEnElMovil/)).toBeInTheDocument();
    expect(screen.queryByText(/offline\.noSePudoCargar/)).not.toBeInTheDocument();
  });

  it.each([409, 400, 422])('3/4 · un golpe rechazado con %s dice que no se pudo enviar la anotación', (estado) => {
    mockUseScoring.error = rechazo(estado);
    mockUseScoring.origenDelError = 'golpe';

    render(<ScoringPage />);

    expect(screen.getByText('errors.failedToSubmitScore')).toBeInTheDocument();
    expect(screen.queryByText(/offline\.noSePudoCargar/)).not.toBeInTheDocument();
  });

  it.each([
    ['tarjeta', 'errors.failedToSubmitScorecard'],
    ['concesion', 'errors.failedToConcede'],
  ])('5 · un fallo al %s dice eso, no que no cargó', (origen, clave) => {
    mockUseScoring.error = rechazo(409);
    mockUseScoring.origenDelError = origen;

    render(<ScoringPage />);

    expect(screen.getByText(clave)).toBeInTheDocument();
    expect(screen.queryByText(/offline\.noSePudoCargar/)).not.toBeInTheDocument();
  });

  it('un fallo de una acción sin hoyo no añade ningún hoyo', () => {
    mockUseScoring.error = rechazo(409);
    mockUseScoring.origenDelError = 'tarjeta';

    render(<ScoringPage />);

    expect(screen.queryByText(/errors\.enElHoyo/)).not.toBeInTheDocument();
  });

  it('6 · un fallo al cargar sigue diciendo que no se pudo cargar', () => {
    mockUseScoring.error = rechazo(503);
    mockUseScoring.origenDelError = 'carga';

    render(<ScoringPage />);

    expect(screen.getByText('offline.noSePudoCargar')).toBeInTheDocument();
  });

  it('7 · un fallo al cargar pintado de la foto no sale en rojo', () => {
    mockUseScoring.pintadoDeMemoria = true;
    mockUseScoring.error = rechazo(503);
    mockUseScoring.origenDelError = 'carga';

    render(<ScoringPage />);

    expect(screen.queryAllByText('retry')).toHaveLength(0);
    expect(screen.queryByText('offline.noSePudoCargar')).not.toBeInTheDocument();
  });

  it('8 · un 404 al cargar sigue diciendo que ya no está', () => {
    mockUseScoring.error = rechazo(404);
    mockUseScoring.origenDelError = 'carga';

    render(<ScoringPage />);

    expect(screen.getByText('errors.notFound')).toBeInTheDocument();
  });

  // #710, e2e del 24 sep: un foursomes 4&2 se decidió en el 16 y se jugó
  // hasta el 18. La cabecera decía «4UP Los borrachos · 18 hoyos jugados» y
  // quien la miraba creía que se había ganado 4 arriba en el 18
  describe('la cabecera de un partido decidido', () => {
    afterEach(() => {
      mockUseScoring.scoringView.isDecided = false;
      mockUseScoring.scoringView.decidedResult = null;
      mockUseScoring.scoringView.matchStanding = null;
    });

    it('C1: dice el resultado del partido, no el marcador del hoyo 18', () => {
      mockUseScoring.scoringView.isDecided = true;
      mockUseScoring.scoringView.decidedResult = { winner: 'A', score: '4&2' };
      mockUseScoring.scoringView.matchStanding = { status: '4UP', leadingTeam: 'A', holesPlayed: 18 };

      render(<ScoringPage />);

      const cabecera = screen.getByTestId('marcador-del-partido');
      expect(cabecera).toHaveTextContent('leaderboard.wins');
      expect(cabecera).toHaveTextContent('4&2');
      // El que gana, no el otro
      expect(cabecera).toHaveTextContent('Europe');
      expect(cabecera).not.toHaveTextContent('4UP');
      // La vuelta propia, aparte: los hoyos que se jugaron siguen contándose
      expect(cabecera).toHaveTextContent('holesPlayed');
    });

    it('C2: sin decidir, el marcador de siempre', () => {
      mockUseScoring.scoringView.matchStanding = { status: '2UP', leadingTeam: 'B', holesPlayed: 9 };

      render(<ScoringPage />);

      expect(screen.getByTestId('marcador-del-partido')).toHaveTextContent('2UP');
    });
  });

  it('C3: «gana» no depende del número del equipo (#710)', async () => {
    // «Los borrachos gana 4&2»: con un nombre en plural el verbo sonaba mal
    for (const idioma of ['es', 'en']) {
      const textos = (await import(`../../i18n/locales/${idioma}/scoring.json`)).default;
      expect(textos.leaderboard.wins, idioma).toMatch(/^\{\{score\}\}/);
      expect(textos.earlyEnd.message, idioma).not.toMatch(/\{\{team\}\} (gana|wins)/);
    }
  });

  // #710, e2e del 24 sep: con el partido decidido (4&2 en el 16) se seguía
  // ofreciendo «Conceder partido». No queda nada que conceder
  describe('conceder un partido decidido', () => {
    afterEach(() => {
      mockUseScoring.scoringView.isDecided = false;
      mockUseScoring.scoringView.matchStatus = 'IN_PROGRESS';
    });

    it('K1: decidido, ya no se ofrece conceder', () => {
      mockUseScoring.scoringView.matchStatus = 'IN_PROGRESS';
      mockUseScoring.scoringView.isDecided = true;

      render(<ScoringPage />);

      expect(screen.queryByText('concede.button')).not.toBeInTheDocument();
    });

    it('K3 (16 oct): con los 18 anotados y sin validar, ni conceder ni «Partido terminado»', () => {
      mockUseScoring.scoringView.matchStatus = 'IN_PROGRESS';
      mockUseScoring.scoringView.isDecided = false;
      mockUseScoring.partidoAcabado = true;
      mockUseScoring.canSubmitScorecard = false;
      try {
        render(<ScoringPage />);

        expect(screen.queryByText('concede.button')).not.toBeInTheDocument();
        expect(screen.getByTestId('barra-de-entrega')).toHaveTextContent('submit.allHolesScored');
        expect(screen.getByTestId('barra-de-entrega')).not.toHaveTextContent('submit.matchOver');
      } finally {
        mockUseScoring.partidoAcabado = false;
      }
    });

    it('K4: decidido y sin validar, sí es «Partido terminado»', () => {
      mockUseScoring.scoringView.matchStatus = 'IN_PROGRESS';
      mockUseScoring.scoringView.isDecided = true;
      mockUseScoring.partidoAcabado = true;
      mockUseScoring.canSubmitScorecard = false;
      try {
        render(<ScoringPage />);

        expect(screen.getByTestId('barra-de-entrega')).toHaveTextContent('submit.matchOver');
      } finally {
        mockUseScoring.partidoAcabado = false;
      }
    });

    it('K2: sin decidir, sí', () => {
      mockUseScoring.scoringView.matchStatus = 'IN_PROGRESS';
      mockUseScoring.scoringView.isDecided = false;

      render(<ScoringPage />);

      expect(screen.getByText('concede.button')).toBeInTheDocument();
    });
  });

  // CodeRabbit en la #721
  it('C4: decidido sin marcador todavía, la cabecera dice el resultado igual', () => {
    mockUseScoring.scoringView.isDecided = true;
    mockUseScoring.scoringView.decidedResult = { winner: 'B', score: '3&2' };
    mockUseScoring.scoringView.matchStanding = null;

    render(<ScoringPage />);

    expect(screen.getByTestId('marcador-del-partido')).toHaveTextContent('3&2');
    mockUseScoring.scoringView.isDecided = false;
    mockUseScoring.scoringView.decidedResult = null;
  });

  it('K3: si el partido se decide con el modal de conceder abierto, el modal se cierra', () => {
    mockUseScoring.scoringView.matchStatus = 'IN_PROGRESS';
    mockUseScoring.scoringView.isDecided = false;
    const { rerender } = render(<ScoringPage />);
    fireEvent.click(screen.getByText('concede.button'));
    expect(screen.getByTestId('concede-match-modal')).toBeInTheDocument();

    // El sondeo trae el partido ya decidido
    mockUseScoring.scoringView = { ...mockUseScoring.scoringView, isDecided: true };
    rerender(<ScoringPage />);

    expect(screen.queryByTestId('concede-match-modal')).not.toBeInTheDocument();
    mockUseScoring.scoringView = { ...mockUseScoring.scoringView, isDecided: false };
  });
});

/**
 * LA TABLA de la FE #732: un partido cerrado sin jugarlo hasta el final.
 *
 * Tras conceder, la pantalla seguía en «Empate · 0 hoyos» con la anotación
 * abierta. Con RyderCupAM#384 la vista trae el ganador (`decidedResult` con
 * score CONCEDED o W/O).
 *
 *   #   caso                        | qué pasa
 *   ----|---------------------------|-----------------------------------------------
 *   K1  concedido                   | cabecera «Europa (Concedido)», no «CONCEDED para…»
 *   K2  walkover                    | cabecera «… (Walkover)»
 *   K3  cerrado                     | aviso en lugar de la casilla; sin modal de decidido
 *   K4  cerrado                     | ni «Enviar tarjeta» ni «Conceder»
 *   K5  decidido por los hoyos      | como siempre: «4&2 para …» y su modal
 */
describe('ScoringPage · un partido cerrado sin jugarlo hasta el final (FE #732)', () => {
  const cerrar = (matchStatus, score, winner = 'A') => {
    mockUseScoring.scoringView.matchStatus = matchStatus;
    mockUseScoring.scoringView.isDecided = true;
    mockUseScoring.scoringView.decidedResult = { winner, score };
    mockUseScoring.canSubmitScorecard = true;
  };

  afterEach(() => {
    mockUseScoring.scoringView.matchStatus = 'IN_PROGRESS';
    mockUseScoring.scoringView.isDecided = false;
    mockUseScoring.scoringView.decidedResult = null;
    mockUseScoring.scoringView.matchStanding = null;
    mockUseScoring.canSubmitScorecard = false;
    mockUseScoring.hasSubmitted = false;
  });

  it.each([
    ['K1: concedido', 'CONCEDED', 'CONCEDED', 'leaderboard.conceded {"team":"Europe"}'],
    ['K2: walkover', 'WALKOVER', 'W/O', 'leaderboard.walkover {"team":"Europe"}'],
  ])('%s: la cabecera lo dice como la clasificación', (_caso, estado, score, texto) => {
    cerrar(estado, score);
    render(<ScoringPage />);

    expect(screen.getByTestId('marcador-del-partido')).toHaveTextContent(texto);
  });

  it('K3: en lugar de la casilla, un aviso; y sin el modal de «decidido»', () => {
    cerrar('CONCEDED', 'CONCEDED', 'B');
    render(<ScoringPage />);

    expect(screen.getByTestId('partido-cerrado')).toHaveTextContent(
      'closed.conceded {"team":"USA"}'
    );
    expect(screen.queryByTestId('hole-input')).toBeNull();
    expect(screen.queryByTestId('early-end-modal')).toBeNull();
  });

  it('K4: ni enviar tarjeta ni conceder', () => {
    cerrar('WALKOVER', 'W/O');
    render(<ScoringPage />);
    fireEvent.click(screen.getByText('tabs.scorecard'));

    expect(screen.queryByText('submit.button')).toBeNull();
    expect(screen.queryByText('concede.button')).toBeNull();
  });

  it('K4b: ni el aviso de «la tarjeta no está lista»: no hay tarjeta que entregar', () => {
    cerrar('CONCEDED', 'CONCEDED');
    mockUseScoring.canSubmitScorecard = false;
    render(<ScoringPage />);
    fireEvent.click(screen.getByText('tabs.scorecard'));

    expect(screen.queryByText('submit.notReady')).toBeNull();
  });

  it('K6: cerrado sin ganador (backend anterior a RyderCupAM#384): aviso genérico, sin el marcador de los hoyos', () => {
    mockUseScoring.scoringView.matchStatus = 'CONCEDED';
    mockUseScoring.scoringView.matchStanding = { status: '2UP', leadingTeam: 'A', holesPlayed: 5 };
    render(<ScoringPage />);

    expect(screen.getByTestId('partido-cerrado')).toHaveTextContent('closed.generic');
    expect(screen.getByTestId('marcador-del-partido')).toHaveTextContent('closed.title');
    expect(screen.getByTestId('marcador-del-partido')).not.toHaveTextContent('2UP');
    expect(screen.queryByTestId('hole-input')).toBeNull();
  });

  it('K6b: y sin marcador de hoyos también lo dice arriba', () => {
    mockUseScoring.scoringView.matchStatus = 'WALKOVER';
    render(<ScoringPage />);

    expect(screen.getByTestId('marcador-del-partido')).toHaveTextContent('closed.title');
  });

  it('K7: entregada su tarjeta y cerrado después por walkover, ya no espera a nadie', () => {
    cerrar('WALKOVER', 'W/O');
    mockUseScoring.hasSubmitted = true;
    render(<ScoringPage />);
    fireEvent.click(screen.getByText('tabs.scorecard'));

    expect(screen.getByText('submit.matchCompleted')).toBeInTheDocument();
  });

  it('K8: si se cierra con el modal de conceder abierto, el modal se va (CodeRabbit)', () => {
    const { rerender } = render(<ScoringPage />);
    fireEvent.click(screen.getByText('concede.button'));
    expect(screen.getByTestId('concede-match-modal')).toBeInTheDocument();

    // Llega cerrado y sin ganador (un backend anterior): isDecided sigue false
    mockUseScoring.scoringView.matchStatus = 'CONCEDED';
    rerender(<ScoringPage />);

    expect(screen.queryByTestId('concede-match-modal')).toBeNull();
  });

  it('K9: y el de enviar la tarjeta, igual', () => {
    mockUseScoring.canSubmitScorecard = true;
    const { rerender } = render(<ScoringPage />);
    fireEvent.click(screen.getByText('tabs.scorecard'));
    fireEvent.click(screen.getByText('submit.button'));
    expect(screen.getByTestId('submit-scorecard-modal')).toBeInTheDocument();

    mockUseScoring.scoringView.matchStatus = 'WALKOVER';
    rerender(<ScoringPage />);

    expect(screen.queryByTestId('submit-scorecard-modal')).toBeNull();
  });

  it('K5: decidido por los hoyos sigue como siempre', () => {
    mockUseScoring.scoringView.isDecided = true;
    mockUseScoring.scoringView.decidedResult = { winner: 'A', score: '4&2' };
    render(<ScoringPage />);

    expect(screen.getByTestId('marcador-del-partido')).toHaveTextContent(
      'leaderboard.wins {"team":"Europe","score":"4&2"}'
    );
    expect(screen.getByTestId('hole-input')).toBeInTheDocument();
    expect(screen.getByTestId('early-end-modal')).toBeInTheDocument();
  });
});

/**
 * FE #745 · al acabar, entregar la tarjeta desde cualquier pestaña. El botón
 * vivía solo en Tarjeta y la pantalla abre en Anotar: quien acababa el 18 no
 * veía nada, y los partidos se quedaban abiertos.
 *
 *   P1  acabado y listo, en Anotar   | la barra, y su botón abre la confirmación
 *   P2  a medias                     | sin barra
 *   P3  espectador                   | sin barra
 *   P4  concedido o walkover         | sin barra: lo dice su aviso
 *   P5  pestaña Tarjeta              | un solo botón de enviar, el de la barra
 *   P6  con la barra                 | la página deja hueco para que no tape nada
 */
describe('ScoringPage · la barra de entregar la tarjeta (FE #745)', () => {
  const acabado = () => {
    mockUseScoring.partidoAcabado = true;
    mockUseScoring.scoringView.isDecided = true;
    mockUseScoring.scoringView.decidedResult = { winner: 'A', score: '3&2' };
    mockUseScoring.canSubmitScorecard = true;
  };

  afterEach(() => {
    mockUseScoring.partidoAcabado = false;
    mockUseScoring.scoringView.isDecided = false;
    mockUseScoring.scoringView.decidedResult = null;
    mockUseScoring.scoringView.matchStatus = 'IN_PROGRESS';
    mockUseScoring.canSubmitScorecard = false;
    mockUseScoring.isMatchPlayer = true;
  });

  it('P1: acabado y listo, la barra sale en Anotar y su botón abre la confirmación', () => {
    acabado();
    render(<ScoringPage />);

    const barra = screen.getByTestId('barra-de-entrega');
    fireEvent.click(within(barra).getByRole('button', { name: 'submit.button' }));
    expect(screen.getByTestId('submit-scorecard-modal')).toBeInTheDocument();
  });

  it('P2: a medias, sin barra', () => {
    render(<ScoringPage />);

    expect(screen.queryByTestId('barra-de-entrega')).toBeNull();
  });

  it('P3: a un espectador no le sale', () => {
    acabado();
    mockUseScoring.isMatchPlayer = false;
    mockUseScoring.canSubmitScorecard = false;
    render(<ScoringPage />);

    expect(screen.queryByTestId('barra-de-entrega')).toBeNull();
  });

  it('P4: concedido, sin barra: ya lo dice su aviso', () => {
    acabado();
    mockUseScoring.scoringView.matchStatus = 'CONCEDED';
    render(<ScoringPage />);

    expect(screen.queryByTestId('barra-de-entrega')).toBeNull();
  });

  it('P5: en la pestaña Tarjeta hay un solo botón de enviar, el de la barra', () => {
    acabado();
    render(<ScoringPage />);
    fireEvent.click(screen.getByTestId('tab-scorecard'));

    expect(screen.getAllByText('submit.button')).toHaveLength(1);
    expect(within(screen.getByTestId('barra-de-entrega')).getByText('submit.button')).toBeInTheDocument();
  });

  it('P6: con la barra, la página deja hueco abajo para que no tape nada', () => {
    acabado();
    render(<ScoringPage />);

    expect(screen.getByTestId('hueco-de-la-barra')).toBeInTheDocument();
  });

  it('P7: decidido en el 11, la barra dice que se puede seguir jugando', () => {
    acabado();
    mockUseScoring.holesToSubmit = 11;
    render(<ScoringPage />);

    expect(within(screen.getByTestId('barra-de-entrega')).getByText('submit.keepPlaying')).toBeInTheDocument();
    mockUseScoring.holesToSubmit = 18;
  });

  it('P8: con los 18 jugados, ya no', () => {
    acabado();
    mockUseScoring.holesToSubmit = 18;
    render(<ScoringPage />);

    expect(within(screen.getByTestId('barra-de-entrega')).queryByText('submit.keepPlaying')).toBeNull();
  });
});

describe('ScoringPage · los pendientes con cobertura, también con el partido en pantalla (FE #625)', () => {
  // Con el servidor caído y cobertura, el golpe se queda en la cola y la casilla
  // lo enseña: sin aviso, nada hace sospechar que el otro jugador no lo ve
  afterEach(() => {
    mockUseScoring.isOffline = false;
    mockUseScoring.pendingQueueSize = 0;
  });

  it('P1 · con cobertura y golpes pendientes se cuentan, sin decir que no hay conexión', () => {
    mockUseScoring.pendingQueueSize = 1;

    render(<ScoringPage />);

    expect(screen.getByTestId('pendientes-a-salvo')).toBeInTheDocument();
    expect(screen.getByText(/offline\.pendingScores/)).toBeInTheDocument();
    expect(screen.queryByTestId('anotar-sin-conexion')).not.toBeInTheDocument();
  });

  it('P2 · sin cobertura sigue el banner de siempre, y no los dos a la vez', () => {
    mockUseScoring.isOffline = true;
    mockUseScoring.pendingQueueSize = 2;

    render(<ScoringPage />);

    expect(screen.getByTestId('anotar-sin-conexion')).toBeInTheDocument();
    expect(screen.queryByTestId('pendientes-a-salvo')).not.toBeInTheDocument();
  });

  // Si el vaciado se paró por el almacenamiento, «se enviarán en cuanto el
  // servidor responda» es falso: no se van a enviar, y su aviso ya lo explica
  it('P4 · con el aviso del almacenamiento en pantalla, no se promete el envío', () => {
    mockUseScoring.pendingQueueSize = 1;
    mockUseScoring.avisoDelVaciado = 'no-se-pudo-borrar';

    render(<ScoringPage />);

    expect(screen.queryByTestId('pendientes-a-salvo')).not.toBeInTheDocument();
    mockUseScoring.avisoDelVaciado = null;
  });

  it('P3 · con cobertura y la cola vacía, ningún aviso', () => {
    render(<ScoringPage />);

    expect(screen.queryByTestId('pendientes-a-salvo')).not.toBeInTheDocument();
    expect(screen.queryByTestId('anotar-sin-conexion')).not.toBeInTheDocument();
  });
});

describe('ScoringPage · los hoyos que no se pudieron guardar (FE #622)', () => {
  afterEach(() => {
    mockUseScoring.noGuardados = {};
  });

  it('P1 · un aviso propio con la lista de hoyos', () => {
    mockUseScoring.noGuardados = { 7: { turno: 3, golpes: ['ownScore'] }, 5: { turno: 1, golpes: ['ownScore'] } };

    render(<ScoringPage />);

    const aviso = screen.getByTestId('no-guardados');
    expect(aviso).toHaveAttribute('role', 'alert');
    expect(aviso.textContent).toContain('offline.noGuardados');
    expect(aviso.textContent).toContain('"count":2');
    expect(aviso.textContent).toContain('"holes":"5, 7"');
  });

  it('P1b · sin hoyos pendientes, sin aviso', () => {
    render(<ScoringPage />);

    expect(screen.queryByTestId('no-guardados')).not.toBeInTheDocument();
  });

  // Revisión: si ya no se puede anotar, «vuelve a anotarlo» pide algo
  // imposible. Se sigue diciendo que no se guardaron, con otro texto
  describe('P5 · cuando ya no se puede anotar', () => {
    afterEach(() => {
      mockUseScoring.canScore = true;
      mockUseScoring.isOwnScoreLocked = false;
      mockUseScoring.isMarkerScoreLocked = false;
      mockUseScoring.marcaBloqueadaPara = (id) => !id || mockUseScoring.isMarkerScoreLocked;
    });

    it.each([
      ['sin permiso para anotar', () => { mockUseScoring.canScore = false; }],
      ['con los dos golpes bloqueados', () => {
        mockUseScoring.isOwnScoreLocked = true;
        mockUseScoring.isMarkerScoreLocked = true;
      }],
    ])('%s, el aviso no pide volver a anotar', (_, prepara) => {
      mockUseScoring.noGuardados = { 5: { turno: 1, golpes: ['ownScore', 'markedScore'] } };
      prepara();

      render(<ScoringPage />);

      const aviso = screen.getByTestId('no-guardados');
      expect(aviso.textContent).toContain('offline.noGuardadosSinAnotar');
      expect(aviso.textContent).not.toContain('offline.noGuardados ');
    });

    it('se perdió el del marcado y solo está bloqueado el propio: todavía se puede', () => {
      mockUseScoring.noGuardados = { 5: { turno: 1, golpes: ['markedScore'] } };
      mockUseScoring.isOwnScoreLocked = true;

      render(<ScoringPage />);

      expect(screen.getByTestId('no-guardados').textContent).toContain('offline.noGuardados ');
      expect(screen.getByTestId('no-guardados').textContent).not.toContain('noGuardadosSinAnotar');
    });

    // /code-review (26 oct 2026): quien marca a dos mira el bloqueo de ESE marcado
    it('la marca perdida era de Dani y solo entregó Carlos: todavía se puede', () => {
      mockUseScoring.noGuardados = { 5: { turno: 1, golpes: ['markedScore'], marcado: 'u4' } };
      mockUseScoring.isOwnScoreLocked = true;
      mockUseScoring.isMarkerScoreLocked = true;
      mockUseScoring.marcaBloqueadaPara = (id) => id === 'u2';

      render(<ScoringPage />);

      expect(screen.getByTestId('no-guardados').textContent).toContain('offline.noGuardados ');
    });

    it('la marca perdida era de Carlos, que entregó: ya no se puede', () => {
      mockUseScoring.noGuardados = { 5: { turno: 1, golpes: ['markedScore'], marcado: 'u2' } };
      mockUseScoring.isOwnScoreLocked = true;
      mockUseScoring.marcaBloqueadaPara = (id) => id === 'u2';

      render(<ScoringPage />);

      expect(screen.getByTestId('no-guardados').textContent).toContain('noGuardadosSinAnotar');
    });

    // Segunda revisión: mira qué golpe se perdió, no si están bloqueados los dos
    it('se perdió el propio y está bloqueado el propio: ya no se puede', () => {
      mockUseScoring.noGuardados = { 5: { turno: 1, golpes: ['ownScore'] } };
      mockUseScoring.isOwnScoreLocked = true;

      render(<ScoringPage />);

      expect(screen.getByTestId('no-guardados').textContent).toContain('offline.noGuardadosSinAnotar');
    });

    it('con hoyos de los dos tipos, una frase para cada uno', () => {
      mockUseScoring.noGuardados = {
        5: { turno: 1, golpes: ['markedScore'] },
        7: { turno: 2, golpes: ['ownScore'] },
      };
      mockUseScoring.isOwnScoreLocked = true;

      render(<ScoringPage />);

      const texto = screen.getByTestId('no-guardados').textContent;
      expect(texto).toContain('offline.noGuardados {"count":1,"holes":"5"}');
      expect(texto).toContain('offline.noGuardadosSinAnotar {"count":1,"holes":"7"}');
    });
  });

  it('P2 · el selector recibe los hoyos para marcarlos', () => {
    mockUseScoring.noGuardados = { 7: { turno: 3, golpes: ['ownScore'] }, 5: { turno: 1, golpes: ['ownScore'] } };

    render(<ScoringPage />);

    expect(selector.props.noGuardados).toEqual([5, 7]);
  });

  // La casilla guarda su propia selección y solo adopta la vista cuando esta
  // CAMBIA. Si falla guardar el 5 mientras el 4 va en camino, la vista sigue
  // diciendo 4 y la casilla enseñaba un 5 que no estaba en ningún sitio
  it('P3 · al no poder guardar el hoyo en pantalla, la casilla vuelve a lo guardado', () => {
    const { rerender } = render(<ScoringPage />);
    const antes = casilla.montajes;

    mockUseScoring.noGuardados = { 1: { turno: 2, golpes: ['ownScore'] } };
    rerender(<ScoringPage />);
    expect(casilla.montajes).toBe(antes + 1);

    // Y otra vez si vuelve a fallar
    mockUseScoring.noGuardados = { 1: { turno: 4, golpes: ['ownScore'] } };
    rerender(<ScoringPage />);
    expect(casilla.montajes).toBe(antes + 2);
  });

  it('P4 · el fallo de otro hoyo no toca la casilla en pantalla', () => {
    const { rerender } = render(<ScoringPage />);
    const antes = casilla.montajes;

    mockUseScoring.noGuardados = { 5: { turno: 2, golpes: ['ownScore'] } };
    rerender(<ScoringPage />);

    expect(casilla.montajes).toBe(antes);
  });
});

describe('ScoringPage — el mapa del hoyo (BE #532)', () => {
  const vistaOriginal = mockUseScoring.scoringView;
  afterEach(() => {
    mockUseScoring.scoringView = vistaOriginal;
  });
  beforeEach(() => {
    mockUseScoring.scoringView = { ...vistaOriginal, roundInfo: { ...vistaOriginal.roundInfo, golfCourseId: 'gc-1' } };
    mapaHoyo.valor = { abierto: false, abrir: vi.fn(), cerrar: vi.fn(), mapaDelCampo: null, disponible: true };
    mapaHoyo.ventana = null;
  });

  it('pide el mapa del campo de lo que se anota', () => {
    render(<ScoringPage />);

    expect(mapaHoyo.args).toEqual({ golfCourseId: 'gc-1', cerrarSi: false, pais: null });
  });

  it('T2 (16 oct): «Mapa» va entre Anterior y Siguiente, y lo abre', () => {
    render(<ScoringPage />);

    const boton = screen.getByRole('button', { name: 'mapa.abrir' });
    expect(boton.previousElementSibling).toHaveTextContent('input.prevHole');
    expect(boton.nextElementSibling).toHaveTextContent('input.nextHole');
    fireEvent.click(boton);
    expect(mapaHoyo.valor.abrir).toHaveBeenCalled();
  });

  it('19 oct: el mapa recibe el país del campo; si no hay mapa en él, sin «Mapa»', () => {
    mockUseScoring.scoringView = { ...vistaOriginal, roundInfo: { ...vistaOriginal.roundInfo, golfCourseId: 'gc-1', golfCourseCountryCode: 'PT' } };
    mapaHoyo.valor = { ...mapaHoyo.valor, disponible: false };

    render(<ScoringPage />);

    expect(mapaHoyo.args.pais).toBe('PT');
    expect(screen.queryByRole('button', { name: 'mapa.abrir' })).toBeNull();
  });

  it('la ventana del mapa recibe el hoyo que se anota', () => {
    render(<ScoringPage />);

    expect(mapaHoyo.ventana).toMatchObject({ golfCourseId: 'gc-1', numeroDeHoyo: 1, par: 4 });
    expect(mapaHoyo.ventana.mapaDelHoyo).toBe(mapaHoyo.valor);
  });

  // RyderCupWeb #880: la Ryder marca y envía muestras como el resto
  const conJugadores = (players) => {
    mockUseScoring.scoringView = { ...mockUseScoring.scoringView, players };
  };

  it('F2: a la ventana le llega mi barra (color y sexo)', () => {
    conJugadores([
      { userId: 'u1', userName: 'Yo', team: 'A', color: 'YELLOW', teeGender: 'MALE', holeCard: [] },
      { userId: 'u2', userName: 'Rival', team: 'B', color: 'RED', teeGender: 'FEMALE', holeCard: [] },
    ]);

    render(<ScoringPage />);

    expect(mapaHoyo.ventana.barra).toEqual({ color: 'YELLOW', gender: 'MALE' });
    expect(mapaHoyo.ventana.userId).toBe('u1');
  });

  it('F2: mi barra sin sexo va con gender null', () => {
    conJugadores([{ userId: 'u1', userName: 'Yo', team: 'A', color: 'YELLOW', teeGender: null, holeCard: [] }]);

    render(<ScoringPage />);

    expect(mapaHoyo.ventana.barra).toEqual({ color: 'YELLOW', gender: null });
  });

  it('F3: si no juego en el partido (el organizador), no hay barra', () => {
    conJugadores([
      { userId: 'u2', userName: 'A', team: 'A', color: 'YELLOW', teeGender: 'MALE', holeCard: [] },
      { userId: 'u3', userName: 'B', team: 'B', color: 'RED', teeGender: 'FEMALE', holeCard: [] },
    ]);

    render(<ScoringPage />);

    expect(mapaHoyo.ventana.barra).toBeNull();
  });

  it('F3: mi barra sin color, no hay barra', () => {
    conJugadores([{ userId: 'u1', userName: 'Yo', team: 'A', color: null, teeGender: 'MALE', holeCard: [] }]);

    render(<ScoringPage />);

    expect(mapaHoyo.ventana.barra).toBeNull();
  });

  it('F4: en foursomes cada uno envía con SU barra (no la del compañero)', () => {
    conJugadores([
      { userId: 'u4', userName: 'Compañera', team: 'A', color: 'RED', teeGender: 'FEMALE', holeCard: [] },
      { userId: 'u1', userName: 'Yo', team: 'A', color: 'WHITE', teeGender: 'MALE', holeCard: [] },
      { userId: 'u2', userName: 'R1', team: 'B', color: 'YELLOW', teeGender: 'MALE', holeCard: [] },
      { userId: 'u3', userName: 'R2', team: 'B', color: 'YELLOW', teeGender: 'MALE', holeCard: [] },
    ]);
    mockUseScoring.scoringView = { ...mockUseScoring.scoringView, matchFormat: 'FOURSOMES' };

    render(<ScoringPage />);

    expect(mapaHoyo.ventana.barra).toEqual({ color: 'WHITE', gender: 'MALE' });
  });

  it('T1: en la tarjeta no se pide el GPS', () => {
    const watchPosition = vi.fn();
    vi.stubGlobal('navigator', { ...globalThis.navigator, geolocation: { watchPosition, clearWatch: vi.fn() } });
    try {
      render(<ScoringPage />);
    } finally {
      vi.unstubAllGlobals();
    }

    expect(watchPosition).not.toHaveBeenCalled();
  });
});

describe('ScoringPage — sesión tomada con el mapa abierto', () => {
  afterEach(() => {
    mockUseScoring.isSessionBlocked = false;
  });

  it('el mapa se cierra para que «Volver» salga de la anotación', () => {
    mockUseScoring.isSessionBlocked = true;

    render(<ScoringPage />);

    expect(mapaHoyo.args.cerrarSi).toBe(true);
  });
});

// Fourball con un jugador retirado (25 oct 2026, tabla F1–F10)
describe('ScoringPage · fourball con un retirado', () => {
  const vistaOriginal = mockUseScoring.scoringView;
  const original = { ...mockUseScoring };
  // Borrando lo añadido: `Object.assign` solo no quita una clave nueva, y el
  // `isWithdrawn` de un test se colaba en el siguiente
  afterEach(() => {
    for (const clave of Object.keys(mockUseScoring)) {
      if (!(clave in original)) delete mockUseScoring[clave];
    }
    Object.assign(mockUseScoring, original);
    mockUseScoring.scoringView = vistaOriginal;
  });

  const fourball = (extra = {}) => ({
    ...vistaOriginal,
    matchFormat: 'FOURBALL',
    withdrawnPlayerIds: [],
    players: [
      { userId: 'u1', userName: 'Ana', team: 'A' },
      { userId: 'u3', userName: 'Bea', team: 'A' },
      { userId: 'u2', userName: 'Carlos', team: 'B' },
      { userId: 'u4', userName: 'Dani', team: 'B' },
    ],
    markerAssignments: [
      { scorerUserId: 'u1', marksUserId: 'u2', marksName: 'Carlos', markedByUserId: 'u4', markedByName: 'Dani' },
      { scorerUserId: 'u3', marksUserId: 'u4', marksName: 'Dani', markedByUserId: 'u2', markedByName: 'Carlos' },
      { scorerUserId: 'u2', marksUserId: 'u3', marksName: 'Bea', markedByUserId: 'u1', markedByName: 'Ana' },
      { scorerUserId: 'u4', marksUserId: 'u1', marksName: 'Ana', markedByUserId: 'u3', markedByName: 'Bea' },
    ],
    ...extra,
  });

  it('F2: ofrece retirarme y retirar a mi pareja, y retirar llama al hook', () => {
    const retirarJugador = vi.fn();
    Object.assign(mockUseScoring, { scoringView: fourball(), retirarJugador });

    render(<ScoringPage />);
    fireEvent.click(screen.getByRole('button', { name: 'withdraw.withdrawPartner {"nombre":"Bea"}' }));
    fireEvent.click(screen.getByRole('button', { name: 'withdraw.confirmYes' }));

    expect(screen.getByRole('button', { name: 'withdraw.withdrawMe' })).toBeInTheDocument();
    expect(retirarJugador).toHaveBeenCalledWith('u3', { deshacer: false });
  });

  it('F2c: en individual no hay retirada', () => {
    render(<ScoringPage />);
    expect(screen.queryByTestId('retirada-del-fourball')).not.toBeInTheDocument();
  });

  it('F3: retirado, el aviso para volver y sin barra de entregar', () => {
    Object.assign(mockUseScoring, {
      scoringView: fourball({ withdrawnPlayerIds: ['u1'] }),
      isWithdrawn: true,
      canScore: false,
      partidoAcabado: true,
    });

    render(<ScoringPage />);

    expect(screen.getByText('withdraw.youAreWithdrawn')).toBeInTheDocument();
    expect(screen.queryByTestId('hueco-de-la-barra')).not.toBeInTheDocument();
  });

  it('F4 y F6: la tarjeta y el selector reciben a los retirados', () => {
    Object.assign(mockUseScoring, { scoringView: fourball({ withdrawnPlayerIds: ['u3'] }) });

    render(<ScoringPage />);
    // La tarjeta vive en su pestaña, que no se monta hasta abrirla
    fireEvent.click(screen.getByTestId('tab-scorecard'));

    expect(tarjeta.props.retirados).toEqual(['u3']);
    expect(selector.props.retirados).toEqual(['u3']);
  });

  it('F4: el retirado no está en «falta por entregar»', () => {
    Object.assign(mockUseScoring, {
      scoringView: fourball({ withdrawnPlayerIds: ['u3'], scorecardSubmittedBy: ['u1'] }),
      hasSubmitted: true,
    });

    render(<ScoringPage />);

    const barra = screen.getByTestId('barra-de-entrega');
    expect(barra).toHaveTextContent('Carlos');
    expect(barra).not.toHaveTextContent('Bea');
  });

  it('F5: marcando a dos, se elige a quién; el golpe va al elegido', () => {
    const submitScore = vi.fn();
    Object.assign(mockUseScoring, {
      submitScore,
      scoringView: fourball({
        withdrawnPlayerIds: ['u3'],
        markerAssignments: [
          { scorerUserId: 'u1', marksUserId: 'u2', marksName: 'Carlos', markedByUserId: 'u4', markedByName: 'Dani' },
          { scorerUserId: 'u1', marksUserId: 'u4', marksName: 'Dani', markedByUserId: 'u4', markedByName: 'Dani' },
          { scorerUserId: 'u4', marksUserId: 'u1', marksName: 'Ana', markedByUserId: 'u1', markedByName: 'Ana' },
          { scorerUserId: 'u2', marksUserId: 'u4', marksName: 'Dani', markedByUserId: 'u1', markedByName: 'Ana' },
        ],
      }),
    });

    render(<ScoringPage />);
    expect(screen.getByTestId('a-quien-anoto')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Dani' }));
    casilla.props.onScoreChange({ ownScore: 4, markedScore: 5 }, ['markedScore']);

    expect(submitScore).toHaveBeenLastCalledWith(1, { ownScore: 4, markedPlayerId: 'u4', markedScore: 5 }, { tocado: ['markedScore'] });
  });

  const dosMarcados = (extra = {}) =>
    fourball({
      withdrawnPlayerIds: ['u3'],
      markerAssignments: [
        { scorerUserId: 'u1', marksUserId: 'u2', marksName: 'Carlos', markedByUserId: 'u2', markedByName: 'Carlos' },
        { scorerUserId: 'u1', marksUserId: 'u4', marksName: 'Dani', markedByUserId: 'u2', markedByName: 'Carlos' },
        { scorerUserId: 'u2', marksUserId: 'u1', marksName: 'Ana', markedByUserId: 'u1', markedByName: 'Ana' },
      ],
      ...extra,
    });

  it('sin nadie a quien marcar (el rival que marcaba al retirado), su golpe sale solo', () => {
    const submitScore = vi.fn();
    Object.assign(mockUseScoring, {
      submitScore,
      scoringView: fourball({
        withdrawnPlayerIds: ['u4'],
        markerAssignments: [
          { scorerUserId: 'u3', marksUserId: 'u2', marksName: 'Carlos', markedByUserId: 'u2', markedByName: 'Carlos' },
          { scorerUserId: 'u2', marksUserId: 'u3', marksName: 'Bea', markedByUserId: 'u3', markedByName: 'Bea' },
        ],
      }),
    });

    render(<ScoringPage />);
    casilla.props.onScoreChange({ ownScore: 4, markedScore: undefined }, ['ownScore']);

    expect(submitScore).toHaveBeenLastCalledWith(1, { ownScore: 4 }, { tocado: ['ownScore'] });
    expect(casilla.props.isMarkerScoreLocked).toBe(true);
  });

  // /code-review (26 oct 2026)
  const sinMarcado = () => fourball({
    withdrawnPlayerIds: ['u4'],
    markerAssignments: [
      { scorerUserId: 'u3', marksUserId: 'u2', marksName: 'Carlos', markedByUserId: 'u2', markedByName: 'Carlos' },
      { scorerUserId: 'u2', marksUserId: 'u1', marksName: 'Ana', markedByUserId: 'u3', markedByName: 'Bea' },
    ],
  });

  it('sin marcado: sin casilla de marca y con quien me anota a mí', () => {
    Object.assign(mockUseScoring, { scoringView: sinMarcado() });

    render(<ScoringPage />);

    expect(casilla.props.marksSomeone).toBe(false);
    expect(casilla.props.markerName).toBe('Carlos');
  });

  it('un admin que no juega no manda golpe propio', () => {
    const submitScore = vi.fn();
    Object.assign(mockUseScoring, { submitScore, scoringView: sinMarcado(), isMatchPlayer: false, canScore: true });

    render(<ScoringPage />);
    casilla.props.onScoreChange({ ownScore: 4 }, ['ownScore']);

    expect(submitScore).not.toHaveBeenCalled();
  });

  it('sin marcado y solo tocando la marca, no se manda nada', () => {
    const submitScore = vi.fn();
    Object.assign(mockUseScoring, { submitScore, scoringView: sinMarcado() });

    render(<ScoringPage />);
    casilla.props.onScoreChange({ ownScore: undefined, markedScore: 3 }, ['markedScore']);

    expect(submitScore).not.toHaveBeenCalled();
  });

  it('los botones de retirada van con su propio indicador, no con el de los golpes', () => {
    Object.assign(mockUseScoring, { scoringView: fourball(), isSubmitting: true, retirando: false });
    const { unmount } = render(<ScoringPage />);
    expect(screen.getByRole('button', { name: 'withdraw.withdrawMe' })).toBeEnabled();
    unmount();

    Object.assign(mockUseScoring, { isSubmitting: false, retirando: true });
    render(<ScoringPage />);
    expect(screen.getByRole('button', { name: 'withdraw.withdrawMe' })).toBeDisabled();
  });

  it('con algo sin enviar en el hoyo, el selector se queda en ese marcado y lo dice', () => {
    Object.assign(mockUseScoring, {
      scoringView: dosMarcados(),
      marcadoPendienteEn: (hoyo) => (hoyo === 1 ? 'u4' : null),
    });

    render(<ScoringPage />);

    expect(screen.getByRole('radio', { name: 'Dani' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Carlos' })).toBeDisabled();
    expect(screen.getByText('withdraw.oneAtATime {"nombre":"Dani"}')).toBeInTheDocument();
  });

  it('la elección es del hoyo: en el siguiente vuelve al primero sin golpe', () => {
    Object.assign(mockUseScoring, { scoringView: dosMarcados() });
    const { rerender } = render(<ScoringPage />);
    fireEvent.click(screen.getByRole('radio', { name: 'Dani' }));
    expect(screen.getByRole('radio', { name: 'Dani' })).toBeChecked();

    mockUseScoring.currentHole = 2;
    rerender(<ScoringPage />);

    expect(screen.getByRole('radio', { name: 'Carlos' })).toBeChecked();
  });

  it('la casilla se bloquea según el marcado elegido, no el primero', () => {
    Object.assign(mockUseScoring, {
      scoringView: dosMarcados(),
      marcaBloqueadaPara: (id) => id === 'u2',
    });

    render(<ScoringPage />);
    expect(casilla.props.isMarkerScoreLocked).toBe(true);
    fireEvent.click(screen.getByRole('radio', { name: 'Dani' }));

    expect(casilla.props.isMarkerScoreLocked).toBe(false);
  });

  it('F5: marcando a uno, no hay selector', () => {
    Object.assign(mockUseScoring, { scoringView: fourball() });
    render(<ScoringPage />);
    expect(screen.queryByTestId('a-quien-anoto')).not.toBeInTheDocument();
  });
});

