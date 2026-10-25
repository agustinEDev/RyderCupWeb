import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

/**
 * El organizador retira o devuelve a un jugador de un fourball desde el
 * detalle del partido del calendario (25 oct 2026, F10; RyderCupAM#665).
 *
 *   #     caso                                         | esperado
 *   ------|---------------------------------------------|-------------------------------------
 *   F10   fourball en juego                           | «Retirar» por jugador, con confirmación
 *   F10b  uno retirado                                | «Deshacer retirada» el suyo; su pareja,
 *         |                                            | sin «Retirar» (sería el último del bando)
 *   F10c  individual, terminado o con tarjeta         | nada
 *   F10d  el servidor lo rechaza                      | su texto por motivo
 */
const casos = vi.hoisted(() => ({
  vista: { execute: vi.fn() },
  retira: { execute: vi.fn() },
}));
vi.mock('../../composition', () => ({
  getScoringViewUseCase: casos.vista,
  withdrawMatchPlayerUseCase: casos.retira,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k, o) => (o ? `${k} ${JSON.stringify(o)}` : k) }),
}));

const { default: RetiradaPorElOrganizador } = await import('./RetiradaPorElOrganizador');

const vista = (extra = {}) => ({
  matchFormat: 'FOURBALL',
  matchStatus: 'IN_PROGRESS',
  scorecardSubmittedBy: [],
  withdrawnPlayerIds: [],
  players: [
    { userId: 'a1', userName: 'Ana', team: 'A' },
    { userId: 'a2', userName: 'Bea', team: 'A' },
    { userId: 'b1', userName: 'Carlos', team: 'B' },
    { userId: 'b2', userName: 'Dani', team: 'B' },
  ],
  ...extra,
});

describe('RetiradaPorElOrganizador', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    casos.vista.execute.mockResolvedValue(vista());
    casos.retira.execute.mockResolvedValue({});
  });

  it('F10: retirar a un jugador pide confirmación y vuelve a leer', async () => {
    render(<RetiradaPorElOrganizador matchId="m-1" />);

    fireEvent.click(await screen.findByRole('button', { name: 'withdraw.organizerWithdraw {"nombre":"Bea"}' }));
    expect(casos.retira.execute).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'withdraw.confirmYes' }));

    await waitFor(() => expect(casos.retira.execute).toHaveBeenCalledWith('m-1', 'a2', { deshacer: false }));
    await waitFor(() => expect(casos.vista.execute).toHaveBeenCalledTimes(2));
  });

  it('F10b: con Bea retirada, deshacer la suya y Ana sin «Retirar»', async () => {
    casos.vista.execute.mockResolvedValue(vista({ withdrawnPlayerIds: ['a2'] }));
    render(<RetiradaPorElOrganizador matchId="m-1" />);

    fireEvent.click(await screen.findByRole('button', { name: 'withdraw.organizerUndo {"nombre":"Bea"}' }));

    await waitFor(() => expect(casos.retira.execute).toHaveBeenCalledWith('m-1', 'a2', { deshacer: true }));
    expect(screen.queryByRole('button', { name: 'withdraw.organizerWithdraw {"nombre":"Ana"}' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'withdraw.organizerWithdraw {"nombre":"Carlos"}' })).toBeInTheDocument();
  });

  it.each([
    ['individual', { matchFormat: 'SINGLES' }],
    ['terminado', { matchStatus: 'COMPLETED' }],
    ['con tarjeta', { scorecardSubmittedBy: ['b1'] }],
  ])('F10c: %s, nada', async (_, extra) => {
    casos.vista.execute.mockResolvedValue(vista(extra));
    const { container } = render(<RetiradaPorElOrganizador matchId="m-1" />);

    await waitFor(() => expect(casos.vista.execute).toHaveBeenCalled());
    await Promise.resolve();
    expect(container).toBeEmptyDOMElement();
  });

  it('F10d: un rechazo se explica con su motivo', async () => {
    casos.retira.execute.mockRejectedValue(
      Object.assign(new Error('x'), { errorCode: 'WITHDRAWAL_NOT_ALLOWED', data: { reason: 'SCORECARD_SUBMITTED' } })
    );
    render(<RetiradaPorElOrganizador matchId="m-1" />);

    fireEvent.click(await screen.findByRole('button', { name: 'withdraw.organizerWithdraw {"nombre":"Bea"}' }));
    fireEvent.click(screen.getByRole('button', { name: 'withdraw.confirmYes' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('withdraw.errors.SCORECARD_SUBMITTED');
  });
});
