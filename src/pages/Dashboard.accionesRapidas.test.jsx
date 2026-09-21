import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { render, screen } from '@testing-library/react';

/**
 * Las dos tarjetas de «Acciones rápidas» (FE #680).
 *
 * El panel deja 160 px a cada lado desde md (`md:px-40`) y ahí mismo ponía las
 * dos tarjetas en dos columnas: a 794 px cada una medía 213, y tras el relleno
 * y el icono al título le quedaban unos 100. «Create Tournament» se comía el
 * relleno y acababa a 3 px del borde. jsdom no mide anchos, así que aquí se
 * vigila el contrato de clases; que de verdad quepa se midió en el navegador.
 */

vi.mock('../composition', () => ({
  listUserCompetitionsUseCase: { execute: () => Promise.resolve([]) },
  getPlayerStatsUseCase: { execute: () => Promise.resolve(null) },
  getRecentMatchesUseCase: { execute: () => Promise.resolve([]) },
  getUpcomingMatchesUseCase: {
    executeWithCompleteness: () => Promise.resolve({ matches: [], complete: true }),
  },
  getScoringViewUseCase: { execute: () => new Promise(() => {}) },
}));

const sesion = { user: { id: 'u-1', first_name: 'Ana', email: 'a@b.c' }, loading: false, refetch: () => {} };
vi.mock('../hooks/useAuth', () => ({ useAuth: () => sesion }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (clave) => clave, i18n: { language: 'es' }, ready: true }),
}));

vi.mock('react-router', () => ({
  useNavigate: () => () => {},
  useLocation: () => ({ pathname: '/dashboard' }),
  Navigate: () => null,
}));

// Al contrario que en el resto de tests del panel, aquí SÍ se conservan las
// props: lo que se mira son las clases
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
for (const ruta of [
  '../components/layout/HeaderAuth',
  '../components/ui/Avatar',
  '../components/profile/HandicapRequestModal',
  '../components/EmailVerificationBanner',
  '../components/dashboard/PendingActionsCard',
  '../components/dashboard/PlayerStatsCards',
  '../components/dashboard/NextMatchBanner',
  '../components/dashboard/RecentMatches',
  '../components/quick_match/CreateQuickMatchModal',
  '../components/ui/FullScreenLoader',
]) {
  vi.doMock(ruta, () => ({ default: () => null }));
}

globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
};

const Dashboard = (await import('./Dashboard')).default;

describe('Dashboard · acciones rápidas entre md y lg (FE #680)', () => {
  it('A1: dos columnas solo desde lg; entre md y lg, una por fila', async () => {
    render(<Dashboard />);

    const rejilla = (await screen.findByTestId('quick-match-card')).parentElement;

    expect(rejilla).toHaveClass('lg:grid-cols-2');
    expect(rejilla).not.toHaveClass('md:grid-cols-2');
  });

  it('A2: el texto de cada tarjeta respeta su relleno en vez de empujarlo', async () => {
    render(<Dashboard />);

    const rejilla = (await screen.findByTestId('quick-match-card')).parentElement;
    const titulos = [...rejilla.querySelectorAll('h3')];

    expect(titulos).toHaveLength(2);
    for (const titulo of titulos) {
      expect(titulo.parentElement).toHaveClass('min-w-0');
    }
  });
});
