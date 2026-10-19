/**
 * LA TABLA — el próximo partido del panel cuando no se puede preguntar (FE #615).
 *
 *   #   caso                                          | qué recibe el banner
 *   ----|---------------------------------------------|--------------------------------
 *   1   con red                                       | el partido; la lista se guarda
 *   2   sin red, con lista guardada                   | el partido guardado, avisando
 *   4   sin red y nada guardado                       | que no se pudo preguntar
 *   4b  fallan las COMPETICIONES y el caso de uso     | lo mismo: con `[]` el caso de
 *       |   recibiría `[]`                            | uso contesta «ninguno» sin error
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, screen } from '@testing-library/react';

const respuestas = {};
const mockLee = vi.fn();
const mockPartidas = vi.fn();

vi.mock('../composition', () => ({
  listUserCompetitionsUseCase: { execute: () => respuestas.competiciones() },
  getPlayerStatsUseCase: { execute: () => Promise.resolve(null) },
  getRecentMatchesUseCase: { execute: () => Promise.resolve([]) },
  getUpcomingMatchesUseCase: { executeWithCompleteness: (...a) => mockLee(...a) },
  getScoringViewUseCase: { execute: () => new Promise(() => {}) },
  getUpcomingTeeGroupsUseCase: { executeWithCompleteness: (...a) => mockPartidas(...a) },
  getTeeGroupScoringViewUseCase: { execute: () => new Promise(() => {}) },
}));

const usuario = { id: 'u-1', first_name: 'Agustin', email: 'a@b.c' };
const sesion = { user: usuario, loading: false, refetch: () => {} };
vi.mock('../hooks/useAuth', () => ({ useAuth: () => sesion }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (clave) => clave, i18n: { language: 'es' }, ready: true }),
}));

vi.mock('react-router', () => ({
  useNavigate: () => () => {},
  useLocation: () => ({ pathname: '/dashboard' }),
  Navigate: () => null,
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: () => ({ children }) => <div>{children}</div> }),
}));

vi.mock('../hooks/useEntryMotion', () => ({ useEntryMotion: () => ({ animateEntry: false }) }));

for (const ruta of [
  '../components/layout/HeaderAuth',
  '../components/ui/Avatar',
  '../components/profile/HandicapRequestModal',
  '../components/EmailVerificationBanner',
  '../components/dashboard/PlayerStatsCards',
  '../components/dashboard/RecentMatches',
  '../components/quick_match/CreateQuickMatchModal',
  '../components/ui/FullScreenLoader',
]) {
  vi.doMock(ruta, () => ({ default: () => null }));
}

// Cuántos próximos le llegan a «Requiere tu atención» (QA de la release)
vi.doMock('../components/dashboard/PendingActionsCard', () => ({
  default: ({ upcomingMatches }) => <div data-testid="pendientes" data-proximos={String(upcomingMatches)} />,
}));

// Deja rastro de lo que recibe, que es lo que se mira
vi.doMock('../components/dashboard/NextMatchBanner', () => ({
  default: ({ match, sinRespuesta, desdeMemoria, isLoading }) => (
    <div
      data-testid="banner"
      data-cargando={String(Boolean(isLoading))}
      data-partido={match?.id ?? ''}
      data-sin-respuesta={String(Boolean(sinRespuesta))}
      data-desde-memoria={String(Boolean(desdeMemoria))}
    />
  ),
}));

const { olvidaTodo, recuerdaLosPartidos, losUltimosPartidos, recuerdaLasPartidas, lasUltimasPartidas } = await import('../services/loUltimoConocido');
const { olvidaLasPrecargas } = await import('../services/partidosSinCobertura');
const { olvidaQueElPanelSePinto } = await import('../utils/primeraCargaDelPanel');
const { reiniciaLaCortina } = await import('../utils/cortinaDeArranque');
const Dashboard = (await import('./Dashboard')).default;

const partido = { id: 'm-1', roundDate: '2099-01-01', status: 'SCHEDULED' };

const asienta = async () => {
  for (let i = 0; i < 5; i += 1) {
    await act(async () => { await Promise.resolve(); });
  }
};

const banner = () => screen.getByTestId('banner');

describe('el próximo partido del panel sin cobertura', () => {
  beforeEach(() => {
    window.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} });
    const guardado = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (k) => (guardado.has(k) ? guardado.get(k) : null),
      setItem: (k, v) => guardado.set(k, String(v)),
      removeItem: (k) => guardado.delete(k),
      clear: () => guardado.clear(),
    });
    olvidaTodo();
    olvidaLasPrecargas();
    olvidaQueElPanelSePinto();
    reiniciaLaCortina();
    mockLee.mockReset();
    mockPartidas.mockReset();
    mockPartidas.mockResolvedValue({ matches: [], complete: true });
    respuestas.competiciones = () => Promise.resolve([{ id: 'c-1', status: 'IN_PROGRESS' }]);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    document.body.innerHTML = '';
  });

  it('con red: el banner recibe el partido y la lista se guarda', async () => {
    mockLee.mockResolvedValue({ matches: [partido], complete: true });

    render(<Dashboard />);
    await asienta();

    expect(banner()).toHaveAttribute('data-partido', 'm-1');
    expect(banner()).toHaveAttribute('data-sin-respuesta', 'false');
    expect(banner()).toHaveAttribute('data-desde-memoria', 'false');
    expect(losUltimosPartidos()).toHaveLength(1);
  });

  it('«N partidos próximos» cuenta también las partidas de stroke play (QA de la release)', async () => {
    mockLee.mockResolvedValue({ matches: [partido], complete: true });
    mockPartidas.mockResolvedValue({
      matches: [
        { id: 'g-1', esPartidaDeFranja: true, roundDate: '2099-01-01', sessionType: 'MORNING' },
        { id: 'g-2', esPartidaDeFranja: true, roundDate: '2099-01-02', sessionType: 'MORNING' },
      ],
      complete: true,
    });

    render(<Dashboard />);
    await asienta();

    expect(screen.getByTestId('pendientes')).toHaveAttribute('data-proximos', '3');
  });

  it('y quien solo juega stroke play también las ve contadas', async () => {
    mockLee.mockResolvedValue({ matches: [], complete: true });
    mockPartidas.mockResolvedValue({
      matches: [{ id: 'g-1', esPartidaDeFranja: true, roundDate: '2099-01-01', sessionType: 'MORNING' }],
      complete: true,
    });

    render(<Dashboard />);
    await asienta();

    expect(screen.getByTestId('pendientes')).toHaveAttribute('data-proximos', '1');
  });

  it('una partida de stroke play antes que el partido: el banner enseña la partida (FE #824, PR 7)', async () => {
    mockLee.mockResolvedValue({ matches: [{ ...partido, sessionType: 'AFTERNOON' }], complete: true });
    mockPartidas.mockResolvedValue({ matches: [{ id: 'g-1', esPartidaDeFranja: true, roundDate: '2099-01-01', sessionType: 'MORNING' }], complete: true });

    render(<Dashboard />);
    await asienta();

    expect(mockPartidas).toHaveBeenCalledWith('u-1', [{ id: 'c-1', status: 'IN_PROGRESS' }]);
    expect(banner()).toHaveAttribute('data-partido', 'g-1');
  });

  it('el banner espera a las dos listas: sin eso, quien solo juega stroke play veía un momento «crea una partida rápida» (/code-review)', async () => {
    mockLee.mockResolvedValue({ matches: [], complete: true });
    let soltar;
    mockPartidas.mockReturnValue(new Promise((r) => (soltar = r)));

    render(<Dashboard />);
    await asienta();
    // Mientras tanto ni se pinta (la cortina del arranque espera a todo): nada
    // de «crea una partida rápida» que pulsar
    expect(screen.queryByTestId('banner')).toBeNull();

    await act(async () => soltar({ matches: [{ id: 'g-1', esPartidaDeFranja: true, roundDate: '2099-01-01', sessionType: 'MORNING' }], complete: true }));
    await asienta();
    expect(banner()).toHaveAttribute('data-cargando', 'false');
    expect(banner()).toHaveAttribute('data-partido', 'g-1');
  });

  it('con red, la lista de partidas se guarda entera para llegar a ellas sin cobertura (/code-review)', async () => {
    mockLee.mockResolvedValue({ matches: [], complete: true });
    mockPartidas.mockResolvedValue({ matches: [{ id: 'g-1', esPartidaDeFranja: true, roundDate: '2099-01-01', sessionType: 'MORNING' }], complete: true });

    render(<Dashboard />);
    await asienta();

    expect(lasUltimasPartidas()).toEqual([expect.objectContaining({ id: 'g-1' })]);
  });

  it('media lista de partidas no pisa la guardada', async () => {
    recuerdaLasPartidas([{ id: 'g-vieja', esPartidaDeFranja: true, roundDate: '2099-01-01' }]);
    mockLee.mockResolvedValue({ matches: [], complete: true });
    mockPartidas.mockResolvedValue({ matches: [], complete: false });

    render(<Dashboard />);
    await asienta();

    expect(lasUltimasPartidas()).toEqual([expect.objectContaining({ id: 'g-vieja' })]);
  });

  it('sin red: la partida guardada llega al banner, y se sabe que es de memoria (/code-review)', async () => {
    recuerdaLasPartidas([{ id: 'g-1', esPartidaDeFranja: true, roundDate: '2099-01-01', sessionType: 'MORNING' }]);
    mockLee.mockRejectedValue(new TypeError('Failed to fetch'));
    mockPartidas.mockRejectedValue(new TypeError('Failed to fetch'));

    render(<Dashboard />);
    await asienta();

    expect(banner()).toHaveAttribute('data-partido', 'g-1');
    expect(banner()).toHaveAttribute('data-desde-memoria', 'true');
  });

  it.each([401, 403])('un %s al leer las partidas desmiente lo guardado: se borra y no se ofrece (CodeRabbit)', async (status) => {
    recuerdaLasPartidas([{ id: 'g-1', esPartidaDeFranja: true, roundDate: '2099-01-01', sessionType: 'MORNING' }]);
    mockLee.mockResolvedValue({ matches: [], complete: true });
    mockPartidas.mockRejectedValue(Object.assign(new Error('x'), { status }));

    render(<Dashboard />);
    await asienta();

    expect(banner()).toHaveAttribute('data-partido', '');
    expect(lasUltimasPartidas()).toBeNull();
  });

  it('sin red, una partida guardada de un día pasado no se ofrece', async () => {
    recuerdaLasPartidas([{ id: 'g-0', esPartidaDeFranja: true, roundDate: '2000-01-01', sessionType: 'MORNING' }]);
    mockLee.mockRejectedValue(new TypeError('Failed to fetch'));
    mockPartidas.mockRejectedValue(new TypeError('Failed to fetch'));

    render(<Dashboard />);
    await asienta();

    expect(banner()).toHaveAttribute('data-partido', '');
  });

  it('si las partidas no se pueden leer, el banner sigue con el partido', async () => {
    mockLee.mockResolvedValue({ matches: [partido], complete: true });
    mockPartidas.mockRejectedValue(new Error('x'));

    render(<Dashboard />);
    await asienta();

    expect(banner()).toHaveAttribute('data-partido', 'm-1');
  });

  it('sin red y con lista guardada: el banner recibe el partido guardado, y sabe que es de memoria', async () => {
    recuerdaLosPartidos([partido]);
    mockLee.mockRejectedValue(new TypeError('Failed to fetch'));

    render(<Dashboard />);
    await asienta();

    expect(banner()).toHaveAttribute('data-partido', 'm-1');
    expect(banner()).toHaveAttribute('data-desde-memoria', 'true');
  });

  it('sin red y sin nada guardado: el banner sabe que no se pudo preguntar', async () => {
    mockLee.mockRejectedValue(new TypeError('Failed to fetch'));

    render(<Dashboard />);
    await asienta();

    expect(banner()).toHaveAttribute('data-sin-respuesta', 'true');
  });

  it('si fallan las competiciones, tampoco se da por hecho que no hay partido', async () => {
    // El caso de uso, con `[]` en la mano, contesta «ninguno» sin error
    respuestas.competiciones = () => Promise.reject(new TypeError('Failed to fetch'));
    mockLee.mockResolvedValue({ matches: [], complete: true });
    recuerdaLosPartidos([partido]);

    render(<Dashboard />);
    await asienta();

    expect(banner()).toHaveAttribute('data-partido', 'm-1');
  });
});
