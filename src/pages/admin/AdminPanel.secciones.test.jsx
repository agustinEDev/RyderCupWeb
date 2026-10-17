import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router';
import AdminPanel from './AdminPanel';

/**
 * El panel de admin por secciones (17 oct 2026, Agustín): en el móvil, un menú
 * de cinco secciones y cada una en su pantalla, con su ruta; en el ordenador, el
 * mismo menú en una columna a la izquierda. Casos A1–A11 aprobados en el chat.
 */

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, params) => (params?.count !== undefined ? `${key}_${params.count}` : key),
    i18n: { language: 'es' },
  }),
}));

const { ADMIN } = vi.hoisted(() => ({ ADMIN: { id: 'admin-1', first_name: 'Admin', last_name: 'User', is_admin: true } }));
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: ADMIN, loading: false }),
}));

vi.mock('../../components/layout/HeaderAuth', () => ({ default: () => <div data-testid="header-auth" /> }));
vi.mock('./GolfCourses', () => ({ default: () => <div data-testid="golf-courses-tab" /> }));
vi.mock('./PendingGolfCourses', () => ({ default: () => <div data-testid="pending-golf-courses-tab" /> }));
vi.mock('./HoleReviews', () => ({ default: () => <div data-testid="hole-reviews" /> }));
vi.mock('../../components/admin/hoyos/TodosLosCampos', () => ({ default: () => <div data-testid="todos-los-campos" /> }));

const mockGetAdminStats = vi.fn();
const mockListAdminUsers = vi.fn();
const mockAdminListCompetitions = vi.fn();
const { noop } = vi.hoisted(() => ({ noop: { execute: () => Promise.resolve() } }));

vi.mock('../../composition', () => ({
  getAdminStatsUseCase: { execute: (...a) => mockGetAdminStats(...a) },
  listAdminUsersUseCase: { execute: (...a) => mockListAdminUsers(...a) },
  adminListCompetitionsUseCase: { execute: (...a) => mockAdminListCompetitions(...a) },
  updateAdminUserUseCase: noop,
  setAdminUserActiveUseCase: noop,
  deleteAdminUserUseCase: noop,
  adminUpdateCompetitionUseCase: noop,
  activateCompetitionUseCase: noop,
  closeEnrollmentsUseCase: noop,
  startCompetitionUseCase: noop,
  completeCompetitionUseCase: noop,
  cancelCompetitionUseCase: noop,
  reopenEnrollmentsUseCase: noop,
  revertCompetitionStatusUseCase: noop,
  revertCompetitionToInProgressUseCase: noop,
}));

const STATS = {
  totalUsers: 128,
  totalCompetitions: 14,
  totalQuickMatches: 25,
  totalGolfCoursesApproved: 40,
  totalGolfCoursesPending: 2,
};

const DondeEstoy = () => <p data-testid="ruta">{useLocation().pathname}</p>;

const abrir = (ruta) =>
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/admin/:seccion?" element={<AdminPanel />} />
      </Routes>
      <DondeEstoy />
    </MemoryRouter>
  );

const menu = () => screen.getByRole('navigation', { name: 'menu.label' });
const fila = (nombre) => within(menu()).getByRole('link', { name: new RegExp(nombre) });

describe('AdminPanel · secciones', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAdminStats.mockResolvedValue(STATS);
    mockListAdminUsers.mockResolvedValue({ users: [], totalCount: 0, limit: 20, offset: 0 });
    mockAdminListCompetitions.mockResolvedValue([]);
  });

  it('A1: el menú tiene las cinco secciones, cada una con su ruta y sin pestañas', async () => {
    abrir('/admin');
    await waitFor(() => expect(mockGetAdminStats).toHaveBeenCalled());
    const enlaces = within(menu()).getAllByRole('link');
    expect(enlaces.map((a) => a.getAttribute('href'))).toEqual([
      '/admin/resumen',
      '/admin/usuarios',
      '/admin/competiciones',
      '/admin/campos',
      '/admin/hoyos',
    ]);
    expect(enlaces.map((a) => a.textContent)).toEqual([
      expect.stringContaining('screens.adminOverview'),
      expect.stringContaining('screens.adminUsers'),
      expect.stringContaining('screens.adminCompetitions'),
      expect.stringContaining('screens.adminGolfCourses'),
      expect.stringContaining('screens.adminHoles'),
    ]);
    // Se acabaron las seis pestañas
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('A2: los números que ya trae el resumen, sin más llamadas', async () => {
    abrir('/admin');
    await waitFor(() => expect(fila('screens.adminUsers')).toHaveTextContent('128'));
    expect(fila('screens.adminCompetitions')).toHaveTextContent('14');
    expect(fila('screens.adminGolfCourses')).toHaveTextContent('menu.requests_2');
    // El de hoyos llega con su lista nueva (entrega 2)
    expect(fila('screens.adminHoles').textContent).not.toMatch(/\d/);
    expect(mockListAdminUsers).not.toHaveBeenCalled();
    expect(mockAdminListCompetitions).not.toHaveBeenCalled();
  });

  it('A2: sin solicitudes pendientes no se dice nada en campos', async () => {
    mockGetAdminStats.mockResolvedValue({ ...STATS, totalGolfCoursesPending: 0 });
    abrir('/admin');
    await waitFor(() => expect(fila('screens.adminUsers')).toHaveTextContent('128'));
    expect(fila('screens.adminGolfCourses')).not.toHaveTextContent('menu.requests');
  });

  it('A3: tocar una sección la abre en su ruta y, en el móvil, sin el menú', async () => {
    abrir('/admin');
    await waitFor(() => expect(mockGetAdminStats).toHaveBeenCalled());
    fireEvent.click(fila('screens.adminUsers'));
    expect(screen.getByTestId('ruta')).toHaveTextContent('/admin/usuarios');
    await waitFor(() => expect(mockListAdminUsers).toHaveBeenCalled());
    // En el móvil el menú se esconde; en el ordenador se queda a la izquierda
    expect(menu()).toHaveClass('hidden', 'md:block');
    expect(screen.getByTestId('seccion-del-panel')).not.toHaveClass('hidden');
  });

  it('A3: la sección abierta queda marcada en el menú', async () => {
    abrir('/admin/competiciones');
    await waitFor(() => expect(mockAdminListCompetitions).toHaveBeenCalled());
    expect(fila('screens.adminCompetitions')).toHaveAttribute('aria-current', 'page');
    expect(fila('screens.adminUsers')).not.toHaveAttribute('aria-current');
  });

  it('A4: entrar directo por la URL abre esa sección', async () => {
    abrir('/admin/competiciones');
    await waitFor(() => expect(mockAdminListCompetitions).toHaveBeenCalled());
    expect(mockListAdminUsers).not.toHaveBeenCalled();
  });

  it('A5: una sección que no existe lleva al menú', async () => {
    abrir('/admin/xyz');
    await waitFor(() => expect(screen.getByTestId('ruta')).toHaveTextContent(/^\/admin$/));
    expect(menu()).toBeInTheDocument();
  });

  it('A1/A6: en /admin el móvil ve solo el menú y el ordenador, además, el resumen', async () => {
    abrir('/admin');
    expect(await screen.findByText('25')).toBeInTheDocument();
    expect(menu()).not.toHaveClass('hidden');
    expect(screen.getByTestId('seccion-del-panel')).toHaveClass('hidden', 'md:block');
  });

  it('A6: /admin/resumen enseña el resumen también en el móvil', async () => {
    abrir('/admin/resumen');
    expect(await screen.findByText('25')).toBeInTheDocument();
    expect(screen.getByTestId('seccion-del-panel')).not.toHaveClass('hidden');
    expect(fila('screens.adminOverview')).toHaveAttribute('aria-current', 'page');
  });

  it('A7: campos de golf, con dos pestañas: aprobados y solicitudes', async () => {
    abrir('/admin/campos');
    const pestañas = await screen.findAllByRole('tab');
    expect(pestañas.map((p) => p.textContent)).toEqual(['golfTabs.approved', 'golfTabs.requests']);
    expect(pestañas[0]).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('golf-courses-tab')).toBeInTheDocument();
    expect(screen.queryByTestId('pending-golf-courses-tab')).not.toBeInTheDocument();
    fireEvent.click(pestañas[1]);
    expect(screen.getByTestId('pending-golf-courses-tab')).toBeInTheDocument();
    expect(screen.queryByTestId('golf-courses-tab')).not.toBeInTheDocument();
    expect(pestañas[1]).toHaveAttribute('aria-selected', 'true');
  });

  it('A7: las solicitudes tienen su URL y se abren directas', async () => {
    abrir('/admin/campos?ver=solicitudes');
    expect(await screen.findByTestId('pending-golf-courses-tab')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'golfTabs.requests' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('tab', { name: 'golfTabs.approved' }));
    expect(screen.getByTestId('golf-courses-tab')).toBeInTheDocument();
  });

  it('T1: hoyos, con dos pestañas: pendientes y todos los campos', async () => {
    abrir('/admin/hoyos');
    const pestañas = await screen.findAllByRole('tab');
    expect(pestañas.map((p) => p.textContent)).toEqual(['holeTabs.pending', 'holeTabs.allCourses']);
    expect(pestañas[0]).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('hole-reviews')).toBeInTheDocument();

    fireEvent.click(pestañas[1]);
    expect(screen.getByTestId('todos-los-campos')).toBeInTheDocument();
    expect(screen.queryByTestId('hole-reviews')).not.toBeInTheDocument();
    expect(screen.getByTestId('ruta')).toHaveTextContent('/admin/hoyos');
  });

  it('T6: todos los campos tiene su URL y se abre directo', async () => {
    abrir('/admin/hoyos?ver=campos&campo=gc-1');

    expect(await screen.findByTestId('todos-los-campos')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'holeTabs.allCourses' })).toHaveAttribute('aria-selected', 'true');
  });

  it('T1: las pestañas de hoyos también van con las flechas', async () => {
    abrir('/admin/hoyos');
    const [pendientes, todos] = await screen.findAllByRole('tab');
    fireEvent.keyDown(pendientes, { key: 'ArrowRight' });

    expect(todos).toHaveAttribute('aria-selected', 'true');
    expect(todos).toHaveFocus();
  });

  it('A10: cada sección enseña solo lo suyo', async () => {
    abrir('/admin/hoyos');
    await screen.findByTestId('hole-reviews');
    expect(screen.queryByTestId('golf-courses-tab')).not.toBeInTheDocument();
    expect(screen.queryByText('25')).not.toBeInTheDocument();
  });
});
