import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import FriendsPage from './FriendsPage';
import friendsEs from '../../i18n/locales/es/friends.json';
import friendsEn from '../../i18n/locales/en/friends.json';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key, i18n: { language: 'es' } }),
}));

// El mismo `user` en cada pintada: uno nuevo relanza la carga y desmonta las
// pestañas a mitad de test
const sesion = vi.hoisted(() => ({ user: { id: 'me' }, loading: false }));
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => sesion,
}));

vi.mock('../../components/layout/HeaderAuth', () => ({
  default: () => <header data-testid="header" />,
}));

vi.mock('../../components/friend/FriendCard', () => ({
  default: ({ friendship }) => <div data-testid="friend-card">{friendship.id}</div>,
}));

const listFriends = vi.fn();
const listPending = vi.fn();

vi.mock('../../composition', () => ({
  listFriendsUseCase: { execute: (...args) => listFriends(...args) },
  listPendingFriendRequestsUseCase: { execute: (...args) => listPending(...args) },
  respondFriendRequestUseCase: { execute: vi.fn() },
  removeFriendUseCase: { execute: vi.fn() },
  blockUserUseCase: { execute: vi.fn() },
  sendFriendRequestUseCase: { execute: vi.fn() },
  searchUsersUseCase: { execute: vi.fn() },
}));

const renderFriends = () =>
  render(
    <MemoryRouter>
      <FriendsPage />
    </MemoryRouter>
  );

describe('FriendsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Las tres llamadas —amigos, recibidas y enviadas— devuelven `friendships`
    listFriends.mockResolvedValue({ friendships: [], totalCount: 0 });
    listPending.mockResolvedValue({ friendships: [], totalCount: 0 });
  });

  describe('la vuelta al feed', () => {
    it('ofrece un enlace de vuelta al feed', async () => {
      renderFriends();

      const volver = await screen.findByTestId('friends-back-to-feed');
      expect(volver).toHaveAttribute('href', '/feed');
    });

    it('lo ofrece tambien en movil', async () => {
      /**
       * A Amigos se entra desde el feed, y la navegacion inferior deja marcada
       * la pestana del feed mientras estas aqui: sin este enlace no hay senal
       * de por donde se vuelve. Por eso no lleva `hidden`, al reves que las
       * vueltas de las paginas de creador.
       */
      renderFriends();

      const volver = await screen.findByTestId('friends-back-to-feed');
      expect(volver.className).not.toMatch(/\bhidden\b/);
    });

    it('usa la clave del destino, no la generica de volver', async () => {
      /**
       * `t` esta mockeado y devuelve la clave, como en el resto de la suite, asi
       * que esto fija que el rotulo sale de `backToFeed` y no de un `back`
       * generico. Que ademas este traducido lo cubre el test de abajo.
       */
      renderFriends();

      await waitFor(() => expect(screen.getByTestId('friends-back-to-feed')).toBeInTheDocument());
      expect(screen.getByTestId('friends-back-to-feed')).toHaveTextContent('backToFeed');
    });

    it('tiene rotulo traducido en los dos idiomas', () => {
      /**
       * Sin esto, una clave que falte en un idioma se pinta cruda —el usuario
       * leeria "backToFeed"— y ningun test lo veria, porque `t` esta mockeado
       * en toda la suite. No se fija el texto exacto a proposito: cambiar la
       * redaccion no es una regresion.
       */
      expect(friendsEs.backToFeed).toBeTruthy();
      expect(friendsEn.backToFeed).toBeTruthy();
    });
  });

  describe('las pestañas (FE #658)', () => {
    it('son pestañas de verdad: barra con nombre, contador dentro y la lista como su panel', async () => {
      listPending.mockImplementation((_id, tipo) =>
        Promise.resolve(tipo === 'received' ? { friendships: [{ id: 'f-1' }], totalCount: 1 } : { friendships: [], totalCount: 0 })
      );
      renderFriends();

      const barra = await screen.findByRole('tablist', { name: 'tabsLabel' });
      expect(barra).toBe(screen.getByTestId('friend-tabs'));
      const [amigos, recibidas, enviadas] = within(barra).getAllByRole('tab');
      expect(amigos).toBe(screen.getByTestId('tab-friends'));
      expect(recibidas).toHaveAccessibleName('tabs.received1');
      expect(amigos).toHaveAttribute('aria-selected', 'true');
      const panel = screen.getByRole('tabpanel', { name: 'tabs.friends' });
      expect(within(panel).getByText('empty.friends')).toBeInTheDocument();
      // Vacía no hay nada enfocable dentro: el panel es la parada
      expect(panel).toHaveAttribute('tabindex', '0');
      [amigos, recibidas, enviadas].forEach((tab) => expect(tab).toHaveAttribute('aria-controls', panel.id));

      fireEvent.keyDown(amigos, { key: 'ArrowRight' });
      expect(recibidas).toHaveAttribute('aria-selected', 'true');
      expect(recibidas).toHaveFocus();
      expect(within(screen.getByRole('tabpanel', { name: 'tabs.received1' })).getByTestId('friend-card')).toHaveTextContent('f-1');
      // Con tarjetas, sus botones ya son paradas: el panel no
      expect(screen.getByRole('tabpanel', { name: 'tabs.received1' })).not.toHaveAttribute('tabindex');

      fireEvent.keyDown(recibidas, { key: 'End' });
      expect(enviadas).toHaveAttribute('aria-selected', 'true');
      expect(within(screen.getByRole('tabpanel', { name: 'tabs.sent' })).getByText('empty.sent')).toBeInTheDocument();
      expect(screen.getByRole('tabpanel', { name: 'tabs.sent' })).toHaveAttribute('tabindex', '0');
    });
  });
});
