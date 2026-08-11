import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import FeedPage from './FeedPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key, i18n: { language: 'es' } }),
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'me' }, loading: false }),
}));

vi.mock('../../components/layout/HeaderAuth', () => ({
  default: () => <header data-testid="header" />,
}));

vi.mock('../../components/ui/Avatar', () => ({
  default: ({ userId }) => <div data-testid={`avatar-${userId}`} />,
}));

const getFeed = vi.fn();
const markSeen = vi.fn();

vi.mock('../../composition', () => ({
  getFriendsFeedUseCase: { execute: (...args) => getFeed(...args) },
  markFeedAsSeenUseCase: { execute: (...args) => markSeen(...args) },
}));

const evento = (overrides = {}) => ({
  id: 'e1',
  userId: 'u1',
  type: 'BIRDIE',
  occurredAt: new Date('2026-08-10T12:00:00'),
  payload: { count: 3, holes: [1, 5, 9] },
  sourceMatchId: 'm1',
  ...overrides,
});

const pagina = (overrides = {}) => ({
  events: [evento()],
  authors: { u1: { id: 'u1', firstName: 'Ana', lastName: 'García' } },
  courses: {},
  nextCursor: null,
  unseenCount: 0,
  ...overrides,
});

const renderFeed = () =>
  render(
    <MemoryRouter>
      <FeedPage />
    </MemoryRouter>
  );

describe('FeedPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getFeed.mockResolvedValue(pagina());
    markSeen.mockResolvedValue(undefined);
  });

  it('shows the achievements with their author', async () => {
    renderFeed();

    expect(await screen.findByTestId('activity-event-e1')).toBeInTheDocument();
    expect(screen.getByText('Ana García')).toBeInTheDocument();
  });

  it('says on which course each achievement happened', async () => {
    getFeed.mockResolvedValue(
      pagina({
        events: [evento({ payload: { count: 3, holes: [1, 5, 9], golf_course_id: 'c-1' } })],
        courses: { 'c-1': 'Real Club de Golf' },
      })
    );
    renderFeed();

    expect(await screen.findByText(/Real Club de Golf/)).toBeInTheDocument();
  });

  it('still paints the entry when the course name is missing', async () => {
    // Un campo borrado, o un id que el backend no supo leer, deja la entrada
    // sin nombre — nunca sin pintar.
    getFeed.mockResolvedValue(
      pagina({
        events: [evento({ payload: { count: 3, holes: [1, 5, 9], golf_course_id: 'c-borrado' } })],
        courses: {},
      })
    );
    renderFeed();

    expect(await screen.findByTestId('activity-event-e1')).toBeInTheDocument();
  });

  it('keeps the course names from earlier pages when loading more', async () => {
    // Los nombres se acumulan igual que los autores: si se reemplazaran, las
    // entradas ya pintadas perderían el suyo al paginar.
    getFeed.mockResolvedValueOnce(
      pagina({
        events: [evento({ payload: { golf_course_id: 'c-1' } })],
        courses: { 'c-1': 'Real Club de Golf' },
        nextCursor: 'cursor-1',
      })
    );
    getFeed.mockResolvedValueOnce(
      pagina({
        events: [evento({ id: 'e2', payload: { golf_course_id: 'c-2' } })],
        courses: { 'c-2': 'Otro Campo' },
      })
    );
    renderFeed();

    await screen.findByTestId('activity-event-e1');
    fireEvent.click(screen.getByTestId('feed-load-more'));

    expect(await screen.findByText(/Otro Campo/)).toBeInTheDocument();
    expect(screen.getByText(/Real Club de Golf/)).toBeInTheDocument();
  });

  it('marks the feed as seen once, not on every page', async () => {
    // Marcar en cada paginación apagaría el aviso por refrescar en vez de por
    // haber mirado.
    getFeed.mockResolvedValue(pagina({ nextCursor: 'cursor-1' }));
    renderFeed();

    await screen.findByTestId('activity-event-e1');
    fireEvent.click(screen.getByTestId('feed-load-more'));

    await waitFor(() => expect(getFeed).toHaveBeenCalledTimes(2));
    expect(markSeen).toHaveBeenCalledTimes(1);
  });

  it('keeps showing the feed when marking it as seen fails', async () => {
    // Lo peor que puede pasar es que la insignia siga puesta: no debe impedir leer.
    markSeen.mockRejectedValue(new Error('network'));
    renderFeed();

    expect(await screen.findByTestId('activity-event-e1')).toBeInTheDocument();
  });

  it('offers to find friends when there is nothing to show', async () => {
    // El feed vacío es el estado normal al principio, no un error.
    getFeed.mockResolvedValue(pagina({ events: [], authors: {} }));
    renderFeed();

    expect(await screen.findByTestId('feed-empty')).toBeInTheDocument();
    expect(screen.getByText('feed:empty.addFriends')).toBeInTheDocument();
  });

  it('appends the next page instead of replacing what is shown', async () => {
    getFeed
      .mockResolvedValueOnce(pagina({ nextCursor: 'cursor-1' }))
      .mockResolvedValueOnce(
        pagina({
          events: [evento({ id: 'e2', userId: 'u2' })],
          authors: { u2: { id: 'u2', firstName: 'Luis', lastName: 'Pérez' } },
          nextCursor: null,
        })
      );
    renderFeed();

    await screen.findByTestId('activity-event-e1');
    fireEvent.click(screen.getByTestId('feed-load-more'));

    expect(await screen.findByTestId('activity-event-e2')).toBeInTheDocument();
    expect(screen.getByTestId('activity-event-e1')).toBeInTheDocument();
  });

  it('hides the load-more button on the last page', async () => {
    renderFeed();

    await screen.findByTestId('activity-event-e1');
    expect(screen.queryByTestId('feed-load-more')).not.toBeInTheDocument();
  });

  it('links to the friends list, which no longer has its own tab', async () => {
    renderFeed();

    const enlace = await screen.findByTestId('feed-friends-link');
    expect(enlace).toHaveAttribute('href', '/friends');
  });
});
