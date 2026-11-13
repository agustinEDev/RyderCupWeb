import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import FriendsPage from './FriendsPage';

/**
 * Las tres listas de Amigos descartan lo que llega tarde (T2).
 *
 *   #      caso                                                        | qué pasa
 *   -------|-------------------------------------------------------------|--------------------------------------
 *   T2-4   se abre                                                      | la espera y luego las tres listas; si falla, el aviso
 *   T2-5   se acepta y la recarga no ha llegado                         | esa tarjeta sigue ocupada, sin la espera de la página
 *   T2-5b  se acepta A y luego B antes de que llegue la recarga de A    | A sigue ocupada hasta que llegan listas con su acción
 *   T2-6   dos acciones seguidas y la recarga de la primera llega última | se quedan las listas de la segunda
 *   T2-7   cambia el idioma                                            | no se vuelve a pedir
 *   U1     cambia el usuario con la carga en vuelo                     | se piden las suyas; las viejas no se pintan
 */
const mockIdioma = vi.hoisted(() => ({ t: (key) => key }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: mockIdioma.t, i18n: { language: 'es' } }),
}));
const sesion = vi.hoisted(() => ({ user: { id: 'me' }, loading: false }));
vi.mock('../../hooks/useAuth', () => ({ useAuth: () => sesion }));
vi.mock('../../components/layout/HeaderAuth', () => ({
  default: () => <header data-testid="header" />,
}));
// La tarjeta: sus botones solo mientras no está ocupada
vi.mock('../../components/friend/FriendCard', () => ({
  default: ({ friendship, onAccept, isProcessing }) => (
    <div data-testid={`card-${friendship.id}`} data-ocupada={String(Boolean(isProcessing))}>
      {!isProcessing && (
        <button type="button" onClick={() => onAccept(friendship.id)}>
          {`aceptar-${friendship.id}`}
        </button>
      )}
    </div>
  ),
}));
const toastError = vi.fn();
vi.mock('../../utils/toast', () => ({
  default: { error: (...a) => toastError(...a), success: vi.fn() },
}));
const listFriends = vi.fn();
const listPending = vi.fn();
const respond = vi.fn();
vi.mock('../../composition', () => ({
  listFriendsUseCase: { execute: (...args) => listFriends(...args) },
  listPendingFriendRequestsUseCase: { execute: (...args) => listPending(...args) },
  respondFriendRequestUseCase: { execute: (...args) => respond(...args) },
  removeFriendUseCase: { execute: vi.fn() },
  blockUserUseCase: { execute: vi.fn() },
  searchUsersUseCase: { execute: vi.fn() },
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
const amistad = (id) => ({ id, otherUserId: `u-${id}` });
const lista = (...ids) => ({ friendships: ids.map(amistad), totalCount: ids.length });

// Las recibidas que devuelve el servidor en cada momento: cada recarga se lleva
// las de cuando se pidió
let recibidas;
const arbol = () => (
  <MemoryRouter>
    <FriendsPage />
  </MemoryRouter>
);
const espera = () => screen.queryByText('loading');

const abrirRecibidas = async () => {
  render(arbol());
  fireEvent.click(await screen.findByTestId('tab-received'));
};

describe('FriendsPage: las listas descartan lo que llega tarde (T2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIdioma.t = (key) => key;
    sesion.user = { id: 'me' };
    recibidas = ['a', 'b'];
    listFriends.mockResolvedValue(lista());
    listPending.mockImplementation((_id, tipo) =>
      Promise.resolve(tipo === 'received' ? lista(...recibidas) : lista())
    );
    respond.mockResolvedValue({});
  });

  it('T2-4: al abrir, la espera y luego las tres listas', async () => {
    const llega = aMano();
    listFriends.mockReturnValueOnce(llega.promesa);
    render(arbol());
    expect(espera()).toBeInTheDocument();

    await act(async () => llega.resolver(lista('f1')));

    expect(espera()).not.toBeInTheDocument();
    expect(screen.getByTestId('card-f1')).toBeInTheDocument();
    expect(within(screen.getByTestId('tab-received')).getByText('2')).toBeInTheDocument();
    expect(listPending).toHaveBeenCalledWith('me', 'received');
    expect(listPending).toHaveBeenCalledWith('me', 'sent');
  });

  it('T2-4: si falla, el aviso', async () => {
    listFriends.mockRejectedValueOnce(new Error('caído'));
    render(arbol());

    await act(async () => {});

    expect(toastError).toHaveBeenCalledWith('caído');
    expect(espera()).not.toBeInTheDocument();
  });

  it('T2-5: aceptada y con la recarga en vuelo, su tarjeta sigue ocupada y la página no espera', async () => {
    await abrirRecibidas();
    const recarga = aMano();
    listFriends.mockReturnValueOnce(recarga.promesa);
    recibidas = ['b'];

    fireEvent.click(screen.getByText('aceptar-a'));
    await act(async () => {});

    expect(listFriends).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('card-a')).toHaveAttribute('data-ocupada', 'true');
    expect(screen.getByTestId('card-b')).toHaveAttribute('data-ocupada', 'false');
    expect(espera()).not.toBeInTheDocument();

    await act(async () => recarga.resolver(lista('a')));
    expect(screen.queryByTestId('card-a')).not.toBeInTheDocument();
  });

  it('T2-5b: se acepta A y luego B: A sigue ocupada hasta que llegan listas con su acción', async () => {
    await abrirRecibidas();
    const deA = aMano();
    const deB = aMano();
    listFriends.mockReturnValueOnce(deA.promesa).mockReturnValueOnce(deB.promesa);

    // Given la recarga de A en vuelo
    fireEvent.click(screen.getByText('aceptar-a'));
    await act(async () => {});
    recibidas = [];

    // When se acepta B antes de que llegue
    fireEvent.click(screen.getByText('aceptar-b'));
    await act(async () => {});
    expect(listFriends).toHaveBeenCalledTimes(3);

    // Then A sigue ocupada, sin botones, mientras no llegan listas
    expect(screen.getByTestId('card-a')).toHaveAttribute('data-ocupada', 'true');
    expect(screen.queryByText('aceptar-a')).not.toBeInTheDocument();
    expect(screen.getByTestId('card-b')).toHaveAttribute('data-ocupada', 'true');

    // y deja de estarlo con las de B, que ya la incluyen
    await act(async () => deB.resolver(lista('a', 'b')));
    expect(screen.queryByTestId('card-a')).not.toBeInTheDocument();
    expect(screen.queryByTestId('card-b')).not.toBeInTheDocument();
  });

  it('T2-6: dos acciones seguidas y la recarga de la primera llega la última: se quedan las listas de la segunda', async () => {
    await abrirRecibidas();
    const deA = aMano();
    const deB = aMano();
    listFriends.mockReturnValueOnce(deA.promesa).mockReturnValueOnce(deB.promesa);

    fireEvent.click(screen.getByText('aceptar-a'));
    await act(async () => {});
    recibidas = [];
    fireEvent.click(screen.getByText('aceptar-b'));
    await act(async () => {});

    await act(async () => deB.resolver(lista('a', 'b')));
    // La de A, con lo de antes de aceptar B, llega tarde
    await act(async () => deA.resolver(lista('a')));

    expect(screen.queryByTestId('card-b')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('tab-friends'));
    expect(screen.getByTestId('card-a')).toBeInTheDocument();
    expect(screen.getByTestId('card-b')).toBeInTheDocument();
  });

  it('U1: si cambia el usuario con la carga en vuelo, se piden las suyas y las viejas no se pintan', async () => {
    const vieja = aMano();
    const nueva = aMano();
    listFriends.mockReturnValueOnce(vieja.promesa).mockReturnValueOnce(nueva.promesa);
    const { rerender } = render(arbol());

    sesion.user = { id: 'otro' };
    rerender(arbol());
    await act(async () => {});
    expect(listFriends).toHaveBeenLastCalledWith('otro');
    await act(async () => vieja.resolver(lista('de-me')));
    expect(screen.queryByTestId('card-de-me')).not.toBeInTheDocument();

    await act(async () => nueva.resolver(lista('de-otro')));
    expect(screen.getByTestId('card-de-otro')).toBeInTheDocument();
    expect(screen.queryByTestId('card-de-me')).not.toBeInTheDocument();
  });

  it('T2-7: cambiar de idioma no vuelve a pedir las listas', async () => {
    const { rerender } = render(arbol());
    await act(async () => {});
    expect(listFriends).toHaveBeenCalledTimes(1);

    mockIdioma.t = (key) => `en:${key}`;
    rerender(arbol());
    await act(async () => {});

    expect(listFriends).toHaveBeenCalledTimes(1);
    expect(listPending).toHaveBeenCalledTimes(2);
  });
});
