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
};

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
const casilla = vi.hoisted(() => ({ props: null }));

// Mock all scoring components to simple stubs
vi.mock('../../components/scoring/HoleInput', () => ({
  default: (props) => {
    casilla.props = props;
    return <div data-testid="hole-input">HoleInput {props.holeNumber}</div>;
  },
}));
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
vi.mock('../../components/scoring/PreMatchInfo', () => ({
  default: () => <div data-testid="pre-match-info">PreMatchInfo</div>,
}));
vi.mock('../../components/scoring/MatchSummaryCard', () => ({
  default: ({ winnerName }) => (
    <div data-testid="match-summary-card">MatchSummaryCard {winnerName}</div>
  ),
}));
vi.mock('../../components/scoring/OfflineBanner', () => ({
  default: () => <div data-testid="offline-banner">OfflineBanner</div>,
}));
vi.mock('../../components/scoring/SessionBlockedModal', () => ({
  default: ({ isOpen }) => isOpen ? <div data-testid="session-blocked-modal">SessionBlocked</div> : null,
}));
vi.mock('../../components/scoring/EarlyEndModal', () => ({
  default: ({ isOpen, onConfirm }) => isOpen ? (
    <div data-testid="early-end-modal">
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

    casilla.props.onScoreChange({ ownScore: 6, markedScore: undefined });
    rerender(<ScoringPage />);

    expect(casilla.props.playerScore).toEqual(delHook[0].playerScores[0]);
    expect(mockUseScoring.submitScore).toHaveBeenCalledWith(1, { ownScore: 6, markedPlayerId: 'u2', markedScore: undefined });
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

  it('should show pre-match info on hole 1', () => {
    render(<ScoringPage />);
    expect(screen.getByTestId('pre-match-info')).toBeInTheDocument();
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
    expect(screen.getByText('SINGLES')).toBeInTheDocument();
  });

  it('should render header', () => {
    render(<ScoringPage />);
    expect(screen.getByTestId('header-auth')).toBeInTheDocument();
  });

  it('should not show offline banner when online', () => {
    render(<ScoringPage />);
    expect(screen.queryByTestId('offline-banner')).toBeNull();
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
    expect(screen.getByTestId('offline-banner')).toBeInTheDocument();
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

    expect(screen.getByTestId('offline-banner')).toBeInTheDocument();
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
    expect(screen.queryByTestId('offline-banner')).not.toBeInTheDocument();
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
