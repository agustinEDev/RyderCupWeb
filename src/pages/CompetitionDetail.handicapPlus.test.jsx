import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';

/**
 * Un hándicap plus se guarda negativo y se lee con «+» en la ficha (FE #797).
 *
 *   #    caso                              | qué se ve
 *   -----|---------------------------------|---------------------------
 *   H1a  aprobado con su hándicap -2       | «HCP: +2,0»
 *   H1b  aprobado con uno a medida -3.5    | «HCP: +3,5»
 *   H1c  pendiente con -2                  | «HCP: +2,0»
 *   H1d  fijado -2 (stroke play cerrado)   | «+2,0»
 *   H3   positivo                          | sin signo
 *
 * Todos con el separador decimal del idioma: el fijado ya lo llevaba y los
 * demas, unas lineas mas abajo, salian con punto (revision del 20 oct)
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k, p) => (p && typeof p === 'object' ? `${k} ${JSON.stringify(p)}` : k),
    i18n: { language: 'es' },
  }),
}));
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: () => ({ children, ...p }) => <div {...p}>{children}</div> }),
}));
vi.mock('../components/layout/HeaderAuth', () => ({ default: () => null }));
vi.mock('../components/ui/FullScreenLoader', () => ({ default: () => null }));
vi.mock('../components/competition/HandicapsDeLaCompeticion', () => ({ default: () => null }));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'creator-1' }, loading: false }) }));
vi.mock('../hooks/useUserRoles', () => ({ useUserRoles: () => ({ isAdmin: false, isCreator: true, isLoading: false }) }));
vi.mock('../utils/toast', () => ({ default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }));

let ficha;
let inscritos;
// Lo que la ficha no use aquí responde vacío
vi.mock('../composition', () =>
  new Proxy(
    {
      getCompetitionDetailUseCase: { execute: async () => ficha },
      listEnrollmentsUseCase: { execute: async () => inscritos },
      getCompetitionGolfCoursesUseCase: { execute: async () => [] },
    },
    { get: (o, k) => o[k] ?? { execute: vi.fn().mockResolvedValue(null) }, has: () => true }
  )
);

const CompetitionDetail = (await import('./CompetitionDetail')).default;

const base = {
  id: 'c1',
  name: 'c1',
  hasTeams: true,
  status: 'ACTIVE',
  creatorId: 'creator-1',
  maxPlayers: 12,
  countries: [],
  playMode: 'HANDICAP',
  teamAssignment: 'MANUAL',
  handicapUpdateWindow: { open: true, closesAt: null, reason: null, scheduledAt: null },
  handicapUpdate: null,
};

const inscrito = (userId, extra = {}) => ({
  id: `enr-${userId}`,
  userId,
  status: 'APPROVED',
  userName: userId,
  userHandicap: null,
  hasCustomHandicap: false,
  customHandicap: null,
  team: null,
  ...extra,
});

const pintar = () =>
  render(
    <MemoryRouter initialEntries={['/competitions/c1']}>
      <Routes>
        <Route path="/competitions/:id" element={<CompetitionDetail />} />
      </Routes>
    </MemoryRouter>
  );

describe('CompetitionDetail · hándicap plus (FE #797)', () => {
  it('H1a, H1b, H3: los aprobados, el plus con «+», el positivo sin signo y la coma del idioma', async () => {
    ficha = base;
    inscritos = [
      inscrito('ana', { userHandicap: -2 }),
      inscrito('bea', { userHandicap: 10, hasCustomHandicap: true, customHandicap: -3.5 }),
      inscrito('carla', { userHandicap: 12.4 }),
    ];
    pintar();

    const ana = await screen.findByTestId('aprobado-ana');
    expect(ana).toHaveTextContent('detail.handicapLabel {"handicap":"+2,0"}');
    expect(screen.getByTestId('aprobado-bea')).toHaveTextContent('detail.handicapLabel {"handicap":"+3,5"}');
    expect(screen.getByTestId('aprobado-carla')).toHaveTextContent('detail.handicapLabel {"handicap":"12,4"}');
  });

  it('H1c: el pendiente con un plus, con «+» y la coma del idioma', async () => {
    ficha = base;
    inscritos = [inscrito('ana', { status: 'REQUESTED', userHandicap: -2 })];
    pintar();

    const ana = await screen.findByTestId('pendiente-ana');
    expect(within(ana).getByText('detail.handicapLabel {"handicap":"+2,0"}')).toBeInTheDocument();
  });

  it('H1d: el fijado de un plus, con «+» y la coma del idioma', async () => {
    ficha = { ...base, hasTeams: false, tournamentType: 'MEDAL', status: 'CLOSED', teamAssignment: null };
    inscritos = [
      inscrito('ana', { userHandicap: -2, fixedHandicap: -2, category: null }),
      inscrito('bea', { userHandicap: 12.4, fixedHandicap: 12.4, category: null }),
    ];
    pintar();

    expect(await screen.findByTestId('fijado-ana')).toHaveTextContent('{"handicap":"+2,0"');
    expect(screen.getByTestId('fijado-bea')).toHaveTextContent('{"handicap":"12,4"');
  });
});
