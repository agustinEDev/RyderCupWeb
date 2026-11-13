import { it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';

/**
 * A2 (8 nov 2026): si la ficha no carga porque se está cerrando la sesión, no salta a la
 * lista de competiciones ni avisa: la redirección al login llega ya. El probador la vio
 * ir a la lista, que fallaba también y avisaba «Error al cargar las competiciones».
 * Sin cierre, como siempre: aviso y a la lista.
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
        ({ children }) =>
          children,
    },
  ),
  AnimatePresence: ({ children }) => children,
}));
vi.mock('../components/layout/HeaderAuth', () => ({ default: () => null }));
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'creator-1' }, loading: false }),
}));
vi.mock('../hooks/useUserRoles', () => ({
  useUserRoles: () => ({ isAdmin: false, isCreator: true, isLoading: false }),
}));
const toast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
}));
vi.mock('../utils/toast', () => ({ default: toast }));
const cierre = vi.hoisted(() => ({ enMarcha: vi.fn(() => false) }));
vi.mock('../utils/cierreDeEstaCarga', () => ({
  seEstaCerrandoLaSesion: cierre.enMarcha,
}));
const carga = vi.hoisted(() => ({
  execute: vi.fn(async () => {
    throw new Error(
      'Refresh token inválido o expirado. Por favor, inicia sesión nuevamente.',
    );
  }),
}));
vi.mock('../components/ui/FullScreenLoader', () => ({
  default: () => <p>cargando</p>,
}));
vi.mock(
  '../composition',
  () =>
    new Proxy(
      {
        getCompetitionDetailUseCase: carga,
      },
      {
        get: (o, k) => o[k] ?? { execute: vi.fn().mockResolvedValue(null) },
        has: () => true,
      },
    ),
);

const CompetitionDetail = (await import('./CompetitionDetail')).default;

const abre = () =>
  render(
    <MemoryRouter initialEntries={['/competitions/comp-1']}>
      <Routes>
        <Route path="/competitions/:id" element={<CompetitionDetail />} />
        <Route path="/competitions" element={<p>la-lista</p>} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

it('A2: con un cierre en marcha, ni avisa ni salta a la lista, y sigue la espera', async () => {
  cierre.enMarcha.mockReturnValue(true);

  abre();
  // La carga ha fallado de verdad antes de mirar nada
  await vi.waitFor(() => expect(carga.execute).toHaveBeenCalled());
  await vi.waitFor(() => expect(console.error).toHaveBeenCalled());

  expect(screen.queryByText('la-lista')).toBeNull();
  expect(toast.error).not.toHaveBeenCalled();
  // Ni una página en blanco hasta la redirección: la espera se queda
  expect(screen.getByText('cargando')).toBeInTheDocument();
});

it('A3: sin cierre, avisa y va a la lista como siempre', async () => {
  cierre.enMarcha.mockReturnValue(false);

  abre();

  expect(await screen.findByText('la-lista')).toBeInTheDocument();
  expect(toast.error).toHaveBeenCalled();
});
