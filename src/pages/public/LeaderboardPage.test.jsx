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
   * La de un Stableford o un Medal vive en su ficha: un enlace guardado o
   * compartido a esta página llevaba al error del servidor (QA de la release).
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

    it('L1: redirige a su ficha, a la clasificación', async () => {
      mockUser.current = { id: 'u-1' };
      getLeaderboardUseCase.execute.mockRejectedValueOnce(Object.assign(new Error('llega con sus rondas'), { status: 400 }));
      mockDetalle.mockResolvedValueOnce({ id: 'c-1', hasTeams: false });

      render(<LeaderboardPage />);

      const redirige = await screen.findByTestId('redirige');
      expect(redirige).toHaveAttribute('data-to', '/competitions/c-1#clasificaciones');
      expect(redirige).toHaveAttribute('data-replace', 'true');
      expect(screen.queryByText('llega con sus rondas')).not.toBeInTheDocument();
    });

    it('L2: un 400 de una Ryder (o sin poder leer la ficha) sigue diciendo el error', async () => {
      mockUser.current = { id: 'u-1' };
      getLeaderboardUseCase.execute.mockRejectedValueOnce(Object.assign(new Error('otro motivo'), { status: 400 }));
      mockDetalle.mockResolvedValueOnce({ id: 'c-1', hasTeams: true });
      render(<LeaderboardPage />);
      expect(await screen.findByText('otro motivo')).toBeInTheDocument();
      expect(screen.queryByTestId('redirige')).not.toBeInTheDocument();
    });

    it('L3: sin poder leer la ficha, el error, sin redirigir', async () => {
      mockUser.current = { id: 'u-1' };
      getLeaderboardUseCase.execute.mockRejectedValueOnce(Object.assign(new Error('llega con sus rondas'), { status: 400 }));
      mockDetalle.mockRejectedValueOnce(Object.assign(new Error('401'), { status: 401 }));
      render(<LeaderboardPage />);
      expect(await screen.findByText('llega con sus rondas')).toBeInTheDocument();
      expect(screen.queryByTestId('redirige')).not.toBeInTheDocument();
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

    it('L7: si la ficha no respondió (sin red), el siguiente refresco vuelve a preguntar y redirige (CodeRabbit, #863)', async () => {
      mockUser.current = { id: 'u-1' };
      vi.useFakeTimers({ shouldAdvanceTime: true });
      getLeaderboardUseCase.execute.mockRejectedValue(Object.assign(new Error('llega con sus rondas'), { status: 400 }));
      mockDetalle.mockRejectedValueOnce(new TypeError('sin conexión')).mockResolvedValue({ id: 'c-1', hasTeams: false });
      render(<LeaderboardPage />);
      await screen.findByText('llega con sus rondas');

      await vi.advanceTimersByTimeAsync(30000);

      expect(await screen.findByTestId('redirige')).toHaveAttribute('data-to', '/competitions/c-1#clasificaciones');
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

      expect(await screen.findByTestId('redirige')).toHaveAttribute('data-to', '/competitions/c-1#clasificaciones');
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

