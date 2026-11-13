import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import MyInvitationsPage from './MyInvitationsPage';

/**
 * La lista de Mis invitaciones descarta lo que llega tarde (T2).
 *
 *   #     caso                                                      | qué pasa
 *   ------|-----------------------------------------------------------|----------------------------------
 *   T2-7  cambia el idioma                                          | no se vuelve a pedir
 *   T2-8  filtro A en vuelo, se elige B y A llega la última         | la lista de B, sin el aviso de A
 *   T2-9  se responde una invitación                                | la lista se relee con la espera
 *   T2-17c llega un `user` nuevo con el mismo id con la relectura en vuelo | no se vuelve a pedir
 */
const mockIdioma = vi.hoisted(() => ({ t: (key) => key }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: mockIdioma.t, i18n: { language: 'es' } }),
}));
const sesion = vi.hoisted(() => ({
  user: { id: 'me', email_verified: true },
  loading: false,
}));
vi.mock('../../hooks/useAuth', () => ({ useAuth: () => sesion }));
vi.mock('../../components/layout/HeaderAuth', () => ({
  default: () => <header data-testid="header" />,
}));
vi.mock('../../hooks/useGeneroParaApuntarse', () => ({
  useGeneroParaApuntarse: () => ({
    falta: false,
    guardar: vi.fn(),
    refrescar: vi.fn(),
  }),
}));
vi.mock('../../components/invitation/InvitationCard', () => ({
  default: ({ invitation, onDecline }) => (
    <div data-testid={`inv-${invitation.id}`}>
      <button
        type="button"
        onClick={() => onDecline(invitation.id)}
      >{`rechazar-${invitation.id}`}</button>
    </div>
  ),
}));
const toastError = vi.fn();
vi.mock('../../utils/toast', () => ({
  default: { error: (...a) => toastError(...a), success: vi.fn() },
}));
const listar = vi.fn();
const responder = vi.fn();
vi.mock('../../composition', () => ({
  listMyInvitationsUseCase: { execute: (...args) => listar(...args) },
  respondToInvitationUseCase: { execute: (...args) => responder(...args) },
}));

const aMano = () => {
  let resolver;
  let rechazar;
  const promesa = new Promise((res, rej) => {
    resolver = res;
    rechazar = rej;
  });
  return { promesa, resolver, rechazar };
};
const invitaciones = (...ids) => ({
  invitations: ids.map((id) => ({ id, isPending: true })),
  totalCount: ids.length,
});
const arbol = () => (
  <MemoryRouter>
    <MyInvitationsPage />
  </MemoryRouter>
);
const espera = () => screen.queryByText('loading');

describe('MyInvitationsPage: la lista descarta lo que llega tarde (T2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIdioma.t = (key) => key;
    sesion.user = { id: 'me', email_verified: true };
    listar.mockResolvedValue(invitaciones('i1'));
    responder.mockResolvedValue({});
  });

  it('T2-7: cambiar de idioma no vuelve a pedir la lista', async () => {
    const { rerender } = render(arbol());
    await screen.findByTestId('inv-i1');

    mockIdioma.t = (key) => `en:${key}`;
    rerender(arbol());
    await act(async () => {});

    expect(listar).toHaveBeenCalledTimes(1);
  });

  // Mientras carga, la página entera es la espera y el filtro no está a mano:
  // la carga del filtro A queda vieja si cambia la sesión con ella en vuelo
  it('T2-8: filtro A en vuelo y cambia la sesión: la lista nueva, sin pintar la de A', async () => {
    const { rerender } = render(arbol());
    await screen.findByTestId('inv-i1');
    const deA = aMano();
    const nueva = aMano();
    listar.mockReturnValueOnce(deA.promesa).mockReturnValueOnce(nueva.promesa);

    fireEvent.change(screen.getByTestId('status-filter'), {
      target: { value: 'PENDING' },
    });
    await act(async () => {});
    sesion.user = { ...sesion.user, id: 'otra' };
    rerender(arbol());
    await act(async () => {});
    expect(listar).toHaveBeenCalledTimes(3);
    expect(listar).toHaveBeenLastCalledWith({ status: 'PENDING' });

    await act(async () => nueva.resolver(invitaciones('nueva')));
    await act(async () => deA.resolver(invitaciones('de-a')));

    expect(screen.getByTestId('inv-nueva')).toBeInTheDocument();
    expect(screen.queryByTestId('inv-de-a')).not.toBeInTheDocument();
  });

  it('T2-8: el fallo de la vieja no avisa ni tapa la lista', async () => {
    const { rerender } = render(arbol());
    await screen.findByTestId('inv-i1');
    const deA = aMano();
    listar
      .mockReturnValueOnce(deA.promesa)
      .mockResolvedValueOnce(invitaciones('nueva'));

    fireEvent.change(screen.getByTestId('status-filter'), {
      target: { value: 'PENDING' },
    });
    await act(async () => {});
    sesion.user = { ...sesion.user, id: 'otra' };
    rerender(arbol());
    await screen.findByTestId('inv-nueva');
    await act(async () => deA.rechazar(new Error('tarde')));

    expect(toastError).not.toHaveBeenCalled();
    expect(
      screen.queryByTestId('invitaciones-sin-cargar'),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('inv-nueva')).toBeInTheDocument();
  });

  it('T2-17c: un `user` nuevo con el mismo id, con la relectura en vuelo, no vuelve a pedir', async () => {
    const { rerender } = render(arbol());
    await screen.findByTestId('inv-i1');
    const relectura = aMano();
    listar.mockReturnValueOnce(relectura.promesa);
    fireEvent.click(screen.getByText('rechazar-i1'));
    await act(async () => {});
    expect(listar).toHaveBeenCalledTimes(2);

    sesion.user = { ...sesion.user };
    rerender(arbol());
    await act(async () => {});

    expect(listar).toHaveBeenCalledTimes(2);
    await act(async () => relectura.resolver(invitaciones('i2')));
    expect(screen.getByTestId('inv-i2')).toBeInTheDocument();
  });

  it('T2-9: tras responder una invitación, la lista se relee con la espera', async () => {
    render(arbol());
    await screen.findByTestId('inv-i1');
    const relectura = aMano();
    listar.mockReturnValueOnce(relectura.promesa);

    fireEvent.click(screen.getByText('rechazar-i1'));
    await act(async () => {});

    expect(listar).toHaveBeenCalledTimes(2);
    expect(espera()).toBeInTheDocument();
    await act(async () => relectura.resolver(invitaciones('i2')));
    expect(espera()).not.toBeInTheDocument();
    expect(screen.getByTestId('inv-i2')).toBeInTheDocument();
  });
});
