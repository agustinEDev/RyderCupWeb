import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import AdminPanel from './AdminPanel';
import customToast from '../../utils/toast';

// El panel va por rutas desde el 17 oct: se abre en /admin y cada sección se
// toca en el menú
const arbolDelPanel = () => (
  <MemoryRouter initialEntries={['/admin']}>
    <Routes>
      <Route path="/admin/:seccion?" element={<AdminPanel />} />
    </Routes>
  </MemoryRouter>
);
const renderPanel = () => render(arbolDelPanel());

// El mismo `t` en cada pintado, como el de i18next: uno nuevo cada vez cambia
// `loadCompetitions` y la lista se recargaba sin parar, desmontando lo abierto
const { TRADUCCION } = vi.hoisted(() => ({
  TRADUCCION: {
    t: (key, params) => (params?.count !== undefined ? `${key}_${params.count}` : key),
    i18n: { language: 'en' },
  },
}));
vi.mock('../../utils/toast', () => ({
  default: { success: vi.fn(), error: vi.fn(), info: vi.fn(), dismiss: vi.fn() },
  customToast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), dismiss: vi.fn() },
}));

// Lo que devuelven ahora `useTranslation` y `useAuth`: el mismo objeto salvo
// cuando una prueba cambia de idioma o trae un usuario nuevo
const { ACTUAL } = vi.hoisted(() => ({ ACTUAL: { traduccion: null, user: null } }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ACTUAL.traduccion ?? TRADUCCION,
}));

// El mismo `user` en cada pintado, como el de verdad: uno nuevo cada vez
// repetiría los efectos que dependen de él
const { ADMIN } = vi.hoisted(() => ({ ADMIN: { id: 'admin-1', first_name: 'Admin', last_name: 'User', is_admin: true } }));
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: ACTUAL.user ?? ADMIN, loading: false }),
}));

// Cambiar de idioma: i18next da un `t` nuevo
const cambiarDeIdioma = (rerender) => {
  ACTUAL.traduccion = { t: (...args) => TRADUCCION.t(...args), i18n: { language: 'es' } };
  rerender(arbolDelPanel());
};
// La sesión trae otro objeto de usuario (el mismo admin, otra referencia)
const traerOtroUsuario = (rerender) => {
  ACTUAL.user = { ...ADMIN };
  rerender(arbolDelPanel());
};
// Una respuesta que llega cuando la prueba quiere
const aMano = () => {
  let resolver;
  let rechazar;
  const promesa = new Promise((res, rej) => {
    resolver = res;
    rechazar = rej;
  });
  return { promesa, resolver, rechazar };
};
const usuario = (id, nombre) => ({ ...usersResponse.users[0], id, firstName: nombre, lastName: 'Prueba' });
const competicion = (id, nombre) => ({ ...competitionsResponse[0], id, name: nombre });
const seccionDelPanel = () => screen.getByTestId('seccion-del-panel');
const cargandoEnLaSeccion = () => within(seccionDelPanel()).queryByRole('status');

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
    ACTUAL.traduccion = null;
    ACTUAL.user = null;
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

  it('si el correo queda pendiente, el aviso lo dice (RyderCupAm #753)', async () => {
    mockUpdateAdminUser.mockResolvedValue({ ...usersResponse.users[0], pendingEmail: 'nuevo@test.com' });
    renderPanel();
    await waitFor(() => expect(mockGetAdminStats).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('link', { name: /screens.adminUsers/ }));
    await enLaTabla('Agus Estevez');

    fireEvent.click(screen.getByRole('button', { name: 'users.editTooltip' }));
    fireEvent.change(screen.getByLabelText('editModal.email'), { target: { value: 'nuevo@test.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'editModal.save' }));

    await waitFor(() => expect(customToast.success).toHaveBeenCalledWith('editModal.emailPending'));
  });

  it('si el admin no tocó el correo, un pendiente del propio usuario no cambia el aviso', async () => {
    mockUpdateAdminUser.mockResolvedValue({ ...usersResponse.users[0], pendingEmail: 'suyo@test.com' });
    renderPanel();
    await waitFor(() => expect(mockGetAdminStats).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('link', { name: /screens.adminUsers/ }));
    await enLaTabla('Agus Estevez');

    fireEvent.click(screen.getByRole('button', { name: 'users.editTooltip' }));
    fireEvent.click(screen.getByRole('button', { name: 'editModal.save' }));

    await waitFor(() => expect(customToast.success).toHaveBeenCalledWith('editModal.success'));
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


/**
 * Las cargas del panel viven dentro de sus efectos (FE, refactor de efectos):
 * lo que ya hacían se queda igual, y una respuesta vieja ya no pisa nada.
 *
 *   #      caso                                          | qué pasa
 *   -------|---------------------------------------------|-------------------------------
 *   T1-1   cambiar de idioma con el resumen cargado     | los números NO se piden otra vez
 *   T1-2   la sesión trae otro objeto de usuario        | se piden otra vez, con la espera
 *   T1-3   buscar, filtrar o pasar de página (usuarios) | se piden con eso, con la espera
 *   T1-4   cambiar de idioma en usuarios                | se piden otra vez (como hoy)
 *   T1-5   buscar en competiciones                      | desde la primera página, con espera
 *   T1-13  la lista cambia antes de que llegue la vieja | la vieja no pisa ni quita la espera
 *   T1-14  se sale con el resumen pidiéndose            | su respuesta no toca nada
 */
describe('AdminPanel · las cargas de sus listas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ACTUAL.traduccion = null;
    ACTUAL.user = null;
    mockGetAdminStats.mockResolvedValue(stats);
    mockListAdminUsers.mockResolvedValue(usersResponse);
    mockAdminListCompetitions.mockResolvedValue(competitionsResponse);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  const resumenCargado = async () => {
    const vista = renderPanel();
    await waitFor(() => expect(within(seccionDelPanel()).getByText('25')).toBeInTheDocument());
    return vista;
  };

  const abrirUsuarios = async () => {
    const vista = await resumenCargado();
    fireEvent.click(screen.getByRole('link', { name: /screens.adminUsers/ }));
    await enLaTabla('Agus Estevez');
    return vista;
  };

  const abrirCompeticiones = async () => {
    const vista = await resumenCargado();
    fireEvent.click(screen.getByRole('link', { name: /screens.adminCompetitions/ }));
    await enLaTabla('Ryder Cup Local');
    return vista;
  };

  const buscarCompeticion = (texto) => {
    fireEvent.change(screen.getByPlaceholderText('competitions.searchPlaceholder'), { target: { value: texto } });
    fireEvent.click(screen.getByRole('button', { name: 'competitions.searchButton' }));
  };

  it('T1-1: cambiar de idioma no vuelve a pedir los números del resumen', async () => {
    // Given el resumen cargado
    const { rerender } = await resumenCargado();
    expect(mockGetAdminStats).toHaveBeenCalledTimes(1);

    // When cambia el idioma
    cambiarDeIdioma(rerender);
    await act(async () => {});

    // Then no se piden otra vez
    expect(mockGetAdminStats).toHaveBeenCalledTimes(1);
  });

  it('T1-2: con otro objeto de usuario el resumen se pide otra vez, con la espera mientras', async () => {
    // Given el resumen cargado
    const { rerender } = await resumenCargado();
    const segunda = aMano();
    mockGetAdminStats.mockReturnValueOnce(segunda.promesa);

    // When la sesión trae otro objeto de usuario
    traerOtroUsuario(rerender);

    // Then se piden otra vez, y se espera hasta que lleguen
    await waitFor(() => expect(mockGetAdminStats).toHaveBeenCalledTimes(2));
    expect(cargandoEnLaSeccion()).toBeInTheDocument();
    await act(async () => segunda.resolver({ ...stats, totalQuickMatches: 31 }));
    expect(await within(seccionDelPanel()).findByText('31')).toBeInTheDocument();
    expect(cargandoEnLaSeccion()).toBeNull();
  });

  it('T1-3: buscar pide los usuarios con lo buscado, desde el principio y con la espera', async () => {
    // Given la sección de usuarios
    await abrirUsuarios();
    const llega = aMano();
    mockListAdminUsers.mockReturnValueOnce(llega.promesa);

    // When se busca
    fireEvent.change(screen.getByPlaceholderText('users.searchPlaceholder'), { target: { value: '  ana ' } });
    fireEvent.click(screen.getByRole('button', { name: 'users.searchButton' }));

    // Then se piden con eso, y la espera hasta que llegan
    await waitFor(() =>
      expect(mockListAdminUsers).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'ana', offset: 0, limit: 20 }))
    );
    expect(cargandoEnLaSeccion()).toBeInTheDocument();
    await act(async () => llega.resolver({ users: [usuario('u2', 'Ana')], totalCount: 1 }));
    expect(await enLaTabla('Ana Prueba')).toBeInTheDocument();
    expect(cargandoEnLaSeccion()).toBeNull();
  });

  it('T1-3: cambiar un filtro pide los usuarios con él, con la espera', async () => {
    await abrirUsuarios();
    const llega = aMano();
    mockListAdminUsers.mockReturnValueOnce(llega.promesa);

    fireEvent.change(screen.getByDisplayValue('users.filterVerifiedAll'), { target: { value: 'unverified' } });

    await waitFor(() =>
      expect(mockListAdminUsers).toHaveBeenLastCalledWith(expect.objectContaining({ emailVerified: false, offset: 0 }))
    );
    expect(cargandoEnLaSeccion()).toBeInTheDocument();
    await act(async () => llega.resolver({ users: [usuario('u3', 'Vera')], totalCount: 1 }));
    expect(await enLaTabla('Vera Prueba')).toBeInTheDocument();
    expect(cargandoEnLaSeccion()).toBeNull();
  });

  it('T1-3: pasar de página pide la siguiente, con la espera', async () => {
    mockListAdminUsers.mockResolvedValue({ ...usersResponse, totalCount: 45 });
    await abrirUsuarios();
    const llega = aMano();
    mockListAdminUsers.mockReturnValueOnce(llega.promesa);

    fireEvent.click(screen.getByRole('button', { name: 'users.next' }));

    await waitFor(() => expect(mockListAdminUsers).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 20 })));
    expect(cargandoEnLaSeccion()).toBeInTheDocument();
    await act(async () => llega.resolver({ users: [usuario('u21', 'Pagina')], totalCount: 45 }));
    expect(await enLaTabla('Pagina Prueba')).toBeInTheDocument();
  });

  it('T1-4: cambiar de idioma en usuarios los vuelve a pedir (como hoy)', async () => {
    // Given la sección de usuarios cargada
    const { rerender } = await abrirUsuarios();
    const antes = mockListAdminUsers.mock.calls.length;

    // When cambia el idioma
    cambiarDeIdioma(rerender);

    // Then se piden otra vez
    await waitFor(() => expect(mockListAdminUsers).toHaveBeenCalledTimes(antes + 1));
  });

  it('T1-4: cambiar de idioma en competiciones las vuelve a pedir (como hoy)', async () => {
    const { rerender } = await abrirCompeticiones();
    const antes = mockAdminListCompetitions.mock.calls.length;

    cambiarDeIdioma(rerender);

    await waitFor(() => expect(mockAdminListCompetitions).toHaveBeenCalledTimes(antes + 1));
  });

  it('T1-5: buscar competiciones vuelve a la primera página, con la espera', async () => {
    // Given la segunda página de competiciones
    const llenas = Array.from({ length: 21 }, (_, i) => competicion(`c${i}`, `Competition ${i}`));
    mockAdminListCompetitions.mockResolvedValue(llenas);
    await resumenCargado();
    fireEvent.click(screen.getByRole('link', { name: /screens.adminCompetitions/ }));
    await enLaTabla('Competition 0');
    fireEvent.click(screen.getByRole('button', { name: 'competitions.next' }));
    await waitFor(() => expect(mockAdminListCompetitions).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 20 })));
    await enLaTabla('Competition 0');
    const llega = aMano();
    mockAdminListCompetitions.mockReturnValueOnce(llega.promesa);

    // When se busca
    buscarCompeticion(' ryder ');

    // Then se pide desde el principio y se espera
    await waitFor(() =>
      expect(mockAdminListCompetitions).toHaveBeenLastCalledWith({ searchName: 'ryder', limit: 21, offset: 0 })
    );
    expect(cargandoEnLaSeccion()).toBeInTheDocument();
    await act(async () => llega.resolver([competicion('c-r', 'Ryder Buscada')]));
    expect(await enLaTabla('Ryder Buscada')).toBeInTheDocument();
    expect(cargandoEnLaSeccion()).toBeNull();
  });

  it('tras una transición, las competiciones se piden otra vez, con la espera', async () => {
    mockActivateCompetition.mockResolvedValue({ id: 'c1', status: 'ACTIVE' });
    await abrirCompeticiones();
    const antes = mockAdminListCompetitions.mock.calls.length;
    const llega = aMano();
    mockAdminListCompetitions.mockReturnValueOnce(llega.promesa);

    fireEvent.click(screen.getByRole('button', { name: 'competitions.actions.activate' }));

    await waitFor(() => expect(mockAdminListCompetitions).toHaveBeenCalledTimes(antes + 1));
    expect(cargandoEnLaSeccion()).toBeInTheDocument();
    await act(async () => llega.resolver([competicion('c1', 'Ryder Activada')]));
    expect(await enLaTabla('Ryder Activada')).toBeInTheDocument();
  });

  it('tras editar una competición, la lista se pide otra vez', async () => {
    mockAdminUpdateCompetition.mockResolvedValue({ id: 'c1', name: 'Renamed' });
    await abrirCompeticiones();
    const antes = mockAdminListCompetitions.mock.calls.length;

    fireEvent.click(screen.getAllByRole('button', { name: 'competitions.editTooltip' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'competitions.editModal.save' }));

    await waitFor(() => expect(mockAdminListCompetitions).toHaveBeenCalledTimes(antes + 1));
  });

  describe('T1-13: una respuesta vieja no pisa la nueva', () => {
    const cambiarDosFiltros = async (vieja, nueva) => {
      mockListAdminUsers.mockReturnValueOnce(vieja.promesa).mockReturnValueOnce(nueva.promesa);
      fireEvent.change(screen.getByDisplayValue('users.filterRoleAll'), { target: { value: 'admin' } });
      await waitFor(() => expect(mockListAdminUsers).toHaveBeenLastCalledWith(expect.objectContaining({ isAdmin: true })));
      fireEvent.change(screen.getByDisplayValue('users.filterStatusAll'), { target: { value: 'active' } });
      await waitFor(() => expect(mockListAdminUsers).toHaveBeenLastCalledWith(expect.objectContaining({ isActive: true })));
    };

    it('usuarios: si la vieja llega antes, la espera sigue hasta la nueva', async () => {
      // Given usuarios pidiéndose con un filtro
      await abrirUsuarios();
      const vieja = aMano();
      const nueva = aMano();
      // When el filtro cambia antes de que llegue
      await cambiarDosFiltros(vieja, nueva);
      await act(async () => vieja.resolver({ users: [usuario('u-v', 'Vieja')], totalCount: 1 }));

      // Then la vieja no quita la espera de la nueva
      expect(cargandoEnLaSeccion()).toBeInTheDocument();
      await act(async () => nueva.resolver({ users: [usuario('u-n', 'Nueva')], totalCount: 1 }));
      expect(await enLaTabla('Nueva Prueba')).toBeInTheDocument();
      expect(screen.queryByText('Vieja Prueba')).toBeNull();
    });

    it('usuarios: si la vieja llega después, no pisa la nueva', async () => {
      await abrirUsuarios();
      const vieja = aMano();
      const nueva = aMano();
      await cambiarDosFiltros(vieja, nueva);

      await act(async () => nueva.resolver({ users: [usuario('u-n', 'Nueva')], totalCount: 1 }));
      await enLaTabla('Nueva Prueba');
      await act(async () => vieja.resolver({ users: [usuario('u-v', 'Vieja')], totalCount: 7 }));

      expect(within(screen.getByRole('table')).getByText('Nueva Prueba')).toBeInTheDocument();
      expect(screen.queryByText('Vieja Prueba')).toBeNull();
      expect(screen.getByText('users.totalCount_1')).toBeInTheDocument();
    });

    it('usuarios: un fallo de la vieja no avisa de nada', async () => {
      await abrirUsuarios();
      const vieja = aMano();
      const nueva = aMano();
      await cambiarDosFiltros(vieja, nueva);

      await act(async () => vieja.rechazar(new Error('vieja')));

      expect(customToast.error).not.toHaveBeenCalled();
      expect(cargandoEnLaSeccion()).toBeInTheDocument();
    });

    const buscarDosVeces = async (vieja, nueva) => {
      mockAdminListCompetitions.mockReturnValueOnce(vieja.promesa).mockReturnValueOnce(nueva.promesa);
      buscarCompeticion('vieja');
      await waitFor(() => expect(mockAdminListCompetitions).toHaveBeenLastCalledWith(expect.objectContaining({ searchName: 'vieja' })));
      buscarCompeticion('nueva');
      await waitFor(() => expect(mockAdminListCompetitions).toHaveBeenLastCalledWith(expect.objectContaining({ searchName: 'nueva' })));
    };

    it('competiciones: si la vieja llega antes, la espera sigue hasta la nueva', async () => {
      await abrirCompeticiones();
      const vieja = aMano();
      const nueva = aMano();
      await buscarDosVeces(vieja, nueva);

      await act(async () => vieja.resolver([competicion('c-v', 'Copa Vieja')]));

      expect(cargandoEnLaSeccion()).toBeInTheDocument();
      await act(async () => nueva.resolver([competicion('c-n', 'Copa Nueva')]));
      expect(await enLaTabla('Copa Nueva')).toBeInTheDocument();
      expect(screen.queryByText('Copa Vieja')).toBeNull();
    });

    it('competiciones: si la vieja llega después, no pisa la nueva', async () => {
      await abrirCompeticiones();
      const vieja = aMano();
      const nueva = aMano();
      await buscarDosVeces(vieja, nueva);

      await act(async () => nueva.resolver([competicion('c-n', 'Copa Nueva')]));
      await enLaTabla('Copa Nueva');
      await act(async () => vieja.resolver([competicion('c-v', 'Copa Vieja')]));

      expect(within(screen.getByRole('table')).getByText('Copa Nueva')).toBeInTheDocument();
      expect(screen.queryByText('Copa Vieja')).toBeNull();
    });
  });

  it('T1-13: resumen: con dos usuarios nuevos seguidos, el viejo que llega tarde no pisa', async () => {
    // Given el resumen pidiéndose dos veces seguidas
    const { rerender } = await resumenCargado();
    const vieja = aMano();
    const nueva = aMano();
    mockGetAdminStats.mockReturnValueOnce(vieja.promesa).mockReturnValueOnce(nueva.promesa);
    traerOtroUsuario(rerender);
    await waitFor(() => expect(mockGetAdminStats).toHaveBeenCalledTimes(2));
    traerOtroUsuario(rerender);
    await waitFor(() => expect(mockGetAdminStats).toHaveBeenCalledTimes(3));

    // When la nueva llega antes que la vieja
    await act(async () => nueva.resolver({ ...stats, totalQuickMatches: 41 }));
    await within(seccionDelPanel()).findByText('41');
    await act(async () => vieja.resolver({ ...stats, totalQuickMatches: 37 }));

    // Then se queda la nueva
    expect(within(seccionDelPanel()).getByText('41')).toBeInTheDocument();
    expect(within(seccionDelPanel()).queryByText('37')).toBeNull();
  });

  it('T1-14: si se sale con el resumen pidiéndose, su fallo no avisa de nada', async () => {
    // Given el resumen pidiéndose
    const tarde = aMano();
    mockGetAdminStats.mockReturnValueOnce(tarde.promesa);
    const { unmount } = renderPanel();
    await waitFor(() => expect(mockGetAdminStats).toHaveBeenCalledTimes(1));

    // When se sale del panel y luego falla
    unmount();
    await act(async () => tarde.rechazar(new Error('tarde')));

    // Then no toca nada
    expect(customToast.error).not.toHaveBeenCalled();
  });
});
