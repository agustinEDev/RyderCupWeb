import { render, screen, waitFor, fireEvent, within, act } from '@testing-library/react';
import { MemoryRouter, Link } from 'react-router';
import { vi, describe, it, expect, beforeEach, beforeAll, afterEach } from 'vitest';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import feedEs from '../../i18n/locales/es/feed.json';
import feedEn from '../../i18n/locales/en/feed.json';
import commonEs from '../../i18n/locales/es/common.json';
import commonEn from '../../i18n/locales/en/common.json';
import FeedPage from './FeedPage';

// Un solo `user` para todos los render: uno nuevo por render recargaría el
// feed en bucle en una página con efectos sobre él
vi.mock('../../hooks/useAuth', () => {
  const user = { id: 'me' };
  return { useAuth: () => ({ user, loading: false }) };
});

vi.mock('../../components/layout/HeaderAuth', () => ({
  default: () => <header data-testid="header" />,
}));

vi.mock('../../components/ui/Avatar', () => ({
  default: ({ userId }) => <div data-testid={`avatar-${userId}`} />,
}));

const aCero = vi.fn();
// El número de Actividad, como una pieza compartida de verdad: la página
// reacciona a sus cambios mientras está abierta (revisión FE-1)
const mockNovedades = vi.hoisted(() => {
  let valor = 0;
  const oyentes = new Set();
  return {
    lee: () => valor,
    fija: (n) => {
      valor = n;
      oyentes.forEach((f) => f());
    },
    suscribe: (f) => {
      oyentes.add(f);
      return () => oyentes.delete(f);
    },
  };
});
vi.mock('../../hooks/useNovedadesDeActividad', async () => {
  const { useSyncExternalStore } = await import('react');
  return {
    ponLasNovedadesACero: () => aCero(),
    olvidaLasNovedades: () => {},
    useNovedadesDeActividad: () => useSyncExternalStore(mockNovedades.suscribe, mockNovedades.lee),
  };
});

const toastError = vi.fn();
vi.mock('../../utils/toast', () => ({
  default: { error: (...a) => toastError(...a), success: vi.fn() },
}));

const getFeed = vi.fn();
const markSeen = vi.fn();
const respond = vi.fn();

vi.mock('../../composition', () => ({
  getFriendsFeedUseCase: { execute: (...args) => getFeed(...args) },
  markFeedAsSeenUseCase: { execute: (...args) => markSeen(...args) },
  respondFriendRequestUseCase: { execute: (...args) => respond(...args) },
}));

// Jueves 22 de octubre de 2026, 18:00
const AHORA = new Date(2026, 9, 22, 18, 0);

const instancias = {};
beforeAll(async () => {
  for (const lng of ['es', 'en']) {
    const i = i18next.createInstance();
    await i.use(initReactI18next).init({
      lng,
      fallbackLng: 'es',
      ns: ['feed', 'common'],
      defaultNS: 'feed',
      resources: { es: { feed: feedEs, common: commonEs }, en: { feed: feedEn, common: commonEn } },
      interpolation: { escapeValue: false },
    });
    instancias[lng] = i;
  }
});

const evento = (overrides = {}) => ({
  id: 'e1',
  userId: 'u1',
  type: 'BIRDIE',
  occurredAt: new Date(2026, 9, 22, 12, 0),
  publishedAt: new Date(2026, 9, 22, 17, 0),
  payload: { count: 3, holes: [1, 5, 9] },
  sourceMatchId: 'm1',
  groupKey: null,
  ...overrides,
});

const pagina = (overrides = {}) => ({
  events: [evento()],
  authors: {
    u1: { id: 'u1', firstName: 'Ana', lastName: 'García' },
    u9: { id: 'u9', displayName: 'Pedro' },
  },
  courses: {},
  nextCursor: null,
  unseenCount: 0,
  pendingFriendRequests: [],
  ...overrides,
});

const renderFeed = (lng = 'es') =>
  render(
    <I18nextProvider i18n={instancias[lng]}>
      <MemoryRouter initialEntries={['/feed']}>
        <FeedPage />
        {/* El botón de Actividad, pulsado estando ya en Actividad */}
        <Link to="/feed">boton-actividad</Link>
      </MemoryRouter>
    </I18nextProvider>
  );

describe('FeedPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNovedades.fija(0);
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(AHORA);
    getFeed.mockResolvedValue(pagina());
    markSeen.mockResolvedValue(undefined);
    respond.mockResolvedValue({});
  });

  afterEach(() => {
    vi.useRealTimers();
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
    getFeed.mockResolvedValueOnce(
      pagina({
        events: [evento({ payload: { golf_course_id: 'c-1' } })],
        courses: { 'c-1': 'Real Club de Golf' },
        nextCursor: 'cursor-1',
      })
    );
    getFeed.mockResolvedValueOnce(
      pagina({
        events: [evento({ id: 'e2', publishedAt: new Date(2026, 9, 22, 9), payload: { golf_course_id: 'c-2' } })],
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
    getFeed.mockResolvedValue(pagina({ nextCursor: 'cursor-1' }));
    renderFeed();

    await screen.findByTestId('activity-event-e1');
    fireEvent.click(screen.getByTestId('feed-load-more'));

    await waitFor(() => expect(getFeed).toHaveBeenCalledTimes(2));
    expect(markSeen).toHaveBeenCalledTimes(1);
  });

  it('opening Actividad puts the button and the icon to zero once it is marked seen (case 4)', async () => {
    renderFeed();

    await waitFor(() => expect(aCero).toHaveBeenCalledTimes(1));
    expect(markSeen).toHaveBeenCalledTimes(1);
  });

  it('keeps the number when marking as seen fails, and still shows the feed (case 4)', async () => {
    markSeen.mockRejectedValue(new Error('network'));
    renderFeed();

    expect(await screen.findByTestId('activity-event-e1')).toBeInTheDocument();
    await waitFor(() => expect(markSeen).toHaveBeenCalled());
    await Promise.resolve();
    expect(aCero).not.toHaveBeenCalled();
  });

  it('offers to find friends when there is nothing to show (case 14)', async () => {
    getFeed.mockResolvedValue(pagina({ events: [], authors: {} }));
    renderFeed();

    expect(await screen.findByTestId('feed-empty')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Buscar amigos' })).toHaveAttribute('href', '/friends');
  });

  it('only unknown types still read as empty (forward compatibility)', async () => {
    getFeed.mockResolvedValue(pagina({ events: [evento({ type: 'NOT_YET_INVENTED' })] }));
    renderFeed();

    expect(await screen.findByTestId('feed-empty')).toBeInTheDocument();
  });

  it('appends the next page instead of replacing what is shown, with «Cargar más» (case 13)', async () => {
    getFeed
      .mockResolvedValueOnce(pagina({ nextCursor: 'cursor-1' }))
      .mockResolvedValueOnce(
        pagina({
          events: [evento({ id: 'e2', userId: 'u2', publishedAt: new Date(2026, 9, 22, 8) })],
          authors: { u2: { id: 'u2', firstName: 'Luis', lastName: 'Pérez' } },
          nextCursor: null,
        })
      );
    renderFeed();

    await screen.findByTestId('activity-event-e1');
    expect(screen.getByTestId('feed-load-more')).toHaveTextContent('Cargar más');
    fireEvent.click(screen.getByTestId('feed-load-more'));

    expect(await screen.findByTestId('activity-event-e2')).toBeInTheDocument();
    expect(screen.getByTestId('activity-event-e1')).toBeInTheDocument();
    expect(getFeed).toHaveBeenLastCalledWith({ limit: 20, cursor: 'cursor-1' });
  });

  it('hides the load-more button on the last page', async () => {
    renderFeed();

    await screen.findByTestId('activity-event-e1');
    expect(screen.queryByTestId('feed-load-more')).not.toBeInTheDocument();
  });

  it('links to the friends list', async () => {
    renderFeed();

    const enlace = await screen.findByTestId('feed-friends-link');
    expect(enlace).toHaveAttribute('href', '/friends');
  });

  describe('timeline', () => {
    it('is one list without tabs, newest first (case 5)', async () => {
      getFeed.mockResolvedValue(
        pagina({
          events: [
            evento({ id: 'viejo', publishedAt: new Date(2026, 9, 22, 9) }),
            evento({ id: 'nuevo', publishedAt: new Date(2026, 9, 22, 17) }),
          ],
        })
      );
      renderFeed();

      await screen.findByTestId('activity-event-nuevo');
      expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
      expect(screen.queryByRole('tab')).not.toBeInTheDocument();
      const ids = [...screen.getByTestId('feed-events').querySelectorAll('article')].map((a) => a.dataset.testid);
      expect(ids).toEqual(['activity-event-nuevo', 'activity-event-viejo']);
    });

    it('separates the days: Hoy, Ayer, this week, older, other year (case 6)', async () => {
      getFeed.mockResolvedValue(
        pagina({
          events: [
            evento({ id: 'hoy', publishedAt: new Date(2026, 9, 22, 10) }),
            evento({ id: 'ayer', publishedAt: new Date(2026, 9, 21, 10) }),
            evento({ id: 'martes', publishedAt: new Date(2026, 9, 20, 10) }),
            evento({ id: 'octubre', publishedAt: new Date(2026, 9, 1, 10) }),
            evento({ id: 'antano', publishedAt: new Date(2025, 11, 31, 10) }),
          ],
        })
      );
      renderFeed();

      await screen.findByTestId('activity-event-hoy');
      const separadores = screen.getAllByTestId('separador-dia').map((s) => s.textContent);
      expect(separadores).toEqual(['Hoy', 'Ayer', 'mar 20 oct', '1 oct', '31 dic 2025']);
    });

    it('separates the days in English too (case 16)', async () => {
      getFeed.mockResolvedValue(
        pagina({
          events: [
            evento({ id: 'hoy', publishedAt: new Date(2026, 9, 22, 10) }),
            evento({ id: 'ayer', publishedAt: new Date(2026, 9, 21, 10) }),
            evento({ id: 'octubre', publishedAt: new Date(2026, 9, 1, 10) }),
          ],
        })
      );
      renderFeed('en');

      await screen.findByTestId('activity-event-hoy');
      const separadores = screen.getAllByTestId('separador-dia').map((s) => s.textContent);
      expect(separadores).toEqual(['Today', 'Yesterday', 'Oct 1']);
    });

    it('marks the cards new since the last visit (case 7)', async () => {
      getFeed.mockResolvedValue(
        pagina({
          events: [
            evento({ id: 'a', publishedAt: new Date(2026, 9, 22, 17) }),
            evento({ id: 'b', publishedAt: new Date(2026, 9, 22, 16) }),
            evento({ id: 'c', publishedAt: new Date(2026, 9, 22, 15) }),
          ],
          unseenCount: 2,
        })
      );
      renderFeed();

      await screen.findByTestId('activity-event-a');
      expect(within(screen.getByTestId('activity-event-a')).getByTestId('marca-nueva')).toBeInTheDocument();
      expect(within(screen.getByTestId('activity-event-b')).getByTestId('marca-nueva')).toBeInTheDocument();
      expect(within(screen.getByTestId('activity-event-c')).queryByTestId('marca-nueva')).not.toBeInTheDocument();
    });

    it('shows one card for several achievements of the same round (case 9)', async () => {
      getFeed.mockResolvedValue(
        pagina({
          events: [
            evento({ id: 'b', type: 'BIRDIE', groupKey: 'u1:m1', payload: { count: 2 } }),
            evento({ id: 'e', type: 'EAGLE_OR_BETTER', groupKey: 'u1:m1', payload: { count: 1 } }),
          ],
        })
      );
      renderFeed();

      const tarjeta = await screen.findByTestId('activity-event-u1:m1');
      expect(tarjeta).toHaveTextContent('2 birdies');
      expect(tarjeta).toHaveTextContent('Un eagle');
      expect(screen.getAllByRole('article')).toHaveLength(1);
    });
  });

  describe('friend requests (case 11)', () => {
    const conSolicitud = () =>
      getFeed.mockResolvedValue(
        pagina({
          events: [evento()],
          pendingFriendRequests: [
            { friendshipId: 'f1', requesterId: 'u9', createdAt: new Date(2026, 9, 22, 16) },
          ],
        })
      );

    it('go on top with «Aceptar» and «Rechazar», the name linking to the profile', async () => {
      conSolicitud();
      renderFeed();

      const solicitud = await screen.findByTestId('solicitud-f1');
      const lista = screen.getByTestId('feed-events');
      expect(
        solicitud.compareDocumentPosition(lista) & globalThis.Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
      expect(within(solicitud).getByRole('button', { name: 'Aceptar la solicitud de Pedro' })).toBeInTheDocument();
      expect(within(solicitud).getByRole('button', { name: 'Rechazar la solicitud de Pedro' })).toBeInTheDocument();
      expect(within(solicitud).getByRole('link', { name: 'Pedro' })).toHaveAttribute('href', '/players/u9');
    });

    it('accept → the card becomes «Ahora sois amigos»', async () => {
      conSolicitud();
      renderFeed();

      const solicitud = await screen.findByTestId('solicitud-f1');
      fireEvent.click(within(solicitud).getByRole('button', { name: 'Aceptar la solicitud de Pedro' }));

      await waitFor(() => expect(solicitud).toHaveTextContent('Ahora sois amigos'));
      expect(respond).toHaveBeenCalledWith('f1', 'ACCEPT');
      expect(within(solicitud).queryByRole('button', { name: 'Aceptar la solicitud de Pedro' })).not.toBeInTheDocument();
      expect(within(solicitud).queryByRole('button', { name: 'Rechazar la solicitud de Pedro' })).not.toBeInTheDocument();
    });

    it('reject → the card disappears', async () => {
      conSolicitud();
      renderFeed();

      const solicitud = await screen.findByTestId('solicitud-f1');
      fireEvent.click(within(solicitud).getByRole('button', { name: 'Rechazar la solicitud de Pedro' }));

      await waitFor(() => expect(screen.queryByTestId('solicitud-f1')).not.toBeInTheDocument());
      expect(respond).toHaveBeenCalledWith('f1', 'DECLINE');
    });

    it.each([
      ['Aceptar la solicitud de Pedro'],
      ['Rechazar la solicitud de Pedro'],
    ])('on failure of «%s» the card stays and a toast shows', async (boton) => {
      respond.mockRejectedValue(new Error('boom'));
      conSolicitud();
      renderFeed();

      const solicitud = await screen.findByTestId('solicitud-f1');
      fireEvent.click(within(solicitud).getByRole('button', { name: boton }));

      await waitFor(() => expect(toastError).toHaveBeenCalled());
      expect(screen.getByTestId('solicitud-f1')).toBeInTheDocument();
      expect(within(solicitud).getByRole('button', { name: 'Aceptar la solicitud de Pedro' })).toBeEnabled();
      expect(solicitud).not.toHaveTextContent('Ahora sois amigos');
    });

    it('a request alone is not an empty feed', async () => {
      getFeed.mockResolvedValue(
        pagina({
          events: [],
          pendingFriendRequests: [{ friendshipId: 'f1', requesterId: 'u9', createdAt: new Date(2026, 9, 22, 16) }],
        })
      );
      renderFeed();

      expect(await screen.findByTestId('solicitud-f1')).toBeInTheDocument();
      expect(screen.queryByTestId('feed-empty')).not.toBeInTheDocument();
    });

    it('marks a new request', async () => {
      getFeed.mockResolvedValue(
        pagina({
          events: [evento()],
          unseenCount: 1,
          pendingFriendRequests: [{ friendshipId: 'f1', requesterId: 'u9', createdAt: new Date(2026, 9, 22, 17, 30) }],
        })
      );
      renderFeed();

      const solicitud = await screen.findByTestId('solicitud-f1');
      expect(within(solicitud).getByTestId('marca-nueva')).toBeInTheDocument();
    });
  });

  describe('load error (case 15)', () => {
    it('offers «Reintentar», which loads again', async () => {
      getFeed.mockRejectedValueOnce(new Error('500')).mockResolvedValueOnce(pagina());
      renderFeed();

      const reintentar = await screen.findByRole('button', { name: 'Reintentar' });
      expect(screen.queryByTestId('feed-empty')).not.toBeInTheDocument();
      fireEvent.click(reintentar);

      expect(await screen.findByTestId('activity-event-e1')).toBeInTheDocument();
      expect(getFeed).toHaveBeenCalledTimes(2);
    });

    it('without coverage says so, and also offers «Reintentar»', async () => {
      getFeed.mockRejectedValueOnce(new TypeError('Failed to fetch'));
      renderFeed();

      expect(await screen.findByTestId('feed-sin-cobertura')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
    });
  });

  describe('new things while Actividad is open (review FE-1)', () => {
    it('a count above zero reloads the timeline and marks it seen', async () => {
      getFeed.mockResolvedValueOnce(pagina()).mockResolvedValueOnce(
        pagina({ events: [evento({ id: 'nuevo', publishedAt: new Date(2026, 9, 22, 17, 59) }), evento()] })
      );
      renderFeed();
      await screen.findByTestId('activity-event-e1');
      await waitFor(() => expect(aCero).toHaveBeenCalledTimes(1));

      act(() => mockNovedades.fija(2));

      expect(await screen.findByTestId('activity-event-nuevo')).toBeInTheDocument();
      expect(getFeed).toHaveBeenCalledTimes(2);
      await waitFor(() => expect(markSeen).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(aCero).toHaveBeenCalledTimes(2));
    });

    it('a count already above zero while loading does not load twice', async () => {
      mockNovedades.fija(3);
      renderFeed();
      await screen.findByTestId('activity-event-e1');
      await waitFor(() => expect(markSeen).toHaveBeenCalledTimes(1));
      await act(async () => {});

      expect(getFeed).toHaveBeenCalledTimes(1);
    });

    it('a count back to zero does not reload', async () => {
      renderFeed();
      await screen.findByTestId('activity-event-e1');
      act(() => mockNovedades.fija(2));
      await waitFor(() => expect(getFeed).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(markSeen).toHaveBeenCalledTimes(2));

      act(() => mockNovedades.fija(0));
      await act(async () => {});
      await act(async () => {});

      expect(getFeed).toHaveBeenCalledTimes(2);
    });

    it('if marking fails, it does not loop', async () => {
      renderFeed();
      await screen.findByTestId('activity-event-e1');
      markSeen.mockRejectedValue(new Error('net'));

      act(() => mockNovedades.fija(4));
      await waitFor(() => expect(getFeed).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(markSeen).toHaveBeenCalledTimes(2));
      await act(async () => {});
      await act(async () => {});

      expect(getFeed).toHaveBeenCalledTimes(2);
    });

    it('tapping Actividad while on Actividad reloads and marks it seen', async () => {
      renderFeed();
      await screen.findByTestId('activity-event-e1');
      await waitFor(() => expect(markSeen).toHaveBeenCalledTimes(1));

      fireEvent.click(screen.getByText('boton-actividad'));

      await waitFor(() => expect(getFeed).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(markSeen).toHaveBeenCalledTimes(2));
    });
  });
});
