import { it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router';

/**
 * La tarjeta de los hándicaps no lleva nada de una competición a otra
 * (`/code-review`, #863): al cambiar de ficha se monta de nuevo, con todo su
 * estado (lo escrito, la zona leída, lo que estaba en marcha) desde cero. Lo
 * garantiza la pantalla de carga de la ficha, que la desmonta mientras lee la
 * nueva; por eso la tarjeta no lleva la cuenta de su competición.
 */

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k) => k, i18n: { language: 'es' } }) }));
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: () => ({ children, ...p }) => <div {...p}>{children}</div> }),
}));
vi.mock('../components/layout/HeaderAuth', () => ({ default: () => null }));
vi.mock('../components/ui/FullScreenLoader', () => ({ default: () => null }));
const montajes = [];
// Cuenta montajes, no renders: el inicializador de useState solo corre al montar
const TarjetaQueCuenta = ({ competitionId }) => {
  useState(() => montajes.push(competitionId));
  return <p>tarjeta-{competitionId}</p>;
};
vi.mock('../components/competition/HandicapsDeLaCompeticion', () => ({ default: TarjetaQueCuenta }));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'creator-1' }, loading: false }) }));
vi.mock('../hooks/useUserRoles', () => ({ useUserRoles: () => ({ isAdmin: false, isCreator: true, isLoading: false }) }));
vi.mock('../utils/toast', () => ({ default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }));

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
  handicapUpdateWindow: { open: true, closesAt: null, reason: null, scheduledAt: null },
  handicapUpdate: null,
});
// Lo que la ficha no use aquí responde vacío
vi.mock('../composition', () =>
  new Proxy(
    {
      getCompetitionDetailUseCase: { execute: async (id) => ficha(id) },
      listEnrollmentsUseCase: { execute: async () => [] },
      getCompetitionGolfCoursesUseCase: { execute: async () => [] },
    },
    { get: (o, k) => o[k] ?? { execute: vi.fn().mockResolvedValue(null) }, has: () => true }
  )
);

const CompetitionDetail = (await import('./CompetitionDetail')).default;

const AOtra = () => {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate('/competitions/comp-2')}>
      a-la-otra
    </button>
  );
};

it('R1: al pasar a otra competición, la tarjeta de los hándicaps se monta de nuevo', async () => {
  render(
    <MemoryRouter initialEntries={['/competitions/comp-1']}>
      <AOtra />
      <Routes>
        <Route path="/competitions/:id" element={<CompetitionDetail />} />
      </Routes>
    </MemoryRouter>
  );
  await screen.findByText('tarjeta-comp-1');

  fireEvent.click(screen.getByRole('button', { name: 'a-la-otra' }));

  await screen.findByText('tarjeta-comp-2');
  expect(montajes).toEqual(['comp-1', 'comp-2']);
});
