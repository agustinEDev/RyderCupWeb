import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import FriendsPage from './FriendsPage';
import friendsEs from '../../i18n/locales/es/friends.json';
import friendsEn from '../../i18n/locales/en/friends.json';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key, i18n: { language: 'es' } }),
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'me' }, loading: false }),
}));

vi.mock('../../components/layout/HeaderAuth', () => ({
  default: () => <header data-testid="header" />,
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
});
