import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import FriendsPage from './FriendsPage';

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

    it('nombra el destino en vez de decir solo atras', async () => {
      renderFriends();

      await waitFor(() => expect(screen.getByTestId('friends-back-to-feed')).toBeInTheDocument());
      expect(screen.getByTestId('friends-back-to-feed')).toHaveTextContent('backToFeed');
    });
  });
});
