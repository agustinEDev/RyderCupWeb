import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router';
import { Loader, Sparkles, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import customToast from '../../utils/toast';
import HeaderAuth from '../../components/layout/HeaderAuth';
import { useAuth } from '../../hooks/useAuth';
import ActivityEventCard from '../../components/feed/ActivityEventCard';
import { getFriendsFeedUseCase, markFeedAsSeenUseCase } from '../../composition';

const PAGE_SIZE = 20;

/**
 * FeedPage - La actividad propia y la de los amigos.
 *
 * Sustituye a Amigos en la barra inferior: la lista de amigos vive ahora a un
 * toque de aquí, que es donde uno acaba mirando a sus amigos de todos modos.
 */
const FeedPage = () => {
  const { t } = useTranslation(['feed', 'common']);
  const { user, loading: isLoadingUser } = useAuth();

  const [events, setEvents] = useState([]);
  const [authors, setAuthors] = useState({});
  const [courses, setCourses] = useState({});
  const [nextCursor, setNextCursor] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Se marca como visto una sola vez por visita. Sin esto, cada paginación
  // volvería a marcarlo, y el aviso se apagaría por refrescar en vez de por
  // haber mirado.
  const yaMarcado = useRef(false);

  // `t` solo hace falta para el mensaje de error, pero ponerlo en las
  // dependencias ata la carga del feed a la identidad de esa función: si el
  // proveedor de traducción devuelve una `t` nueva por render, el efecto vuelve
  // a dispararse y el feed se pide en bucle. Con la ref, `loadFeed` depende solo
  // del usuario, que es de lo que de verdad depende.
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  // Depende del id y no del objeto `user`: si el proveedor de sesión devuelve
  // un objeto nuevo por render —aunque represente al mismo usuario—, atarse a
  // su identidad vuelve a pedir el feed sin parar.
  const userId = user?.id;

  const loadFeed = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const page = await getFriendsFeedUseCase.execute({ limit: PAGE_SIZE });
      setEvents(page.events);
      setAuthors(page.authors);
      setCourses(page.courses);
      setNextCursor(page.nextCursor);

      if (!yaMarcado.current) {
        yaMarcado.current = true;
        // Que falle apagar el aviso no debe impedir leer el feed: lo peor que
        // pasa es que la insignia siga puesta hasta la próxima visita.
        markFeedAsSeenUseCase.execute().catch(() => {});
      }
    } catch {
      customToast.error(tRef.current('common:errors.generic'));
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing pattern surfaced by eslint-plugin-react-hooks 7.1.1 bump; needs dedicated review (tracked in follow-up)
    loadFeed();
  }, [loadFeed]);

  const handleLoadMore = async () => {
    if (!nextCursor || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const page = await getFriendsFeedUseCase.execute({
        limit: PAGE_SIZE,
        cursor: nextCursor,
      });
      setEvents((prev) => [...prev, ...page.events]);
      setAuthors((prev) => ({ ...prev, ...page.authors }));
      setCourses((prev) => ({ ...prev, ...page.courses }));
      setNextCursor(page.nextCursor);
    } catch {
      customToast.error(t('common:errors.generic'));
    } finally {
      setIsLoadingMore(false);
    }
  };

  if (isLoadingUser || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <HeaderAuth />
        <div className="flex items-center justify-center py-20" role="status">
          <Loader className="w-6 h-6 animate-spin text-primary" />
          <span className="sr-only">{t('feed:loading')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderAuth />

      <main className="max-w-2xl mx-auto px-4 py-6 pb-24">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="hidden md:block text-xl font-bold text-gray-900">{t('feed:title')}</h1>
            <p className="text-sm text-gray-500">{t('feed:subtitle')}</p>
          </div>
          <Link
            to="/friends"
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-primary border border-primary/30 rounded-md hover:bg-primary/5"
            data-testid="feed-friends-link"
          >
            <UserPlus className="w-4 h-4" aria-hidden="true" />
            {t('feed:tabs.friends')}
          </Link>
        </div>

        {events.length === 0 ? (
          <EmptyFeed t={t} />
        ) : (
          <>
            <div className="space-y-3" data-testid="feed-events">
              {events.map((event) => (
                <ActivityEventCard
                  key={event.id}
                  event={event}
                  author={authors[event.userId]}
                  courseName={courses[event.payload?.golf_course_id]}
                />
              ))}
            </div>

            {nextCursor && (
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="mt-4 w-full py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-60"
                data-testid="feed-load-more"
              >
                {isLoadingMore ? (
                  <Loader className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  t('feed:loadMore')
                )}
              </button>
            )}
          </>
        )}
      </main>
    </div>
  );
};

/**
 * El feed vacío es el estado normal al principio, no un error: sin amigos, con
 * amigos que aún no han jugado, o recién llegado. Se ofrece el único paso que
 * lo arregla en vez de dejar la pantalla en blanco.
 */
const EmptyFeed = ({ t }) => (
  <div className="text-center py-16 px-6 bg-white border border-gray-200 rounded-lg" data-testid="feed-empty">
    <Sparkles className="w-10 h-10 mx-auto text-gray-300" aria-hidden="true" />
    <h2 className="mt-3 text-base font-semibold text-gray-900">{t('feed:empty.noActivity')}</h2>
    <p className="mt-1 text-sm text-gray-500">{t('feed:empty.noActivityHint')}</p>
    <Link
      to="/friends"
      className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90"
    >
      <UserPlus className="w-4 h-4" aria-hidden="true" />
      {t('feed:empty.addFriends')}
    </Link>
  </div>
);

export default FeedPage;
