import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';

/**
 * Retirar una invitación y no invitar con el torneo lleno (FE #724, BE #359).
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
vi.mock('../../composition', () => ({
  getCompetitionDetailUseCase: { execute: (...a) => mockDetalle(...a) },
  listCompetitionInvitationsUseCase: { execute: (...a) => mockLista(...a) },
  cancelInvitationUseCase: { execute: (...a) => mockRetirar(...a) },
  sendInvitationByEmailUseCase: { execute: (...a) => mockEnviarPorCorreo(...a) },
  sendInvitationUseCase: { execute: (...a) => mockEnviar(...a) },
  searchUsersUseCase: { execute: vi.fn().mockResolvedValue([]) },
  listFriendsUseCase: { execute: vi.fn().mockResolvedValue({ friendships: [], totalCount: 0 }) },
  listEnrollmentsUseCase: { execute: vi.fn().mockResolvedValue([]) },
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

describe('InvitationsPage · retirar una invitación (FE #724)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDetalle.mockResolvedValue(competicion());
    mockLista.mockResolvedValue({ invitations: [invitacion('PENDING')], totalCount: 1 });
    mockRetirar.mockResolvedValue(undefined);
  });

  it('R1: se confirma, se retira, se dice y se recarga la lista', async () => {
    pinta();
    fireEvent.click(await screen.findByRole('button', { name: 'actions.withdraw' }));

    const dialogo = await screen.findByRole('dialog');
    expect(dialogo).toHaveTextContent('creator.withdrawDialog.title {"name":"Player One"}');
    const llamadasAntes = mockLista.mock.calls.length;
    fireEvent.click(within(dialogo).getByRole('button', { name: 'creator.withdrawDialog.confirm' }));

    await waitFor(() => expect(mockRetirar).toHaveBeenCalledWith('inv-1'));
    await waitFor(() => expect(customToast.success).toHaveBeenCalledWith('success.withdrawn'));
    await waitFor(() => expect(mockLista.mock.calls.length).toBeGreaterThan(llamadasAntes));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('R2: «Mantener» no retira nada', async () => {
    pinta();
    fireEvent.click(await screen.findByRole('button', { name: 'actions.withdraw' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'creator.withdrawDialog.keep' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mockRetirar).not.toHaveBeenCalled();
  });

  it('R3: si ya no estaba pendiente, se dice con su texto y se recarga', async () => {
    mockRetirar.mockRejectedValueOnce(Object.assign(new Error('Invitation is in status DECLINED'), { status: 409 }));
    pinta();
    fireEvent.click(await screen.findByRole('button', { name: 'actions.withdraw' }));
    const llamadasAntes = mockLista.mock.calls.length;
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'creator.withdrawDialog.confirm' }));

    await waitFor(() => expect(customToast.error).toHaveBeenCalledWith('errors.notPendingAnymore'));
    await waitFor(() => expect(mockLista.mock.calls.length).toBeGreaterThan(llamadasAntes));
  });

  it('R4: una ya aceptada no se retira', async () => {
    mockLista.mockResolvedValue({ invitations: [invitacion('ACCEPTED')], totalCount: 1 });
    pinta();

    await screen.findByTestId('invitation-card');
    expect(screen.queryByRole('button', { name: 'actions.withdraw' })).not.toBeInTheDocument();
  });

  it('F4: se puede filtrar por las retiradas', async () => {
    pinta();

    const filtro = await screen.findByTestId('status-filter');
    expect(within(filtro).getByRole('option', { name: 'status.CANCELLED' })).toBeInTheDocument();
  });
});

describe('InvitationsPage · con el torneo lleno no se invita (FE #724)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLista.mockResolvedValue({ invitations: [], totalCount: 0 });
  });

  it('F1: lleno, sin botón y con el motivo', async () => {
    mockDetalle.mockResolvedValue(competicion({ maxPlayers: 12, enrolledCount: 12 }));
    pinta();

    expect(await screen.findByTestId('invitar-lleno')).toHaveTextContent('creator.competitionFull {"count":12}');
    expect(screen.queryByText('creator.sendNew')).not.toBeInTheDocument();
  });

  it('F2: con plazas, el botón sigue', async () => {
    mockDetalle.mockResolvedValue(competicion({ maxPlayers: 12, enrolledCount: 11 }));
    pinta();

    expect(await screen.findByText('creator.sendNew')).toBeInTheDocument();
    expect(screen.queryByTestId('invitar-lleno')).not.toBeInTheDocument();
  });

  it('F3: si al enviar ya estaba lleno, lo dice así y no como «ya invitado»', async () => {
    mockDetalle.mockResolvedValue(competicion({ maxPlayers: 12, enrolledCount: 11 }));
    mockEnviar.mockRejectedValueOnce(
      Object.assign(new Error('full'), { status: 409, errorCode: 'COMPETITION_FULL' })
    );
    pinta();
    fireEvent.click(await screen.findByText('creator.sendNew'));
    fireEvent.click(await screen.findByText('enviar a u-9'));

    await waitFor(() => expect(customToast.error).toHaveBeenCalledWith('errors.competitionFull'));
    expect(customToast.error).not.toHaveBeenCalledWith('errors.duplicateInvitation');
  });

  it('F3b: igual al invitar por correo', async () => {
    mockDetalle.mockResolvedValue(competicion({ maxPlayers: 12, enrolledCount: 11 }));
    mockEnviarPorCorreo.mockRejectedValueOnce(
      Object.assign(new Error('full'), { status: 409, errorCode: 'COMPETITION_FULL' })
    );
    pinta();
    fireEvent.click(await screen.findByText('creator.sendNew'));
    fireEvent.click(await screen.findByText('enviar por correo'));

    await waitFor(() => expect(customToast.error).toHaveBeenCalledWith('errors.competitionFull'));
    expect(customToast.error).not.toHaveBeenCalledWith('errors.duplicateInvitation');
  });
});

/**
 * Lo encontrado al probar en bloque en el Kind antes de la release (5 oct).
 *
 *   #   caso                                                   | qué pasa
 *   ----|------------------------------------------------------|-------------------------------------------
 *   H1  invitar y el servidor dice INVITATION_RATE_LIMIT (id)  | cuántas por hora, no «espera un minuto»
 *   H2  lo mismo por correo                                    | igual
 *   H3  un 429 sin código (el límite general)                  | el mensaje de siempre
 *   H4  el aviso de lleno, en el móvil                         | debajo, a todo el ancho; no al lado
 *   H5  el aviso de inscripción cerrada (el punto gemelo)      | igual
 */
describe('InvitationsPage · lo que se dice tras probar en el Kind', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLista.mockResolvedValue({ invitations: [], totalCount: 0 });
    mockDetalle.mockResolvedValue(competicion({ maxPlayers: 12, enrolledCount: 3 }));
  });

  const freno = () =>
    Object.assign(new Error('Demasiados intentos seguidos'), {
      status: 429,
      errorCode: 'INVITATION_RATE_LIMIT',
      data: { error_code: 'INVITATION_RATE_LIMIT', limit: 12 },
    });

  it('H1: con el freno por hora agotado dice cuántas por hora', async () => {
    mockEnviar.mockRejectedValueOnce(freno());
    pinta();
    fireEvent.click(await screen.findByText('creator.sendNew'));
    fireEvent.click(await screen.findByText('enviar a u-9'));

    await waitFor(() =>
      expect(customToast.error).toHaveBeenCalledWith('errors.rateLimited {"count":12}')
    );
  });

  it('H2: igual al invitar por correo', async () => {
    mockEnviarPorCorreo.mockRejectedValueOnce(freno());
    pinta();
    fireEvent.click(await screen.findByText('creator.sendNew'));
    fireEvent.click(await screen.findByText('enviar por correo'));

    await waitFor(() =>
      expect(customToast.error).toHaveBeenCalledWith('errors.rateLimited {"count":12}')
    );
  });

  // CodeRabbit en la #821: sin número no se dice «has enviado  invitaciones»
  it('H1b: si el freno llega sin número, el aviso genérico de envío', async () => {
    mockEnviar.mockRejectedValueOnce(
      Object.assign(new Error('Demasiados intentos seguidos'), {
        status: 429,
        errorCode: 'INVITATION_RATE_LIMIT',
        data: { error_code: 'INVITATION_RATE_LIMIT' },
      })
    );
    pinta();
    fireEvent.click(await screen.findByText('creator.sendNew'));
    fireEvent.click(await screen.findByText('enviar a u-9'));

    await waitFor(() => expect(customToast.error).toHaveBeenCalledWith('errors.failedToSend'));
  });

  it('H3: un 429 sin código sigue con el mensaje de siempre', async () => {
    mockEnviar.mockRejectedValueOnce(
      Object.assign(new Error('Demasiados intentos seguidos'), { status: 429, errorCode: null })
    );
    pinta();
    fireEvent.click(await screen.findByText('creator.sendNew'));
    fireEvent.click(await screen.findByText('enviar a u-9'));

    await waitFor(() =>
      expect(customToast.error).toHaveBeenCalledWith('Demasiados intentos seguidos')
    );
  });

  // En el móvil el aviso se metía al lado del subtítulo y los dos quedaban en
  // columnas estrechas. Debajo y a todo el ancho; en pantalla ancha, a la derecha
  it('H4: el aviso de lleno va debajo, a todo el ancho, en el móvil', async () => {
    mockDetalle.mockResolvedValue(competicion({ maxPlayers: 12, enrolledCount: 12 }));
    pinta();

    const aviso = await screen.findByTestId('invitar-lleno');
    expect(aviso).toHaveClass('w-full', 'sm:w-auto');
    expect(aviso.parentElement).toHaveClass('flex-wrap');
  });

  it('H5: y el de inscripción cerrada, igual', async () => {
    mockDetalle.mockResolvedValue(competicion({ status: 'CLOSED', maxPlayers: 12, enrolledCount: 3 }));
    pinta();

    const aviso = await screen.findByTestId('invitar-cerrada');
    expect(aviso).toHaveClass('w-full', 'sm:w-auto');
    expect(aviso.parentElement).toHaveClass('flex-wrap');
  });
});
