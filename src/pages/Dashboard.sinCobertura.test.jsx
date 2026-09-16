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

vi.mock('../composition', () => ({
  listUserCompetitionsUseCase: { execute: () => respuestas.competiciones() },
  getPlayerStatsUseCase: { execute: () => Promise.resolve(null) },
  getRecentMatchesUseCase: { execute: () => Promise.resolve([]) },
  getUpcomingMatchesUseCase: { executeWithCompleteness: (...a) => mockLee(...a) },
  getScoringViewUseCase: { execute: () => new Promise(() => {}) },
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
  '../components/dashboard/PendingActionsCard',
  '../components/dashboard/PlayerStatsCards',
  '../components/dashboard/RecentMatches',
  '../components/quick_match/CreateQuickMatchModal',
  '../components/ui/FullScreenLoader',
]) {
  vi.doMock(ruta, () => ({ default: () => null }));
}

// Deja rastro de lo que recibe, que es lo que se mira
vi.doMock('../components/dashboard/NextMatchBanner', () => ({
  default: ({ match, sinRespuesta, desdeMemoria }) => (
    <div
      data-testid="banner"
      data-partido={match?.id ?? ''}
      data-sin-respuesta={String(Boolean(sinRespuesta))}
      data-desde-memoria={String(Boolean(desdeMemoria))}
    />
  ),
}));

const { olvidaTodo, recuerdaLosPartidos, losUltimosPartidos } = await import('../services/loUltimoConocido');
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
    globalThis.localStorage = {
      getItem: (k) => (guardado.has(k) ? guardado.get(k) : null),
      setItem: (k, v) => guardado.set(k, String(v)),
      removeItem: (k) => guardado.delete(k),
      clear: () => guardado.clear(),
    };
    olvidaTodo();
    olvidaLasPrecargas();
    olvidaQueElPanelSePinto();
    reiniciaLaCortina();
    mockLee.mockReset();
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
