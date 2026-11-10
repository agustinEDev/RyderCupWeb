import { describe, it, expect, vi, afterEach } from 'vitest';
import { createElement } from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

/**
 * Sin red el usuario sale de la copia del dispositivo, sin hándicap, país ni género
 * (fase 3, FE-06). Crear una partida rápida (usa el género y el hándicap de quien
 * crea) y el modal del hándicap (usa el país para ofrecer la RFEG) esperan a que el
 * servidor confirme la sesión: sin red se dice que no hay conexión. Con red, como hoy.
 */
vi.mock('../composition', () => ({
  listUserCompetitionsUseCase: { execute: () => Promise.resolve([]) },
  getPlayerStatsUseCase: { execute: () => Promise.resolve(null) },
  getRecentMatchesUseCase: { execute: () => Promise.resolve([]) },
  getUpcomingMatchesUseCase: { executeWithCompleteness: () => Promise.resolve({ matches: [], complete: true }) },
  getUpcomingTeeGroupsUseCase: { executeWithCompleteness: () => Promise.resolve({ matches: [], complete: true }) },
  getScoringViewUseCase: { execute: () => new Promise(() => {}) },
  getTeeGroupScoringViewUseCase: { execute: () => new Promise(() => {}) },
}));

const sesion = { user: { id: 'u-1', first_name: 'Ana' }, loading: false, refetch: () => {}, sinConfirmar: true };
vi.mock('../hooks/useAuth', () => ({ useAuth: () => sesion }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (clave) => clave, i18n: { language: 'es' }, ready: true }),
}));
vi.mock('react-router', () => ({
  useNavigate: () => () => {},
  useLocation: () => ({ pathname: '/dashboard' }),
  Navigate: () => null,
}));
const PROPS_DE_MOVIMIENTO = ['variants', 'initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap'];
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_, etiqueta) => ({ children, ...props }) => {
      for (const prop of PROPS_DE_MOVIMIENTO) delete props[prop];
      return createElement(etiqueta, props, children);
    },
  }),
}));
vi.mock('../hooks/useEntryMotion', () => ({ useEntryMotion: () => ({ animateEntry: false }) }));
const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn(), info: vi.fn() }));
vi.mock('../utils/toast', () => ({ default: toast }));
for (const ruta of [
  '../components/layout/HeaderAuth',
  '../components/ui/Avatar',
  '../components/EmailVerificationBanner',
  '../components/dashboard/PlayerStatsCards',
  '../components/dashboard/NextMatchBanner',
  '../components/dashboard/RecentMatches',
  '../components/ui/FullScreenLoader',
]) {
  vi.doMock(ruta, () => ({ default: () => null }));
}
vi.doMock('../components/dashboard/PendingActionsCard', () => ({
  default: ({ onHandicapAction }) => <button data-testid="recordatorio-handicap" onClick={onHandicapAction} />,
}));
vi.doMock('../components/profile/HandicapRequestModal', () => ({
  default: ({ isOpen }) => (isOpen ? <div data-testid="modal-handicap" /> : null),
}));
vi.doMock('../components/quick_match/CreateQuickMatchModal', () => ({
  default: () => <div data-testid="crear-partida-rapida" />,
}));
vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} });

const Dashboard = (await import('./Dashboard')).default;
const { olvidaQueElPanelSePinto } = await import('../utils/primeraCargaDelPanel');
const { reiniciaLaCortina } = await import('../utils/cortinaDeArranque');

describe('Dashboard · lo que necesita los datos completos espera a la red (fase 3)', () => {
  afterEach(() => {
    cleanup();
    olvidaQueElPanelSePinto();
    reiniciaLaCortina();
    vi.clearAllMocks();
    sesion.sinConfirmar = true;
  });

  it('sin red, crear partida rápida dice que no hay conexión y no abre nada', async () => {
    render(<Dashboard />);

    fireEvent.click(await screen.findByTestId('quick-match-card'));

    expect(toast.error).toHaveBeenCalledWith('common:sinConexion.mensaje');
    expect(screen.queryByTestId('crear-partida-rapida')).not.toBeInTheDocument();
  });

  it('sin red, el recordatorio del hándicap tampoco abre el modal', async () => {
    render(<Dashboard />);

    fireEvent.click(await screen.findByTestId('recordatorio-handicap'));

    expect(toast.error).toHaveBeenCalledWith('common:sinConexion.mensaje');
    expect(screen.queryByTestId('modal-handicap')).not.toBeInTheDocument();
  });

  it('con red, los dos se abren como siempre', async () => {
    sesion.sinConfirmar = false;
    render(<Dashboard />);

    fireEvent.click(await screen.findByTestId('quick-match-card'));
    fireEvent.click(screen.getByTestId('recordatorio-handicap'));

    expect(await screen.findByTestId('crear-partida-rapida')).toBeInTheDocument();
    expect(await screen.findByTestId('modal-handicap')).toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
  });
});
