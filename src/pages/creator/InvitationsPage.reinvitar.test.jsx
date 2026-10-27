import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';

/**
 * Volver a invitar (release social 2, tabla aprobada el 27 oct 2026: R1-R3).
 *
 *   #   caso                                              | qué pasa
 *   ----|-------------------------------------------------|-----------------------------------
 *   R1  rechazada, caducada, retirada o sin plaza         | «Volver a invitar»: manda otra
 *   R1  a un usuario → por su id; solo correo → por correo |
 *   R2  ya inscrito, u otra pendiente a ese correo         | sin botón
 *   R2  sin saber quién está dentro (falló la consulta)    | sin botón
 *   R3  llena, o ya no admite invitaciones                 | sin botón
 *   -   pendiente o aceptada                               | sin botón
 *
 * (Lo de abajo es el montaje del test de retirar.)
 *
 *   #   caso                                          | qué pasa
 *   ----|---------------------------------------------|----------------------------------------
 *   R1  pendiente → «Retirar» → confirmar             | se retira, se dice, y la lista se recarga
 *   R2  «Mantener»                                     | no se retira
 *   R3  ya no estaba pendiente (409)                  | se dice, y se recarga
 *   R4  ya aceptada                                   | sin botón
 *   F1  lleno (inscritos ≥ cupo)                      | sin «Enviar invitación», con el motivo
 *   F2  con plazas                                    | el botón sigue
 *   F3  enviar y el servidor dice COMPETITION_FULL    | «completa», no «ya invitado»
 *   F4  el filtro                                     | incluye las retiradas
 */

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, params) => (params ? `${key} ${JSON.stringify(params)}` : key),
    i18n: { language: 'es' },
  }),
}));

const sesion = { user: { id: 'user-1', first_name: 'Test', last_name: 'User' }, loading: false };
vi.mock('../../hooks/useAuth', () => ({ useAuth: () => sesion }));
vi.mock('../../hooks/useUserRoles', () => ({
  useUserRoles: () => ({ isAdmin: false, isCreator: true, isLoading: false, error: null, refetch: vi.fn() }),
}));
vi.mock('../../components/layout/HeaderAuth', () => ({ default: () => null }));
// El modal de enviar, reducido a lo que importa aquí: dispara el envío
vi.mock('../../components/invitation/SendInvitationModal', () => ({
  default: ({ isOpen, onSendByUserId, onSend }) =>
    isOpen ? (
      <>
        <button onClick={() => onSendByUserId('u-9', null)}>enviar a u-9</button>
        <button onClick={() => onSend('nuevo@test.com', null)}>enviar por correo</button>
      </>
    ) : null,
}));

const mockDetalle = vi.fn();
const mockLista = vi.fn();
const mockRetirar = vi.fn();
const mockEnviar = vi.fn();
const mockEnviarPorCorreo = vi.fn();
const mockInscritos = vi.fn();
vi.mock('../../composition', () => ({
  getCompetitionDetailUseCase: { execute: (...a) => mockDetalle(...a) },
  listCompetitionInvitationsUseCase: { execute: (...a) => mockLista(...a) },
  cancelInvitationUseCase: { execute: (...a) => mockRetirar(...a) },
  sendInvitationByEmailUseCase: { execute: (...a) => mockEnviarPorCorreo(...a) },
  sendInvitationUseCase: { execute: (...a) => mockEnviar(...a) },
  searchUsersUseCase: { execute: vi.fn().mockResolvedValue([]) },
  listFriendsUseCase: { execute: vi.fn().mockResolvedValue({ friendships: [], totalCount: 0 }) },
  listEnrollmentsUseCase: { execute: (...a) => mockInscritos(...a) },
}));
vi.mock('../../utils/toast', () => ({ default: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

const InvitationsPage = (await import('./InvitationsPage')).default;
const customToast = (await import('../../utils/toast')).default;

const invitacion = (status, extra = {}) => ({
  id: 'inv-1',
  competitionName: 'Summer Cup',
  inviteeEmail: 'player@test.com',
  inviteeName: 'Player One',
  status,
  isPending: status === 'PENDING',
  isAccepted: status === 'ACCEPTED',
  isDeclined: false,
  isExpired: false,
  personalMessage: null,
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
  respondedAt: null,
  ...extra,
});

const competicion = (extra = {}) => ({
  id: 'comp-1', name: 'Summer Cup', status: 'ACTIVE', maxPlayers: 12, enrolledCount: 4, ...extra,
});

const pinta = () =>
  render(
    <MemoryRouter initialEntries={['/creator/competitions/comp-1/invitations']}>
      <Routes>
        <Route path="/creator/competitions/:id/invitations" element={<InvitationsPage />} />
      </Routes>
    </MemoryRouter>
  );

const volverAInvitar = () => screen.queryByTestId('reinvite-button');

// La lista de la pantalla, y aparte las pendientes (para saber a quién no ofrecer)
const conLista = (lista, pendientes = []) =>
  mockLista.mockImplementation((_, filtros = {}) =>
    Promise.resolve(
      filtros.status === 'PENDING'
        ? { invitations: pendientes, totalCount: pendientes.length }
        : { invitations: lista, totalCount: lista.length }
    )
  );

// El botón sale cuando se sabe quién está dentro: mirar antes no prueba nada
const trasSaberLaSituacion = async () => {
  await waitFor(() => expect(mockInscritos).toHaveBeenCalled());
  await act(async () => {});
};

describe('InvitationsPage · volver a invitar (release social 2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDetalle.mockResolvedValue(competicion());
    mockInscritos.mockResolvedValue([]);
    mockEnviar.mockResolvedValue({});
    mockEnviarPorCorreo.mockResolvedValue({});
  });

  it.each(['DECLINED', 'EXPIRED', 'CANCELLED', 'NO_ROOM'])(
    'R1: %s → a un usuario, se le vuelve a invitar por su id',
    async (status) => {
      conLista([invitacion(status, { inviteeUserId: 'u-2' })]);
      pinta();

      fireEvent.click(await screen.findByTestId('reinvite-button'));

      await waitFor(() => expect(mockEnviar).toHaveBeenCalledWith('comp-1', 'u-2', null));
      expect(mockEnviarPorCorreo).not.toHaveBeenCalled();
      await waitFor(() => expect(customToast.success).toHaveBeenCalledWith('success.sent'));
    }
  );

  it('R1: invitada solo por correo, por correo', async () => {
    conLista([invitacion('DECLINED', { inviteeUserId: null })]);
    pinta();

    fireEvent.click(await screen.findByTestId('reinvite-button'));

    await waitFor(() => expect(mockEnviarPorCorreo).toHaveBeenCalledWith('comp-1', 'player@test.com', null));
  });

  it.each(['PENDING', 'ACCEPTED'])('%s: sin botón', async (status) => {
    conLista([invitacion(status, { inviteeUserId: 'u-2' })]);
    pinta();
    await screen.findByText('Player One');

    expect(volverAInvitar()).not.toBeInTheDocument();
  });

  it('en una lista con cerradas, a una aceptada o pendiente no se le ofrece', async () => {
    conLista([
      invitacion('DECLINED', { id: 'inv-1', inviteeUserId: 'u-2' }),
      invitacion('ACCEPTED', { id: 'inv-3', inviteeUserId: 'u-3', inviteeEmail: 'tres@test.com', inviteeName: 'Tres' }),
    ]);
    pinta();
    await screen.findByText('Tres');
    await trasSaberLaSituacion();

    expect(screen.getAllByTestId('reinvite-button')).toHaveLength(1);
  });

  it('mandada, el botón se va al momento: un segundo toque no manda otra (revisor)', async () => {
    conLista([invitacion('DECLINED', { inviteeUserId: 'u-2' })]);
    let soltar;
    mockEnviar.mockReturnValue(new Promise((r) => { soltar = r; }));
    pinta();
    fireEvent.click(await screen.findByTestId('reinvite-button'));
    // La lista releída aún no trae la nueva pendiente
    mockLista.mockImplementation((_, filtros = {}) =>
      filtros.status === 'PENDING'
        ? new Promise(() => {})
        : Promise.resolve({ invitations: [invitacion('DECLINED', { inviteeUserId: 'u-2' })], totalCount: 1 })
    );

    await act(async () => soltar({}));

    expect(volverAInvitar()).not.toBeInTheDocument();
    expect(mockEnviar).toHaveBeenCalledTimes(1);
  });

  it('dice a quién en su etiqueta', async () => {
    conLista([invitacion('DECLINED', { inviteeUserId: 'u-2' })]);
    pinta();

    expect(await screen.findByTestId('reinvite-button')).toHaveAttribute(
      'aria-label',
      'actions.reinviteAria {"name":"Player One"}'
    );
  });

  it('R2: ya inscrito, sin botón', async () => {
    conLista([invitacion('DECLINED', { inviteeUserId: 'u-2' })]);
    mockInscritos.mockResolvedValue([{ userId: 'u-2' }]);
    pinta();
    await screen.findByText('Player One');
    await waitFor(() => expect(mockInscritos).toHaveBeenCalled());

    expect(volverAInvitar()).not.toBeInTheDocument();
  });

  it('R2: con otra pendiente a ese correo, sin botón', async () => {
    const pendiente = invitacion('PENDING', { id: 'inv-2', inviteeUserId: 'u-2' });
    conLista([invitacion('DECLINED', { inviteeUserId: 'u-2' })], [pendiente]);
    pinta();
    await screen.findByText('Player One');
    await waitFor(() => expect(mockInscritos).toHaveBeenCalled());

    expect(volverAInvitar()).not.toBeInTheDocument();
  });

  it('R2: sin saber quién está dentro, no se ofrece', async () => {
    conLista([invitacion('DECLINED', { inviteeUserId: 'u-2' })]);
    mockInscritos.mockRejectedValue(new Error('sin red'));
    pinta();
    await screen.findByText('Player One');
    await waitFor(() => expect(mockInscritos).toHaveBeenCalled());

    expect(volverAInvitar()).not.toBeInTheDocument();
  });

  it('R3: llena, sin botón', async () => {
    mockDetalle.mockResolvedValue(competicion({ enrolledCount: 12 }));
    conLista([invitacion('DECLINED', { inviteeUserId: 'u-2' })]);
    pinta();
    await screen.findByText('Player One');
    await trasSaberLaSituacion();

    expect(volverAInvitar()).not.toBeInTheDocument();
  });

  it('R3: ya no admite invitaciones (en juego), sin botón', async () => {
    mockDetalle.mockResolvedValue(competicion({ status: 'IN_PROGRESS' }));
    conLista([invitacion('DECLINED', { inviteeUserId: 'u-2' })]);
    pinta();
    await screen.findByText('Player One');
    await trasSaberLaSituacion();

    expect(volverAInvitar()).not.toBeInTheDocument();
  });

  it('R3: si el servidor dice que está llena, lo dice (el aviso de siempre)', async () => {
    conLista([invitacion('DECLINED', { inviteeUserId: 'u-2' })]);
    mockEnviar.mockRejectedValue(Object.assign(new Error('x'), { status: 409, errorCode: 'COMPETITION_FULL' }));
    pinta();

    fireEvent.click(await screen.findByTestId('reinvite-button'));

    await waitFor(() => expect(customToast.error).toHaveBeenCalledWith('errors.competitionFull'));
  });
});
