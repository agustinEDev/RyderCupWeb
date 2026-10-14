import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';

const mockLocationState = { state: null };
const mockParams = { id: 'c-1' };
vi.mock('react-router', () => ({
  useParams: () => mockParams,
  useLocation: () => mockLocationState,
  Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
  Navigate: ({ to, replace }) => <div data-testid="redirige" data-to={to} data-replace={String(Boolean(replace))} />,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => opts ? `${key} ${JSON.stringify(opts)}` : key,
    i18n: { language: 'en' },
  }),
}));

// Lo que contesta el leaderboard si un test no dice otra cosa
const { mockRyder } = vi.hoisted(() => ({
  mockRyder: { teamAName: 'Red', teamBName: 'Blue', teamAPoints: 3, teamBPoints: 2, matches: [] },
}));

const mockDetalle = vi.fn();
vi.mock('../../composition', () => ({
  getCompetitionDetailUseCase: { execute: (...a) => mockDetalle(...a) },
  getLeaderboardUseCase: { execute: vi.fn().mockResolvedValue(mockRyder) },
}));

const mockUser = { current: null };
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser.current }),
}));

vi.mock('../../components/layout/Header', () => ({
  default: () => <div data-testid="header">Header</div>,
}));

vi.mock('../../components/layout/HeaderAuth', () => ({
  default: ({ user }) => <div data-testid="header-auth">{user?.id}</div>,
}));

vi.mock('../../components/layout/Footer', () => ({
  default: () => <div data-testid="footer">Footer</div>,
}));

// La general de un Stableford o un Medal: aquí importa con qué se pinta
vi.mock('../../components/scoring/ClasificacionesDeLaCompeticion', () => ({
  default: ({ competitionId, userId, enJuego }) => (
    <div data-testid="general-stroke-play" data-competition={competitionId} data-user={userId} data-en-juego={String(enJuego)} />
  ),
}));

vi.mock('../../components/scoring/LeaderboardView', () => ({
  default: ({ leaderboard }) => leaderboard ? <div data-testid="leaderboard-view">Leaderboard</div> : null,
}));

import LeaderboardPage from './LeaderboardPage';
import { getLeaderboardUseCase } from '../../composition';

describe('LeaderboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser.current = null;
    mockLocationState.state = null;
  });

  it('should render the page with header and footer', async () => {
    render(<LeaderboardPage />);
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('footer')).toBeInTheDocument();
  });

  it('should display the title', () => {
    render(<LeaderboardPage />);
    expect(screen.getByText('leaderboard.title')).toBeInTheDocument();
  });

  it('should call getLeaderboardUseCase with competition id', () => {
    render(<LeaderboardPage />);
    expect(getLeaderboardUseCase.execute).toHaveBeenCalledWith('c-1');
  });

  it('should show loading spinner initially', () => {
    getLeaderboardUseCase.execute.mockReturnValue(new Promise(() => {})); // never resolves
    render(<LeaderboardPage />);
    expect(screen.getByText('loading')).toBeInTheDocument();
  });

  it('should link back to schedule by default', () => {
    mockLocationState.state = null;
    render(<LeaderboardPage />);
    const backLink = screen.getByText(/summary.backToSchedule/);
    expect(backLink.closest('a')).toHaveAttribute('href', '/competitions/c-1/schedule');
  });

  it('should link back to competition detail when from=detail', () => {
    mockLocationState.state = { from: 'detail' };
    render(<LeaderboardPage />);
    const backLink = screen.getByText(/summary.backToCompetition/);
    expect(backLink.closest('a')).toHaveAttribute('href', '/competitions/c-1');
  });

  it('should show public header when user is not logged in', () => {
    mockUser.current = null;
    render(<LeaderboardPage />);
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.queryByTestId('header-auth')).not.toBeInTheDocument();
  });

  it('should show authenticated header when user is logged in', () => {
    mockUser.current = { id: 'u-1', name: 'Test User' };
    render(<LeaderboardPage />);
    expect(screen.getByTestId('header-auth')).toBeInTheDocument();
    expect(screen.queryByTestId('header')).not.toBeInTheDocument();
  });

  /**
   * Un Stableford o un Medal tiene aquí su general (14 oct 2026): antes el
   * enlace llevaba al error del servidor y luego redirigía a la ficha.
   */
  describe('una competición de stroke play', () => {
    // Aunque falle una aserción: ni los temporizadores falsos ni lo que
    // contestan los mocks pasan al siguiente (`/code-review`, #863)
    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
      mockParams.id = 'c-1';
      getLeaderboardUseCase.execute.mockReset().mockResolvedValue(mockRyder);
      mockDetalle.mockReset();
    });

    it('G1: con sesión y en juego, la página pinta su general (no redirige) con el nombre de la competición', async () => {
      mockUser.current = { id: 'u-1' };
      getLeaderboardUseCase.execute.mockRejectedValueOnce(Object.assign(new Error('llega con sus rondas'), { status: 400 }));
      mockDetalle.mockResolvedValueOnce({ id: 'c-1', hasTeams: false, name: 'Copa de Otoño', status: 'IN_PROGRESS' });

      render(<LeaderboardPage />);

      const general = await screen.findByTestId('general-stroke-play');
      expect(general).toHaveAttribute('data-competition', 'c-1');
      expect(general).toHaveAttribute('data-user', 'u-1');
      expect(general).toHaveAttribute('data-en-juego', 'true');
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('leaderboard.title');
      expect(screen.getByText('Copa de Otoño')).toBeInTheDocument();
      expect(screen.queryByTestId('redirige')).not.toBeInTheDocument();
      expect(screen.queryByText('llega con sus rondas')).not.toBeInTheDocument();
      expect(screen.queryByTestId('leaderboard-view')).not.toBeInTheDocument();
    });

    it('G2: acabada, su general sin releer en juego', async () => {
      mockUser.current = { id: 'u-1' };
      getLeaderboardUseCase.execute.mockRejectedValueOnce(Object.assign(new Error('llega con sus rondas'), { status: 400 }));
      mockDetalle.mockResolvedValueOnce({ id: 'c-1', hasTeams: false, name: 'Copa', status: 'COMPLETED' });

      render(<LeaderboardPage />);

      expect(await screen.findByTestId('general-stroke-play')).toHaveAttribute('data-en-juego', 'false');
    });

    it('G1b: una vez vista su general, deja de pedir el leaderboard de la Ryder cada 30 s', async () => {
      mockUser.current = { id: 'u-1' };
      vi.useFakeTimers({ shouldAdvanceTime: true });
      getLeaderboardUseCase.execute.mockRejectedValue(Object.assign(new Error('llega con sus rondas'), { status: 400 }));
      mockDetalle.mockResolvedValue({ id: 'c-1', hasTeams: false, name: 'Copa', status: 'IN_PROGRESS' });
      render(<LeaderboardPage />);
      await screen.findByTestId('general-stroke-play');
      const pedidas = getLeaderboardUseCase.execute.mock.calls.length;

      await vi.advanceTimersByTimeAsync(30000);
      await vi.advanceTimersByTimeAsync(30000);

      expect(getLeaderboardUseCase.execute.mock.calls.length).toBe(pedidas);
    });

    it('G11: si la página pasa a otra competición (una Ryder) sin desmontarse, no sigue pintando la general de la anterior', async () => {
      mockUser.current = { id: 'u-1' };
      getLeaderboardUseCase.execute.mockRejectedValueOnce(Object.assign(new Error('llega con sus rondas'), { status: 400 }));
      mockDetalle.mockResolvedValueOnce({ id: 'c-1', hasTeams: false, name: 'Copa', status: 'IN_PROGRESS' });
      const { rerender } = render(<LeaderboardPage />);
      await screen.findByTestId('general-stroke-play');

      mockParams.id = 'c-2';
      rerender(<LeaderboardPage />);

      expect(await screen.findByTestId('leaderboard-view')).toBeInTheDocument();
      expect(screen.queryByTestId('general-stroke-play')).not.toBeInTheDocument();
    });

    it('G10: volver lleva a la ficha, venga de donde venga', async () => {
      mockUser.current = { id: 'u-1' };
      mockLocationState.state = null;
      getLeaderboardUseCase.execute.mockRejectedValueOnce(Object.assign(new Error('llega con sus rondas'), { status: 400 }));
      mockDetalle.mockResolvedValueOnce({ id: 'c-1', hasTeams: false, name: 'Copa', status: 'IN_PROGRESS' });

      render(<LeaderboardPage />);
      await screen.findByTestId('general-stroke-play');

      expect(screen.getByText(/summary.backToCompetition/).closest('a')).toHaveAttribute('href', '/competitions/c-1');
    });

    it('L2: un 400 de una Ryder (o sin poder leer la ficha) sigue diciendo el error', async () => {
      mockUser.current = { id: 'u-1' };
      getLeaderboardUseCase.execute.mockRejectedValueOnce(Object.assign(new Error('otro motivo'), { status: 400 }));
      mockDetalle.mockResolvedValueOnce({ id: 'c-1', hasTeams: true });
      render(<LeaderboardPage />);
      expect(await screen.findByText('otro motivo')).toBeInTheDocument();
      expect(screen.queryByTestId('general-stroke-play')).not.toBeInTheDocument();
    });

    it('L3: sin poder leer la ficha, el error, sin redirigir', async () => {
      mockUser.current = { id: 'u-1' };
      getLeaderboardUseCase.execute.mockRejectedValueOnce(Object.assign(new Error('llega con sus rondas'), { status: 400 }));
      mockDetalle.mockRejectedValueOnce(Object.assign(new Error('401'), { status: 401 }));
      render(<LeaderboardPage />);
      expect(await screen.findByText('llega con sus rondas')).toBeInTheDocument();
      expect(screen.queryByTestId('general-stroke-play')).not.toBeInTheDocument();
    });

    it('L4: otros fallos no piden la ficha', async () => {
      getLeaderboardUseCase.execute.mockRejectedValueOnce(Object.assign(new Error('caído'), { status: 500 }));
      render(<LeaderboardPage />);
      expect(await screen.findByText('caído')).toBeInTheDocument();
      expect(mockDetalle).not.toHaveBeenCalled();
    });
  
    it('L5: la ficha se pregunta una vez, no en cada refresco', async () => {
      mockUser.current = { id: 'u-1' };
      vi.useFakeTimers({ shouldAdvanceTime: true });
      getLeaderboardUseCase.execute.mockRejectedValue(Object.assign(new Error('otro motivo'), { status: 400 }));
      mockDetalle.mockResolvedValue({ id: 'c-1', hasTeams: true });
      render(<LeaderboardPage />);
      await screen.findByText('otro motivo');

      await vi.advanceTimersByTimeAsync(30000);
      await vi.advanceTimersByTimeAsync(30000);

      expect(getLeaderboardUseCase.execute.mock.calls.length).toBeGreaterThanOrEqual(3);
      expect(mockDetalle).toHaveBeenCalledTimes(1);
    });

    it('L7: si la ficha no respondió (sin red), el siguiente refresco vuelve a preguntar y pinta su general (CodeRabbit, #863)', async () => {
      mockUser.current = { id: 'u-1' };
      vi.useFakeTimers({ shouldAdvanceTime: true });
      getLeaderboardUseCase.execute.mockRejectedValue(Object.assign(new Error('llega con sus rondas'), { status: 400 }));
      mockDetalle.mockRejectedValueOnce(new TypeError('sin conexión')).mockResolvedValue({ id: 'c-1', hasTeams: false });
      render(<LeaderboardPage />);
      await screen.findByText('llega con sus rondas');

      await vi.advanceTimersByTimeAsync(30000);

      expect(await screen.findByTestId('general-stroke-play')).toBeInTheDocument();
      expect(mockDetalle).toHaveBeenCalledTimes(2);
    });

    it('L8: si la ficha respondió con un error, no se vuelve a preguntar (una por competición)', async () => {
      mockUser.current = { id: 'u-1' };
      vi.useFakeTimers({ shouldAdvanceTime: true });
      getLeaderboardUseCase.execute.mockRejectedValue(Object.assign(new Error('llega con sus rondas'), { status: 400 }));
      mockDetalle.mockRejectedValue(Object.assign(new Error('Error del servidor'), { status: 500 }));
      render(<LeaderboardPage />);
      await screen.findByText('llega con sus rondas');

      await vi.advanceTimersByTimeAsync(30000);
      await vi.advanceTimersByTimeAsync(30000);

      expect(getLeaderboardUseCase.execute.mock.calls.length).toBeGreaterThanOrEqual(3);
      expect(mockDetalle).toHaveBeenCalledTimes(1);
    });

    it('L9: la consulta vieja de otra competición que falla sin red no hace repreguntar a la actual', async () => {
      mockUser.current = { id: 'u-1' };
      vi.useFakeTimers({ shouldAdvanceTime: true });
      getLeaderboardUseCase.execute.mockRejectedValue(Object.assign(new Error('llega con sus rondas'), { status: 400 }));
      let fallaLaDeC1;
      mockDetalle
        .mockReturnValueOnce(new Promise((_r, rej) => { fallaLaDeC1 = rej; }))
        .mockResolvedValue({ id: 'c-2', hasTeams: true });
      const { rerender } = render(<LeaderboardPage />);
      await vi.waitFor(() => expect(mockDetalle).toHaveBeenCalledWith('c-1'));

      mockParams.id = 'c-2';
      rerender(<LeaderboardPage />);
      await vi.waitFor(() => expect(mockDetalle).toHaveBeenCalledWith('c-2'));
      await act(async () => fallaLaDeC1(new TypeError('sin conexión')));
      await vi.advanceTimersByTimeAsync(30000);

      expect(mockDetalle).toHaveBeenCalledTimes(2);
    });

    it('L10: sin conexión en el dispositivo, aunque llegue un error con código, se vuelve a preguntar', async () => {
      mockUser.current = { id: 'u-1' };
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.spyOn(globalThis.navigator, 'onLine', 'get').mockReturnValue(false);
      getLeaderboardUseCase.execute.mockRejectedValue(Object.assign(new Error('llega con sus rondas'), { status: 400 }));
      mockDetalle
        .mockRejectedValueOnce(Object.assign(new Error('Service Unavailable'), { status: 503 }))
        .mockResolvedValue({ id: 'c-1', hasTeams: false });
      render(<LeaderboardPage />);
      await screen.findByText('llega con sus rondas');

      await vi.advanceTimersByTimeAsync(30000);

      expect(await screen.findByTestId('general-stroke-play')).toBeInTheDocument();
    });

    it('L6: sin sesión no pregunta por la ficha (no podría leerla)', async () => {
      mockUser.current = null;
      getLeaderboardUseCase.execute.mockRejectedValueOnce(Object.assign(new Error('llega con sus rondas'), { status: 400 }));

      render(<LeaderboardPage />);

      expect(await screen.findByText('llega con sus rondas')).toBeInTheDocument();
      expect(mockDetalle).not.toHaveBeenCalled();
    });
  });
});

