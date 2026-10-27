import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';

const mockLocationState = { state: null, search: '' };
const mockParams = { id: 'c-1' };
vi.mock('react-router', () => ({
  useParams: () => mockParams,
  useLocation: () => mockLocationState,
  useSearchParams: () => [new URLSearchParams(mockLocationState.search ?? '')],
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
const mockSesionCargando = { current: false };
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser.current, loading: mockSesionCargando.current }),
}));

vi.mock('../../components/layout/Header', () => ({
  default: () => <div data-testid="header">Header</div>,
}));

vi.mock('../../components/layout/HeaderAuth', () => ({
  default: ({ user, backTo }) => <div data-testid="header-auth" data-back={String(backTo)}>{user?.id}</div>,
}));

vi.mock('../../components/layout/Footer', () => ({
  default: () => <div data-testid="footer">Footer</div>,
}));

// La general de un Stableford o un Medal: aquí importa con qué se pinta
vi.mock('../../components/scoring/ClasificacionesDeLaCompeticion', () => ({
  default: ({ competitionId, userId, enJuego }) => (
    <div
      data-testid="general-stroke-play"
      data-competition={competitionId}
      data-user={userId}
      data-en-juego={String(enJuego)}
    />
  ),
}));

vi.mock('../../components/scoring/LeaderboardView', () => ({
  default: ({ leaderboard, jugador }) =>
    leaderboard ? <div data-testid="leaderboard-view" data-jugador={jugador ?? ''}>Leaderboard</div> : null,
}));

import LeaderboardPage, { TOPE_DE_LA_FICHA_MS } from './LeaderboardPage';
import { PANTALLA_MENOS_BARRA_INFERIOR } from '../../utils/barraInferior';
import { getLeaderboardUseCase } from '../../composition';

describe('LeaderboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Como el caso de uso: una promesa, que la ficha ya se mira antes (FE #865-6)
    mockDetalle.mockReset().mockResolvedValue(null);
    mockUser.current = null;
    mockLocationState.state = null;
    mockLocationState.search = '';
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
    getLeaderboardUseCase.execute.mockReturnValueOnce(new Promise(() => {})); // never resolves
    render(<LeaderboardPage />);
    expect(screen.getByText('loading')).toBeInTheDocument();
  });

  it('should link back to schedule by default', async () => {
    mockLocationState.state = null;
    render(<LeaderboardPage />);
    const backLink = await screen.findByText(/summary.backToSchedule/);
    expect(backLink.closest('a')).toHaveAttribute('href', '/competitions/c-1/schedule');
  });

  it('should link back to competition detail when from=detail', async () => {
    mockLocationState.state = { from: 'detail' };
    render(<LeaderboardPage />);
    const backLink = await screen.findByText(/summary.backToCompetition/);
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

  // QA (FE #865-4): con sesión, la cabecera de la aplicación dice el título y
  // lleva la flecha en el móvil; el título y el «volver» de la página quedan
  // para el escritorio, o en el móvil saldrían dos (y dos <h1>)
  it('H1: con sesión, el título y el volver de la página solo en escritorio', async () => {
    mockUser.current = { id: 'u-1' };
    render(<LeaderboardPage />);

    const volver = await screen.findByRole('link', { name: /summary\.back/ });
    expect(volver.className.split(' ')).toEqual(expect.arrayContaining(['hidden', 'md:inline-flex']));
    const titulo = screen.getByRole('heading', { level: 1, name: 'leaderboard.title' });
    expect(titulo.className.split(' ')).toEqual(expect.arrayContaining(['hidden', 'md:block']));
  });

  // Revisor: la flecha de la cabecera sale del mapa de pantallas (la ficha), y
  // la página vuelve a la agenda de una Ryder a la que se llegó desde ella
  it('H3: con sesión, la flecha de la cabecera va adonde va el volver de la página', async () => {
    mockUser.current = { id: 'u-1' };
    mockDetalle.mockReturnValueOnce(new Promise(() => {}));
    const { unmount } = render(<LeaderboardPage />);
    // Mientras carga no se sabe: sin flecha, como el enlace de la página (CodeRabbit)
    expect(screen.getByTestId('header-auth')).toHaveAttribute('data-back', 'null');
    unmount();

    render(<LeaderboardPage />);
    await screen.findByTestId('leaderboard-view');
    expect(screen.getByTestId('header-auth')).toHaveAttribute('data-back', '/competitions/c-1/schedule');
  });

  // Pasada del Kind (26 oct): con la barra inferior, la página medía la pantalla
  // entera y además el hueco de la barra: scroll en una página casi vacía
  it('H4: la página mide la pantalla menos la barra y el aviso de instalar', () => {
    mockUser.current = { id: 'u-1' };
    const { container } = render(<LeaderboardPage />);

    expect(container.firstChild.className).toContain(PANTALLA_MENOS_BARRA_INFERIOR);
    expect(container.firstChild.className.split(' ')).not.toContain('min-h-screen');
  });

  it('H2: sin sesión, como siempre: el título y el volver a la vista', async () => {
    render(<LeaderboardPage />);

    const volver = await screen.findByRole('link', { name: /summary\.back/ });
    expect(volver.className.split(' ')).not.toContain('hidden');
    expect(screen.getByRole('heading', { level: 1, name: 'leaderboard.title' }).className.split(' ')).not.toContain('hidden');
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
      mockSesionCargando.current = false;
      mockLocationState.state = null;
      getLeaderboardUseCase.execute.mockReset().mockResolvedValue(mockRyder);
      mockDetalle.mockReset().mockResolvedValue(null);
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
      // Sin el 400 de la Ryder para la primera: ya no se pide (FE #865-6)
      mockDetalle.mockResolvedValueOnce({ id: 'c-1', hasTeams: false, name: 'Copa', status: 'IN_PROGRESS' });
      const { rerender } = render(<LeaderboardPage />);
      await screen.findByTestId('general-stroke-play');

      mockParams.id = 'c-2';
      rerender(<LeaderboardPage />);

      expect(await screen.findByTestId('leaderboard-view')).toBeInTheDocument();
      expect(screen.queryByTestId('general-stroke-play')).not.toBeInTheDocument();
    });

    it('G2b (revisor): abierta antes de empezar (CLOSED), relee: al empezar el torneo se ve sin recargar', async () => {
      mockUser.current = { id: 'u-1' };
      getLeaderboardUseCase.execute.mockRejectedValueOnce(Object.assign(new Error('llega con sus rondas'), { status: 400 }));
      mockDetalle.mockResolvedValueOnce({ id: 'c-1', hasTeams: false, name: 'Copa', status: 'CLOSED' });

      render(<LeaderboardPage />);

      expect(await screen.findByTestId('general-stroke-play')).toHaveAttribute('data-en-juego', 'true');
    });

    it('L11 (revisor): con el doble arranque de React en desarrollo (StrictMode), una sola consulta de la ficha y se ve la general', async () => {
      mockUser.current = { id: 'u-1' };
      getLeaderboardUseCase.execute.mockRejectedValue(Object.assign(new Error('llega con sus rondas'), { status: 400 }));
      mockDetalle.mockResolvedValue({ id: 'c-1', hasTeams: false, name: 'Copa', status: 'IN_PROGRESS' });

      render(
        <StrictMode>
          <LeaderboardPage />
        </StrictMode>
      );

      expect(await screen.findByTestId('general-stroke-play')).toBeInTheDocument();
      expect(screen.queryByText('llega con sus rondas')).not.toBeInTheDocument();
      expect(mockDetalle).toHaveBeenCalledTimes(1);
    });

    it('G11b (revisor): al pasar a otra competición sin desmontar, «cargando» y nada de la anterior', async () => {
      mockUser.current = { id: 'u-1' };
      getLeaderboardUseCase.execute.mockRejectedValueOnce(Object.assign(new Error('llega con sus rondas'), { status: 400 }));
      mockDetalle.mockResolvedValueOnce({ id: 'c-1', hasTeams: false, name: 'Copa', status: 'IN_PROGRESS' });
      const { rerender } = render(<LeaderboardPage />);
      await screen.findByTestId('general-stroke-play');

      getLeaderboardUseCase.execute.mockReturnValueOnce(new Promise(() => {}));
      mockParams.id = 'c-2';
      rerender(<LeaderboardPage />);

      expect(screen.getByText('loading')).toBeInTheDocument();
      expect(screen.queryByTestId('general-stroke-play')).not.toBeInTheDocument();
      expect(screen.queryByText('Copa')).not.toBeInTheDocument();
    });

    it('G10b (revisor): mientras carga no hay enlace de volver (aún no se sabe adónde)', () => {
      getLeaderboardUseCase.execute.mockReturnValueOnce(new Promise(() => {}));

      render(<LeaderboardPage />);

      expect(screen.queryByText(/summary.back/)).not.toBeInTheDocument();
    });

    it.each(['ACTIVE', 'CANCELLED', 'DRAFT'])('G2c (/code-review): %s, no relee', async (status) => {
      mockUser.current = { id: 'u-1' };
      getLeaderboardUseCase.execute.mockRejectedValueOnce(Object.assign(new Error('llega con sus rondas'), { status: 400 }));
      mockDetalle.mockResolvedValueOnce({ id: 'c-1', hasTeams: false, name: 'Copa', status });

      render(<LeaderboardPage />);

      expect(await screen.findByTestId('general-stroke-play')).toHaveAttribute('data-en-juego', 'false');
    });

    it('G2d (/code-review): la ficha se vuelve a mirar cada 5 min: si el torneo acaba, deja de releer', async () => {
      mockUser.current = { id: 'u-1' };
      vi.useFakeTimers({ shouldAdvanceTime: true });
      getLeaderboardUseCase.execute.mockRejectedValue(Object.assign(new Error('llega con sus rondas'), { status: 400 }));
      mockDetalle
        .mockResolvedValueOnce({ id: 'c-1', hasTeams: false, name: 'Copa', status: 'IN_PROGRESS' })
        .mockResolvedValue({ id: 'c-1', hasTeams: false, name: 'Copa', status: 'COMPLETED' });
      render(<LeaderboardPage />);
      expect(await screen.findByTestId('general-stroke-play')).toHaveAttribute('data-en-juego', 'true');

      await vi.advanceTimersByTimeAsync(4 * 60000);
      expect(mockDetalle).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(60000);

      await vi.waitFor(() => expect(screen.getByTestId('general-stroke-play')).toHaveAttribute('data-en-juego', 'false'));
      expect(mockDetalle).toHaveBeenCalledTimes(2);
    });

    it('G2e: si la relectura de la ficha llega cuando ya se mira otra competición, no la pinta', async () => {
      mockUser.current = { id: 'u-1' };
      vi.useFakeTimers({ shouldAdvanceTime: true });
      getLeaderboardUseCase.execute.mockRejectedValueOnce(Object.assign(new Error('llega con sus rondas'), { status: 400 }));
      let llegaTarde;
      mockDetalle
        .mockResolvedValueOnce({ id: 'c-1', hasTeams: false, name: 'Copa', status: 'IN_PROGRESS' })
        .mockReturnValueOnce(new Promise((r) => { llegaTarde = r; }));
      const { rerender } = render(<LeaderboardPage />);
      await screen.findByTestId('general-stroke-play');
      await vi.advanceTimersByTimeAsync(5 * 60000);
      await vi.waitFor(() => expect(mockDetalle).toHaveBeenCalledTimes(2));

      getLeaderboardUseCase.execute.mockReturnValueOnce(new Promise(() => {}));
      mockParams.id = 'c-2';
      rerender(<LeaderboardPage />);
      await act(async () => llegaTarde({ id: 'c-1', hasTeams: false, name: 'Copa', status: 'IN_PROGRESS' }));

      expect(screen.queryByTestId('general-stroke-play')).not.toBeInTheDocument();
      expect(screen.queryByText('Copa')).not.toBeInTheDocument();
    });

    it('G13 (/code-review): desde la ficha, con lo que ya sabe de la competición: ni el leaderboard de la Ryder ni otra consulta de la ficha', async () => {
      mockUser.current = { id: 'u-1' };
      mockLocationState.state = { from: 'detail', competicion: { id: 'c-1', hasTeams: false, name: 'Copa', status: 'IN_PROGRESS' } };

      render(<LeaderboardPage />);

      expect(await screen.findByTestId('general-stroke-play')).toHaveAttribute('data-en-juego', 'true');
      expect(screen.getByText('Copa')).toBeInTheDocument();
      expect(getLeaderboardUseCase.execute).not.toHaveBeenCalled();
      expect(mockDetalle).not.toHaveBeenCalled();
    });

    it('G13b: lo que trae la ficha de OTRA competición no vale', async () => {
      mockUser.current = { id: 'u-1' };
      mockLocationState.state = { from: 'detail', competicion: { id: 'otra', hasTeams: false, name: 'Otra', status: 'IN_PROGRESS' } };

      render(<LeaderboardPage />);

      await vi.waitFor(() => expect(getLeaderboardUseCase.execute).toHaveBeenCalledWith('c-1'));
      expect(screen.queryByText('Otra')).not.toBeInTheDocument();
    });

    it('L12 (/code-review): mientras se sabe si hay sesión no se pide nada, y no parpadea el error', async () => {
      mockUser.current = null;
      mockSesionCargando.current = true;
      getLeaderboardUseCase.execute.mockRejectedValue(Object.assign(new Error('llega con sus rondas'), { status: 400 }));
      mockDetalle.mockResolvedValue({ id: 'c-1', hasTeams: false, name: 'Copa', status: 'IN_PROGRESS' });
      const { rerender } = render(<LeaderboardPage />);
      await act(async () => {});
      expect(getLeaderboardUseCase.execute).not.toHaveBeenCalled();
      expect(screen.getByText('loading')).toBeInTheDocument();

      mockUser.current = { id: 'u-1' };
      mockSesionCargando.current = false;
      rerender(<LeaderboardPage />);

      expect(await screen.findByTestId('general-stroke-play')).toBeInTheDocument();
      expect(screen.queryByText('llega con sus rondas')).not.toBeInTheDocument();
    });

    it('L13 (/code-review): si se pierde la sesión (otra pestaña), la general no se queda releyendo sin ella', async () => {
      mockUser.current = { id: 'u-1' };
      getLeaderboardUseCase.execute.mockRejectedValue(Object.assign(new Error('llega con sus rondas'), { status: 400 }));
      mockDetalle.mockResolvedValue({ id: 'c-1', hasTeams: false, name: 'Copa', status: 'IN_PROGRESS' });
      const { rerender } = render(<LeaderboardPage />);
      await screen.findByTestId('general-stroke-play');

      mockUser.current = null;
      rerender(<LeaderboardPage />);

      await vi.waitFor(() => expect(screen.queryByTestId('general-stroke-play')).not.toBeInTheDocument());
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
      // Y el error de antes se va
      expect(screen.queryByText('llega con sus rondas')).not.toBeInTheDocument();
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

    // QA (FE #865-6): el enlace directo a la general de un stroke play pedía
    // antes la de la Ryder, que contesta 400 (a la consola y quizá a Sentry).
    // Con sesión se mira primero la ficha, que ya se miraba una vez
    it('S1: con sesión, un stroke play no pide la clasificación de la Ryder', async () => {
      mockUser.current = { id: 'u-1' };
      getLeaderboardUseCase.execute.mockRejectedValue(Object.assign(new Error('llega con sus rondas'), { status: 400 }));
      mockDetalle.mockResolvedValue({ id: 'c-1', hasTeams: false, name: 'Copa', status: 'IN_PROGRESS' });

      render(<LeaderboardPage />);

      expect(await screen.findByTestId('general-stroke-play')).toBeInTheDocument();
      expect(getLeaderboardUseCase.execute).not.toHaveBeenCalled();
      expect(mockDetalle).toHaveBeenCalledTimes(1);
    });

    it('S2: con sesión, una Ryder: la ficha una vez y su clasificación como siempre', async () => {
      mockUser.current = { id: 'u-1' };
      vi.useFakeTimers({ shouldAdvanceTime: true });
      mockDetalle.mockResolvedValue({ id: 'c-1', hasTeams: true });

      render(<LeaderboardPage />);
      expect(await screen.findByTestId('leaderboard-view')).toBeInTheDocument();
      await vi.advanceTimersByTimeAsync(30000);

      expect(getLeaderboardUseCase.execute.mock.calls.length).toBeGreaterThanOrEqual(2);
      expect(mockDetalle).toHaveBeenCalledTimes(1);
    });

    it('S3: la ficha de la competición anterior que llega tarde no pinta su general en la nueva', async () => {
      mockUser.current = { id: 'u-1' };
      let llegaLaDeC1;
      mockDetalle
        .mockReturnValueOnce(new Promise((r) => { llegaLaDeC1 = r; }))
        .mockResolvedValue({ id: 'c-2', hasTeams: true });
      const { rerender } = render(<LeaderboardPage />);
      await vi.waitFor(() => expect(mockDetalle).toHaveBeenCalledWith('c-1'));

      mockParams.id = 'c-2';
      rerender(<LeaderboardPage />);
      expect(await screen.findByTestId('leaderboard-view')).toBeInTheDocument();
      await act(async () => llegaLaDeC1({ id: 'c-1', hasTeams: false, name: 'Copa', status: 'IN_PROGRESS' }));

      expect(screen.queryByTestId('general-stroke-play')).not.toBeInTheDocument();
      expect(screen.getByTestId('leaderboard-view')).toBeInTheDocument();
    });

    // CodeRabbit: una ficha que no contesta dejaba la página cargando para siempre
    it('S4: si la ficha no contesta, al vencer su plazo se pide la clasificación de la Ryder', async () => {
      mockUser.current = { id: 'u-1' };
      vi.useFakeTimers({ shouldAdvanceTime: true });
      mockDetalle.mockReturnValueOnce(new Promise(() => {})).mockResolvedValue({ id: 'c-1', hasTeams: true });
      render(<LeaderboardPage />);
      await act(async () => {});
      expect(getLeaderboardUseCase.execute).not.toHaveBeenCalled();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(TOPE_DE_LA_FICHA_MS);
      });

      expect(await screen.findByTestId('leaderboard-view')).toBeInTheDocument();
      // Y como sin red: el siguiente refresco vuelve a preguntar
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30000);
      });
      expect(mockDetalle).toHaveBeenCalledTimes(2);
    });

    it('L6: sin sesión no pregunta por la ficha (no podría leerla)', async () => {
      mockUser.current = null;
      getLeaderboardUseCase.execute.mockRejectedValueOnce(Object.assign(new Error('llega con sus rondas'), { status: 400 }));

      render(<LeaderboardPage />);

      expect(await screen.findByText('llega con sus rondas')).toBeInTheDocument();
      expect(mockDetalle).not.toHaveBeenCalled();
    });
  });

  describe('release social 2: la fila de un amigo y la privada (F5, F7)', () => {
    it('F5: con ?jugador, destaca y centra su fila en la general', async () => {
      mockUser.current = { id: 'me' };
      mockLocationState.search = '?jugador=u2';
      mockDetalle.mockResolvedValue({ id: 'c-1', name: 'Copa X', hasTeams: false, status: 'COMPLETED' });

      render(<LeaderboardPage />);

      expect(await screen.findByTestId('general-stroke-play')).toHaveAttribute('data-user', 'u2');
    });

    it('sin ?jugador, la de quien mira', async () => {
      mockUser.current = { id: 'me' };
      mockDetalle.mockResolvedValue({ id: 'c-1', name: 'Copa X', hasTeams: false, status: 'COMPLETED' });

      render(<LeaderboardPage />);

      expect(await screen.findByTestId('general-stroke-play')).toHaveAttribute('data-user', 'me');
    });

    it('F7: una Ryder privada que no puede ver lo dice, en vez del error', async () => {
      mockUser.current = { id: 'me' };
      getLeaderboardUseCase.execute.mockRejectedValueOnce(
        Object.assign(new Error('Lo jugado de una competición privada…'), {
          status: 403,
          errorCode: 'PRIVATE_COMPETITION',
        })
      );

      render(<LeaderboardPage />);

      expect(await screen.findByTestId('clasificacion-privada')).toHaveTextContent(
        'leaderboard.private'
      );
      expect(screen.queryByText(/Lo jugado de una competición privada/)).not.toBeInTheDocument();
    });

    it('F5: en una Ryder, ?jugador= llega a la vista de los partidos (/code-review)', async () => {
      mockUser.current = { id: 'me' };
      mockLocationState.search = '?jugador=u2';
      try {
        render(<LeaderboardPage />);

        expect(await screen.findByTestId('leaderboard-view')).toHaveAttribute('data-jugador', 'u2');
      } finally {
        mockLocationState.search = '';
      }
    });

    it('F7: si la página se relanza (cambia la sesión), no vuelve a pedirla (/code-review)', async () => {
      mockUser.current = { id: 'me' };
      vi.useFakeTimers({ shouldAdvanceTime: true });
      try {
        getLeaderboardUseCase.execute.mockRejectedValue(
          Object.assign(new Error('x'), { status: 403, errorCode: 'PRIVATE_COMPETITION' })
        );
        const { rerender } = render(<LeaderboardPage />);
        await screen.findByTestId('clasificacion-privada');
        const pedidas = getLeaderboardUseCase.execute.mock.calls.length;

        mockUser.current = null;
        rerender(<LeaderboardPage />);
        await vi.advanceTimersByTimeAsync(30000);
        await vi.advanceTimersByTimeAsync(30000);

        expect(getLeaderboardUseCase.execute.mock.calls.length).toBe(pedidas);
        expect(screen.getByTestId('clasificacion-privada')).toBeInTheDocument();
      } finally {
        vi.useRealTimers();
        getLeaderboardUseCase.execute.mockReset().mockResolvedValue(mockRyder);
      }
    });

    it('F7: y deja de pedirla cada 30 s (revisor)', async () => {
      mockUser.current = { id: 'me' };
      vi.useFakeTimers({ shouldAdvanceTime: true });
      try {
        getLeaderboardUseCase.execute.mockRejectedValue(
          Object.assign(new Error('x'), { status: 403, errorCode: 'PRIVATE_COMPETITION' })
        );
        render(<LeaderboardPage />);
        await screen.findByTestId('clasificacion-privada');
        const pedidas = getLeaderboardUseCase.execute.mock.calls.length;

        await vi.advanceTimersByTimeAsync(30000);
        await vi.advanceTimersByTimeAsync(30000);

        expect(getLeaderboardUseCase.execute.mock.calls.length).toBe(pedidas);
      } finally {
        vi.useRealTimers();
        getLeaderboardUseCase.execute.mockReset().mockResolvedValue(mockRyder);
      }
    });
  });
});

