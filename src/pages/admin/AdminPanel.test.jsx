import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import AdminPanel from './AdminPanel';

// El panel va por rutas desde el 17 oct: se abre en /admin y cada sección se
// toca en el menú
const renderPanel = () =>
  render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="/admin/:seccion?" element={<AdminPanel />} />
      </Routes>
    </MemoryRouter>
  );

// El mismo `t` en cada pintado, como el de i18next: uno nuevo cada vez cambia
// `loadCompetitions` y la lista se recargaba sin parar, desmontando lo abierto
const { TRADUCCION } = vi.hoisted(() => ({
  TRADUCCION: {
    t: (key, params) => (params?.count !== undefined ? `${key}_${params.count}` : key),
    i18n: { language: 'en' },
  },
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => TRADUCCION,
}));

// El mismo `user` en cada pintado, como el de verdad: uno nuevo cada vez
// repetiría los efectos que dependen de él
const { ADMIN } = vi.hoisted(() => ({ ADMIN: { id: 'admin-1', first_name: 'Admin', last_name: 'User', is_admin: true } }));
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: ADMIN, loading: false }),
}));

vi.mock('../../components/layout/HeaderAuth', () => ({
  default: () => <div data-testid="header-auth">Header</div>,
}));

vi.mock('./GolfCourses', () => ({
  default: () => <div data-testid="golf-courses-tab">Golf Courses</div>,
}));

vi.mock('./PendingGolfCourses', () => ({
  default: ({ onCambio }) => (
    <div data-testid="pending-golf-courses-tab">
      Pending
      <button type="button" onClick={onCambio}>aprobar-una</button>
    </div>
  ),
}));

const mockGetAdminStats = vi.fn();
const mockListAdminUsers = vi.fn();
const mockUpdateAdminUser = vi.fn();
const mockSetAdminUserActive = vi.fn();
const mockDeleteAdminUser = vi.fn();
const mockAdminListCompetitions = vi.fn();
const mockAdminUpdateCompetition = vi.fn();
const mockActivateCompetition = vi.fn();
const mockCloseEnrollments = vi.fn();
const mockStartCompetition = vi.fn();
const mockCompleteCompetition = vi.fn();
const mockCancelCompetition = vi.fn();
const mockReopenEnrollments = vi.fn();
const mockRevertCompetitionStatus = vi.fn();
const mockRevertCompetitionToInProgress = vi.fn();

vi.mock('../../composition', () => ({
  getAdminStatsUseCase: { execute: (...args) => mockGetAdminStats(...args) },
  listAdminUsersUseCase: { execute: (...args) => mockListAdminUsers(...args) },
  updateAdminUserUseCase: { execute: (...args) => mockUpdateAdminUser(...args) },
  setAdminUserActiveUseCase: { execute: (...args) => mockSetAdminUserActive(...args) },
  deleteAdminUserUseCase: { execute: (...args) => mockDeleteAdminUser(...args) },
  adminListCompetitionsUseCase: { execute: (...args) => mockAdminListCompetitions(...args) },
  adminUpdateCompetitionUseCase: { execute: (...args) => mockAdminUpdateCompetition(...args) },
  activateCompetitionUseCase: { execute: (...args) => mockActivateCompetition(...args) },
  closeEnrollmentsUseCase: { execute: (...args) => mockCloseEnrollments(...args) },
  startCompetitionUseCase: { execute: (...args) => mockStartCompetition(...args) },
  completeCompetitionUseCase: { execute: (...args) => mockCompleteCompetition(...args) },
  cancelCompetitionUseCase: { execute: (...args) => mockCancelCompetition(...args) },
  reopenEnrollmentsUseCase: { execute: (...args) => mockReopenEnrollments(...args) },
  revertCompetitionStatusUseCase: { execute: (...args) => mockRevertCompetitionStatus(...args) },
  revertCompetitionToInProgressUseCase: { execute: (...args) => mockRevertCompetitionToInProgress(...args) },
}));

const stats = {
  totalUsers: 9,
  totalCompetitions: 1,
  totalQuickMatches: 25,
  totalGolfCoursesApproved: 1,
  totalGolfCoursesPending: 0,
};

const usersResponse = {
  users: [
    {
      id: 'u1',
      firstName: 'Agus',
      lastName: 'Estevez',
      email: 'agus@test.com',
      handicap: 17.7,
      isAdmin: true,
      isActive: true,
      emailVerified: true,
      createdAt: '2026-07-27T00:00:00Z',
    },
  ],
  totalCount: 1,
  limit: 20,
  offset: 0,
};

const competitionsResponse = [
  {
    id: 'c1',
    name: 'Ryder Cup Local',
    status: 'DRAFT',
    startDate: '2026-09-01',
    endDate: '2026-09-03',
    creator: { firstName: 'Ana', lastName: 'Ruiz' },
  },
  {
    id: 'c2',
    name: 'Stuck Tournament',
    status: 'IN_PROGRESS',
    startDate: '2026-08-01',
    endDate: '2026-08-02',
    creator: { firstName: 'Bea', lastName: 'Soto' },
  },
];

// En la tabla del ordenador: en el móvil el mismo nombre sale también en su fila
const enLaTabla = async (texto) => within(await screen.findByRole('table')).findByText(texto);

describe('AdminPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAdminStats.mockResolvedValue(stats);
    mockListAdminUsers.mockResolvedValue(usersResponse);
    mockAdminListCompetitions.mockResolvedValue(competitionsResponse);
  });

  it('loads and renders the overview stats on mount', async () => {
    renderPanel();

    await waitFor(() => expect(mockGetAdminStats).toHaveBeenCalled());
    // El 9 sale también en el menú, junto a Usuarios: se mira en la sección
    const seccion = await screen.findByTestId('seccion-del-panel');
    await waitFor(() => expect(within(seccion).getByText('9')).toBeInTheDocument());
    expect(within(seccion).getByText('25')).toBeInTheDocument();
  });

  it('loads and renders the users table when switching to the Usuarios tab', async () => {
    renderPanel();
    await waitFor(() => expect(mockGetAdminStats).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('link', { name: /screens.adminUsers/ }));

    await waitFor(() => expect(mockListAdminUsers).toHaveBeenCalled());
    expect(await enLaTabla('Agus Estevez')).toBeInTheDocument();
  });

  it('renders the embedded GolfCourses tab', async () => {
    renderPanel();
    await waitFor(() => expect(mockGetAdminStats).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('link', { name: /screens.adminGolfCourses/ }));

    expect(await screen.findByTestId('golf-courses-tab')).toBeInTheDocument();
  });

  it('renders the embedded PendingGolfCourses tab', async () => {
    renderPanel();
    await waitFor(() => expect(mockGetAdminStats).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('link', { name: /screens.adminGolfCourses/ }));
    fireEvent.click(screen.getByRole('tab', { name: 'golfTabs.requests' }));

    expect(await screen.findByTestId('pending-golf-courses-tab')).toBeInTheDocument();
  });

  it('opens the edit modal and calls updateAdminUserUseCase on save', async () => {
    mockUpdateAdminUser.mockResolvedValue({ ...usersResponse.users[0], firstName: 'Renamed' });
    renderPanel();
    await waitFor(() => expect(mockGetAdminStats).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('link', { name: /screens.adminUsers/ }));
    await enLaTabla('Agus Estevez');

    fireEvent.click(screen.getByRole('button', { name: 'users.editTooltip' }));
    fireEvent.click(screen.getByRole('button', { name: 'editModal.save' }));

    await waitFor(() => expect(mockUpdateAdminUser).toHaveBeenCalledWith('u1', expect.any(Object)));
  });

  it('opens the manage modal and calls setAdminUserActiveUseCase on confirm', async () => {
    mockSetAdminUserActive.mockResolvedValue();
    renderPanel();
    await waitFor(() => expect(mockGetAdminStats).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('link', { name: /screens.adminUsers/ }));
    await enLaTabla('Agus Estevez');

    fireEvent.click(screen.getByRole('button', { name: 'users.deactivateTooltip' }));
    fireEvent.click(screen.getByRole('button', { name: 'manageModal.confirmDeactivate' }));

    await waitFor(() => expect(mockSetAdminUserActive).toHaveBeenCalledWith('u1', false));
  });

  it('permanently deletes a user once the confirmation word is typed', async () => {
    mockDeleteAdminUser.mockResolvedValue();
    renderPanel();
    await waitFor(() => expect(mockGetAdminStats).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('link', { name: /screens.adminUsers/ }));
    await enLaTabla('Agus Estevez');

    fireEvent.click(screen.getByRole('button', { name: 'users.deleteTooltip' }));
    fireEvent.click(screen.getByRole('radio', { name: /manageModal.deleteOption/ }));
    fireEvent.change(screen.getByPlaceholderText('manageModal.confirmDeletePlaceholder'), {
      target: { value: 'manageModal.confirmDeleteWord' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'manageModal.confirmDelete' }));

    await waitFor(() => expect(mockDeleteAdminUser).toHaveBeenCalledWith('u1'));
    // Refreshes the overview stats after a successful delete
    await waitFor(() => expect(mockGetAdminStats.mock.calls.length).toBeGreaterThan(1));
  });

  it('shows the blocked message when delete is rejected with a 409', async () => {
    const error = new Error('has created one or more quick matches');
    error.status = 409;
    mockDeleteAdminUser.mockRejectedValue(error);
    renderPanel();
    await waitFor(() => expect(mockGetAdminStats).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('link', { name: /screens.adminUsers/ }));
    await enLaTabla('Agus Estevez');

    fireEvent.click(screen.getByRole('button', { name: 'users.deleteTooltip' }));
    fireEvent.click(screen.getByRole('radio', { name: /manageModal.deleteOption/ }));
    fireEvent.change(screen.getByPlaceholderText('manageModal.confirmDeletePlaceholder'), {
      target: { value: 'manageModal.confirmDeleteWord' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'manageModal.confirmDelete' }));

    expect(await screen.findByText('manageModal.deleteBlockedTitle')).toBeInTheDocument();
    // The user is still present in the table — nothing was deleted
    expect(within(screen.getByRole('table')).getByText('Agus Estevez')).toBeInTheDocument();
  });

  it('loads and renders the competitions table when switching to the Competitions tab', async () => {
    renderPanel();
    await waitFor(() => expect(mockGetAdminStats).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('link', { name: /screens.adminCompetitions/ }));

    await waitFor(() => expect(mockAdminListCompetitions).toHaveBeenCalled());
    expect(await enLaTabla('Ryder Cup Local')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getByText('Stuck Tournament')).toBeInTheDocument();
  });

  it('only allows editing DRAFT competitions and saves via adminUpdateCompetitionUseCase', async () => {
    mockAdminUpdateCompetition.mockResolvedValue({ id: 'c1', name: 'Renamed' });
    renderPanel();
    await waitFor(() => expect(mockGetAdminStats).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('link', { name: /screens.adminCompetitions/ }));
    await enLaTabla('Ryder Cup Local');

    const editButtons = screen.getAllByRole('button', { name: 'competitions.editTooltip' });
    expect(editButtons).toHaveLength(1); // only the DRAFT competition has an enabled edit button

    fireEvent.click(editButtons[0]);
    fireEvent.click(screen.getByRole('button', { name: 'competitions.editModal.save' }));

    await waitFor(() => expect(mockAdminUpdateCompetition).toHaveBeenCalledWith('c1', expect.any(Object)));
  });

  it('runs a non-destructive transition immediately', async () => {
    mockActivateCompetition.mockResolvedValue({ id: 'c1', status: 'ACTIVE' });
    renderPanel();
    await waitFor(() => expect(mockGetAdminStats).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('link', { name: /screens.adminCompetitions/ }));
    await enLaTabla('Ryder Cup Local');

    fireEvent.click(screen.getByRole('button', { name: 'competitions.actions.activate' }));

    await waitFor(() => expect(mockActivateCompetition).toHaveBeenCalledWith('c1'));
  });

  it('paginates competitions using the extra-item hasMore trick (no backend total count)', async () => {
    const fullPage = Array.from({ length: 21 }, (_, i) => ({
      id: `c${i}`,
      name: `Competition ${i}`,
      status: 'DRAFT',
      startDate: '2026-09-01',
      endDate: '2026-09-03',
      creator: { firstName: 'Ana', lastName: 'Ruiz' },
    }));
    mockAdminListCompetitions.mockResolvedValue(fullPage);
    renderPanel();
    await waitFor(() => expect(mockGetAdminStats).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('link', { name: /screens.adminCompetitions/ }));
    await waitFor(() => expect(mockAdminListCompetitions).toHaveBeenCalled());

    // 21 fetched (limit 20 + 1) means there's a next page; only 20 are shown.
    expect(within(screen.getByRole('table')).getByText('Competition 19')).toBeInTheDocument();
    expect(screen.queryByText('Competition 20')).not.toBeInTheDocument();

    const nextButton = screen.getByRole('button', { name: 'competitions.next' });
    expect(screen.getByRole('button', { name: 'competitions.previous' })).toBeDisabled();
    expect(nextButton).not.toBeDisabled();

    mockAdminListCompetitions.mockResolvedValue([]);
    fireEvent.click(nextButton);

    await waitFor(() =>
      expect(mockAdminListCompetitions).toHaveBeenLastCalledWith(
        expect.objectContaining({ offset: 20, limit: 21 })
      )
    );
  });

  it('requires confirmation before cancelling a competition', async () => {
    mockCancelCompetition.mockResolvedValue({ id: 'c1', status: 'CANCELLED' });
    renderPanel();
    await waitFor(() => expect(mockGetAdminStats).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('link', { name: /screens.adminCompetitions/ }));
    await enLaTabla('Ryder Cup Local');

    fireEvent.click(screen.getAllByRole('button', { name: 'competitions.actions.cancel' })[0]);
    expect(mockCancelCompetition).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'competitions.confirmCancel' }));

    await waitFor(() => expect(mockCancelCompetition).toHaveBeenCalledWith('c1'));
  });

  it('F6: en el móvil, cancelar desde la ficha también pide la confirmación', async () => {
    mockCancelCompetition.mockResolvedValue({ id: 'c1', status: 'CANCELLED' });
    renderPanel();
    await waitFor(() => expect(mockGetAdminStats).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('link', { name: /screens.adminCompetitions/ }));
    await enLaTabla('Ryder Cup Local');
    const filas = within(screen.getByRole('list', { name: 'competitions.listLabel' }));
    fireEvent.click(filas.getByRole('button', { name: /Ryder Cup Local/ }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'competitions.actions.cancel' }));

    expect(screen.getByRole('dialog')).toHaveAccessibleName('competitions.confirmCancelTitle');
    expect(mockCancelCompetition).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'competitions.confirmCancel' }));
    await waitFor(() => expect(mockCancelCompetition).toHaveBeenCalledWith('c1'));
  });

  it('F2: en el móvil, editar desde la ficha abre el editor de siempre', async () => {
    renderPanel();
    await waitFor(() => expect(mockGetAdminStats).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('link', { name: /screens.adminUsers/ }));
    await enLaTabla('Agus Estevez');
    const filas = within(screen.getByRole('list', { name: 'users.listLabel' }));
    fireEvent.click(filas.getByRole('button', { name: /Agus Estevez/ }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'users.editTooltip' }));

    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'editModal.save' })).toBeInTheDocument();
  });

  // Pasó a ModalShell el 4 oct 2026: se anuncia con su título, y Escape la
  // descarta como su botón de no cancelar
  it('la confirmación de cancelar se anuncia y se descarta con Escape', async () => {
    renderPanel();
    await waitFor(() => expect(mockGetAdminStats).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('link', { name: /screens.adminCompetitions/ }));
    await enLaTabla('Ryder Cup Local');

    fireEvent.click(screen.getAllByRole('button', { name: 'competitions.actions.cancel' })[0]);

    const dialogo = await screen.findByRole('dialog');
    expect(dialogo).toHaveAccessibleName('competitions.confirmCancelTitle');
    // Pulsar fuera no la descarta, como antes
    const fondo = screen.getByRole('dialog');
    fireEvent.mouseDown(fondo);
    fireEvent.click(fondo);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(mockCancelCompetition).not.toHaveBeenCalled();
  });
  // Revisión del 17 oct: el panel no se desmonta al cambiar de sección
  it('cambiar de sección cierra el modal que estaba abierto', async () => {
    renderPanel();
    await waitFor(() => expect(mockGetAdminStats).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('link', { name: /screens.adminUsers/ }));
    await enLaTabla('Agus Estevez');
    fireEvent.click(screen.getByRole('button', { name: 'users.deactivateTooltip' }));
    expect(screen.getByRole('button', { name: 'manageModal.confirmDeactivate' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: /screens.adminCompetitions/ }));
    expect(screen.queryByRole('button', { name: 'manageModal.confirmDeactivate' })).not.toBeInTheDocument();
  });

  it('volver a campos de golf abre otra vez los aprobados', async () => {
    renderPanel();
    await waitFor(() => expect(mockGetAdminStats).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('link', { name: /screens.adminGolfCourses/ }));
    fireEvent.click(screen.getByRole('tab', { name: 'golfTabs.requests' }));
    fireEvent.click(screen.getByRole('link', { name: /screens.adminUsers/ }));
    fireEvent.click(screen.getByRole('link', { name: /screens.adminGolfCourses/ }));
    expect(screen.getByRole('tab', { name: 'golfTabs.approved' })).toHaveAttribute('aria-selected', 'true');
  });

  it('los números del menú no se piden otra vez solo por cambiar de sección', async () => {
    renderPanel();
    await waitFor(() => expect(mockGetAdminStats).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('link', { name: /screens.adminUsers/ }));
    fireEvent.click(screen.getByRole('link', { name: /screens.adminCompetitions/ }));
    await waitFor(() => expect(mockAdminListCompetitions).toHaveBeenCalled());
    expect(mockGetAdminStats).toHaveBeenCalledTimes(1);
  });

  it('aprobar o rechazar una solicitud vuelve a pedir los números del menú', async () => {
    renderPanel();
    await waitFor(() => expect(mockGetAdminStats).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('link', { name: /screens.adminGolfCourses/ }));
    fireEvent.click(screen.getByRole('tab', { name: 'golfTabs.requests' }));
    fireEvent.click(screen.getByRole('button', { name: 'aprobar-una' }));
    await waitFor(() => expect(mockGetAdminStats).toHaveBeenCalledTimes(2));
  });

  it('las pestañas de campos se mueven con las flechas, con una sola en el orden del tabulador', async () => {
    renderPanel();
    await waitFor(() => expect(mockGetAdminStats).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('link', { name: /screens.adminGolfCourses/ }));
    const [aprobados, solicitudes] = screen.getAllByRole('tab');
    expect(aprobados).toHaveAttribute('tabindex', '0');
    expect(solicitudes).toHaveAttribute('tabindex', '-1');
    fireEvent.keyDown(aprobados, { key: 'ArrowRight' });
    expect(solicitudes).toHaveAttribute('aria-selected', 'true');
    expect(solicitudes).toHaveFocus();
    expect(solicitudes).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(solicitudes, { key: 'ArrowRight' });
    expect(aprobados).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(aprobados, { key: 'ArrowLeft' });
    expect(solicitudes).toHaveAttribute('aria-selected', 'true');
  });

  it('las pestañas de campos van a la primera y a la última con Inicio y Fin (FE #658)', async () => {
    renderPanel();
    await waitFor(() => expect(mockGetAdminStats).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('link', { name: /screens.adminGolfCourses/ }));
    const barra = screen.getByRole('tablist', { name: 'common:screens.adminGolfCourses' });
    const [aprobados, solicitudes] = within(barra).getAllByRole('tab');
    fireEvent.keyDown(aprobados, { key: 'End' });
    expect(solicitudes).toHaveAttribute('aria-selected', 'true');
    expect(solicitudes).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', solicitudes.id);
    fireEvent.keyDown(solicitudes, { key: 'Home' });
    expect(aprobados).toHaveAttribute('aria-selected', 'true');
    expect(aprobados).toHaveFocus();
  });

  it('en el ordenador, la sección lleva su título y su panel de pestañas', async () => {
    renderPanel();
    await waitFor(() => expect(mockGetAdminStats).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('link', { name: /screens.adminGolfCourses/ }));
    expect(screen.getByRole('heading', { level: 2, name: 'common:screens.adminGolfCourses' })).toHaveClass('hidden', 'md:block');
    const pestaña = screen.getByRole('tab', { name: 'golfTabs.approved' });
    const panel = screen.getByRole('tabpanel');
    expect(pestaña).toHaveAttribute('aria-controls', panel.id);
    expect(panel).toHaveAttribute('aria-labelledby', pestaña.id);
  });

  it('en /admin, el ordenador marca el resumen y solo el resumen', async () => {
    renderPanel();
    await waitFor(() => expect(mockGetAdminStats).toHaveBeenCalled());
    const nav = screen.getByRole('navigation');
    const filas = within(nav).getAllByRole('link');
    expect(filas[0]).toHaveClass('md:bg-primary-50');
    for (const fila of filas.slice(1)) expect(fila).not.toHaveClass('md:bg-primary-50');
  });
});

