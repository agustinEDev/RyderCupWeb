import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import MyInvitationsPage from './MyInvitationsPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, params) => {
      if (params?.count !== undefined) return `${key}_${params.count}`;
      return key;
    },
    i18n: { language: 'en' },
  }),
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', first_name: 'Test', last_name: 'User' },
    loading: false,
  }),
}));

vi.mock('../../components/layout/HeaderAuth', () => ({
  default: () => <div data-testid="header-auth">Header</div>,
}));

const mockListMyInvitations = vi.fn().mockResolvedValue({
  invitations: [],
  totalCount: 0,
});

const mockRespondToInvitation = vi.fn();

vi.mock('../../composition', () => ({
  listMyInvitationsUseCase: { execute: (...args) => mockListMyInvitations(...args) },
  respondToInvitationUseCase: { execute: (...args) => mockRespondToInvitation(...args) },
}));

vi.mock('../../utils/toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderPage = () => {
  return render(
    <MemoryRouter initialEntries={['/player/invitations']}>
      <Routes>
        <Route path="/player/invitations" element={<MyInvitationsPage />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('MyInvitationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render header and page title', async () => {
    renderPage();
    expect(screen.getByTestId('header-auth')).toBeInTheDocument();
    expect(await screen.findByText('player.title')).toBeInTheDocument();
  });

  it('should show empty state when no invitations', async () => {
    renderPage();
    expect(await screen.findByText('noInvitations')).toBeInTheDocument();
  });

  it('should render invitations with accept/decline buttons', async () => {
    mockListMyInvitations.mockResolvedValue({
      invitations: [
        {
          id: 'inv-1',
          competitionId: 'comp-1',
          competitionName: 'Summer Cup',
          inviterName: 'Creator',
          inviteeEmail: 'player@test.com',
          status: 'PENDING',
          isPending: true,
          isAccepted: false,
          isDeclined: false,
          isExpired: false,
          personalMessage: null,
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          respondedAt: null,
        },
      ],
      totalCount: 1,
    });

    renderPage();
    expect(await screen.findByTestId('accept-button')).toBeInTheDocument();
    expect(screen.getByTestId('decline-button')).toBeInTheDocument();
  });

  it('should have status filter dropdown', async () => {
    renderPage();
    expect(await screen.findByTestId('status-filter')).toBeInTheDocument();
  });

  it('should navigate to competition detail after accepting invitation', async () => {
    mockListMyInvitations.mockResolvedValue({
      invitations: [
        {
          id: 'inv-1',
          competitionId: 'comp-123',
          competitionName: 'Summer Cup',
          inviterName: 'Creator',
          inviteeEmail: 'player@test.com',
          status: 'PENDING',
          isPending: true,
          isAccepted: false,
          isDeclined: false,
          isExpired: false,
          personalMessage: null,
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          respondedAt: null,
        },
      ],
      totalCount: 1,
    });
    mockRespondToInvitation.mockResolvedValue({
      id: 'inv-1',
      competitionId: 'comp-123',
      status: 'ACCEPTED',
    });

    renderPage();
    const acceptButton = await screen.findByTestId('accept-button');
    fireEvent.click(acceptButton);

    await waitFor(() => {
      expect(mockRespondToInvitation).toHaveBeenCalledWith('inv-1', 'ACCEPT');
    });
    await waitFor(() => {
      // Con el origen, para que «Volver» lleve de nuevo aquí (FE #682)
      expect(mockNavigate).toHaveBeenCalledWith('/competitions/comp-123', {
        state: { from: 'invitations' },
      });
    });
  });

  it('should show pending count badge', async () => {
    mockListMyInvitations.mockResolvedValue({
      invitations: [
        {
          id: 'inv-1',
          competitionId: 'comp-1',
          competitionName: 'Cup',
          status: 'PENDING',
          isPending: true,
          isAccepted: false,
          isDeclined: false,
          isExpired: false,
          personalMessage: null,
          inviteeEmail: 'p@t.com',
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          respondedAt: null,
        },
      ],
      totalCount: 1,
    });

    renderPage();
    expect(await screen.findByText('player.pendingCount_1')).toBeInTheDocument();
  });

  it('P1: una aceptada se abre desde su tarjeta, sin la caja suelta de abajo (FE #682)', async () => {
    mockListMyInvitations.mockResolvedValue({
      invitations: [
        {
          id: 'inv-1',
          competitionId: 'comp-123',
          competitionName: 'Summer Cup',
          inviterName: 'Creator',
          inviteeEmail: 'player@test.com',
          status: 'ACCEPTED',
          isPending: false,
          isAccepted: true,
          isDeclined: false,
          isExpired: false,
          personalMessage: null,
          expiresAt: null,
          respondedAt: '2026-09-21T10:00:00Z',
        },
      ],
      totalCount: 1,
    });

    renderPage();

    const tarjeta = await screen.findByTestId('invitation-card');
    const accesos = screen.getAllByText('Summer Cup');
    expect(accesos).toHaveLength(1);
    expect(tarjeta).toContainElement(accesos[0]);
    expect(accesos[0].closest('a')).toHaveAttribute('href', '/competitions/comp-123');
  });

  /**
   * Si la carga falla, la lista se quedaba vacía y la pantalla decía «No hay
   * invitaciones todavía»: una afirmación que no se había podido comprobar
   * (FE #685). Quien tenía una invitación pendiente entendía que no la tenía.
   */
  describe('si no se han podido cargar (FE #685)', () => {
    it('E1: sin red, dice que no hay conexión y deja reintentar, no que no hay ninguna', async () => {
      mockListMyInvitations.mockRejectedValue(new TypeError('Sin conexión'));

      renderPage();

      const aviso = await screen.findByTestId('invitaciones-sin-cargar');
      expect(aviso).toHaveTextContent('common:sinConexion.aviso');
      expect(screen.getByRole('button', { name: 'errors.retry' })).toBeInTheDocument();
      expect(screen.queryByText('noInvitations')).not.toBeInTheDocument();
    });

    it('E2: si falla el servidor, dice que no se han podido cargar', async () => {
      mockListMyInvitations.mockRejectedValue(
        Object.assign(new Error('Internal Server Error'), { status: 500 })
      );

      renderPage();

      expect(await screen.findByTestId('invitaciones-sin-cargar')).toHaveTextContent(
        'errors.failedToLoad'
      );
      expect(screen.queryByText('noInvitations')).not.toBeInTheDocument();
    });

    it('E3: reintentar vuelve a pedirlas y, si llegan, las enseña', async () => {
      // Falla hasta que se pulsa «Reintentar». Con respuestas de «una vez» no
      // vale: la `useAuth` falsa de este fichero da un usuario nuevo en cada
      // render, la carga se relanza sola y se las gasta antes del clic
      let hayRed = false;
      mockListMyInvitations.mockImplementation(() =>
        hayRed
          ? Promise.resolve({
              invitations: [
                {
                  id: 'inv-1',
                  competitionId: 'comp-1',
                  competitionName: 'Summer Cup',
                  inviterName: 'Creator',
                  inviteeEmail: 'player@test.com',
                  status: 'PENDING',
                  isPending: true,
                  isAccepted: false,
                  isDeclined: false,
                  isExpired: false,
                  personalMessage: null,
                  expiresAt: new Date(Date.now() + 86400000).toISOString(),
                  respondedAt: null,
                },
              ],
              totalCount: 1,
            })
          : Promise.reject(new TypeError('Sin conexión'))
      );

      renderPage();
      const reintentar = await screen.findByRole('button', { name: 'errors.retry' });
      hayRed = true;
      fireEvent.click(reintentar);

      expect(await screen.findByText('Summer Cup')).toBeInTheDocument();
      expect(screen.queryByTestId('invitaciones-sin-cargar')).not.toBeInTheDocument();
    });

    it('E4: si cargan y no hay ninguna, sí lo dice', async () => {
      mockListMyInvitations.mockResolvedValue({ invitations: [], totalCount: 0 });

      renderPage();

      expect(await screen.findByText('noInvitations')).toBeInTheDocument();
      expect(screen.queryByTestId('invitaciones-sin-cargar')).not.toBeInTheDocument();
    });
  });
});
