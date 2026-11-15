import { it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';

/**
 * Desde el aviso «{N} jugadores sin actualizar con la RFEG» (15 nov 2026): la
 * ficha pide traer a la vista la tarjeta de hándicaps cuando ya está asentada
 * (la agenda leída, o fallida), y al traerla borra el encargo del historial
 * para que recargar o volver atrás no salte otra vez.
 *
 *   caso                                        | qué pasa
 *   --------------------------------------------|-------------------------------------
 *   F1 con el encargo y la agenda sin leer       | la tarjeta, quieta
 *   F2 con el encargo y la agenda leída          | la tarjeta, a la vista
 *   F2b con el encargo y la agenda fallida       | también: no se espera para siempre
 *   F3 sin el encargo                            | quieta
 *   F4 ya traída                                 | el encargo se borra del historial
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: 'es' } }),
}));
vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get:
        () =>
        ({ children, ...p }) => <div {...p}>{children}</div>,
    },
  ),
}));
vi.mock('../components/layout/HeaderAuth', () => ({ default: () => null }));
vi.mock('../components/ui/FullScreenLoader', () => ({ default: () => null }));
// La tarjeta, con lo que le llega: si traerla a la vista y cómo decir que ya
const TarjetaQueDice = ({ traerALaVista, alTraerla }) => (
  <button type="button" data-testid="tarjeta" onClick={() => alTraerla?.()}>
    {traerALaVista ? 'traer' : 'quieta'}
  </button>
);
vi.mock('../components/competition/HandicapsDeLaCompeticion', () => ({
  default: TarjetaQueDice,
}));
const agenda = { leida: null, fallo: false };
vi.mock('../hooks/useAgendaDeLaFicha', () => ({
  useAgendaDeLaFicha: () => ({
    agendaLeida: agenda.leida,
    agendaFallo: agenda.fallo,
    recibirAgenda: () => {},
    franjasDeLaAgenda: [],
  }),
}));
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'creator-1' }, loading: false }),
}));
vi.mock('../hooks/useUserRoles', () => ({
  useUserRoles: () => ({ isAdmin: false, isCreator: true, isLoading: false }),
}));
vi.mock('../utils/toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

const ficha = (id) => ({
  id,
  name: id,
  hasTeams: true,
  status: 'CLOSED',
  creatorId: 'creator-1',
  maxPlayers: 12,
  countries: [],
  playMode: 'HANDICAP',
  teamAssignment: 'MANUAL',
  handicapUpdateWindow: {
    open: true,
    closesAt: null,
    reason: null,
    scheduledAt: null,
  },
  handicapUpdate: null,
});
// Lo que la ficha no use aquí responde vacío
vi.mock(
  '../composition',
  () =>
    new Proxy(
      {
        getCompetitionDetailUseCase: { execute: async (id) => ficha(id) },
        listEnrollmentsUseCase: { execute: async () => [] },
        getCompetitionGolfCoursesUseCase: { execute: async () => [] },
      },
      {
        get: (o, k) => o[k] ?? { execute: vi.fn().mockResolvedValue(null) },
        has: () => true,
      },
    ),
);

const CompetitionDetail = (await import('./CompetitionDetail')).default;

const ElEncargo = () => {
  const { state } = useLocation();
  return <p data-testid="encargo">{String(state?.verHandicaps ?? 'nada')}</p>;
};

const pinta = (state) =>
  render(
    <MemoryRouter
      initialEntries={[{ pathname: '/competitions/comp-1', state }]}
    >
      <ElEncargo />
      <Routes>
        <Route path="/competitions/:id" element={<CompetitionDetail />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  agenda.leida = null;
  agenda.fallo = false;
});

it('F1: Given el encargo y la agenda sin leer, When se pinta, Then la tarjeta espera', async () => {
  pinta({ verHandicaps: true });

  expect(await screen.findByTestId('tarjeta')).toHaveTextContent('quieta');
});

it('F2: Given el encargo y la agenda leída, When se pinta, Then la tarjeta se trae', async () => {
  agenda.leida = { rounds: [] };
  pinta({ verHandicaps: true });

  expect(await screen.findByTestId('tarjeta')).toHaveTextContent('traer');
});

it('F2b: Given el encargo y la agenda fallida, When se pinta, Then la tarjeta se trae', async () => {
  agenda.fallo = true;
  pinta({ verHandicaps: true });

  expect(await screen.findByTestId('tarjeta')).toHaveTextContent('traer');
});

it('F3: Given sin el encargo, When se pinta, Then la tarjeta, quieta', async () => {
  agenda.leida = { rounds: [] };
  pinta(null);

  expect(await screen.findByTestId('tarjeta')).toHaveTextContent('quieta');
});

it('F4: Given ya traída, When lo dice, Then el encargo se borra del historial', async () => {
  agenda.leida = { rounds: [] };
  pinta({ verHandicaps: true, from: 'dashboard' });
  expect(screen.getByTestId('encargo')).toHaveTextContent('true');

  fireEvent.click(await screen.findByTestId('tarjeta'));

  await waitFor(() =>
    expect(screen.getByTestId('encargo')).toHaveTextContent('nada'),
  );
});
