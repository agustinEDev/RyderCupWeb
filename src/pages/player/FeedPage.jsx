import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useLocation } from 'react-router';
import { AlertCircle, Loader, RefreshCw, Sparkles, UserPlus, WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import customToast from '../../utils/toast';
import { esFalloDeRed } from '../../utils/sinCobertura';
import HeaderAuth from '../../components/layout/HeaderAuth';
import { useAuth } from '../../hooks/useAuth';
import { ponLasNovedadesACero, useNovedadesDeActividad } from '../../hooks/useNovedadesDeActividad';
import ActivityEventCard from '../../components/feed/ActivityEventCard';
import FriendRequestCard from '../../components/feed/FriendRequestCard';
import DiasDeActividad from '../../components/feed/DiasDeActividad';
import { armaLaLineaDeActividad } from '../../domain/services/lineaDeActividad';
import {
  getFriendsFeedUseCase,
  markFeedAsSeenUseCase,
  respondFriendRequestUseCase,
} from '../../composition';
import BlockLoader from '../../components/ui/BlockLoader';
import { PANTALLA_MENOS_BARRA_INFERIOR } from '../../utils/barraInferior';

const PAGE_SIZE = 20;

// Lo de una recarga sobre lo ya cargado: lo conocido se actualiza en su sitio
// (por id) y lo nuevo entra arriba
const mezclaArriba = (cargados, frescos) => {
  const porId = new Map(frescos.map((e) => [e.id, e]));
  const nuevos = frescos.filter((e) => !cargados.some((c) => c.id === e.id));
  return [...nuevos, ...cargados.map((c) => porId.get(c.id) ?? c)];
};

// Una página más, al final, sin repetir lo que ya hay
const mezclaAbajo = (cargados, pagina) => {
  const ya = new Set(cargados.map((e) => e.id));
  return [...cargados, ...pagina.filter((e) => !ya.has(e.id))];
};

// El número del botón y del icono se pone a cero cuando el backend ha guardado
// la visita. Que falle no debe impedir leer el feed: lo peor que pasa es que el
// número siga puesto hasta la próxima visita.
const marcaComoVisto = () => {
  markFeedAsSeenUseCase
    .execute()
    .then(() => ponLasNovedadesACero())
    .catch(() => {});
};

/**
 * FeedPage - Actividad: lo propio y lo de los amigos en una sola línea de
 * tiempo (FE-1).
 *
 * Arriba, las solicitudes de amistad, que se aceptan ahí mismo. Debajo, las
 * tarjetas de lo más reciente a lo más antiguo, separadas por días, con la
 * marca de «nuevo» en lo llegado desde la última visita. Sin pestañas.
 *
 * Sustituye a Amigos en la barra inferior: la lista de amigos vive a un toque
 * de aquí, que es donde uno acaba mirando a sus amigos de todos modos.
 */
const FeedPage = () => {
  const { t } = useTranslation(['feed', 'common']);
  const { user, loading: isLoadingUser } = useAuth();

  const [events, setEvents] = useState([]);
  const [authors, setAuthors] = useState({});
  const [courses, setCourses] = useState({});
  const [requests, setRequests] = useState([]);
  const [unseenCount, setUnseenCount] = useState(0);
  const [nextCursor, setNextCursor] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  // null, 'red' (sin cobertura) u 'otro': con fallo no se dice «no hay nada»
  const [loadError, setLoadError] = useState(null);
  // Por solicitud: 'enviando' mientras se responde, 'aceptada' después
  const [requestStates, setRequestStates] = useState({});

  // Lo que hace falta para recargar estando ya en Actividad (revisión FE-1):
  // si la primera carga ya llegó y si hay una recarga en marcha
  const cargado = useRef(false);
  const recargando = useRef(false);
  const cargandoMas = useRef(false);
  const recargaPendiente = useRef(false);
  // Lo cargado, para que la recarga sepa si su página enlaza con ello
  const cargados = useRef([]);

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

  /**
   * Hay novedades estando ya en Actividad —el número subió al volver a la
   * aplicación o a la red, o se ha vuelto a pulsar Actividad—: se pide otra
   * vez la primera página y se da por vista, con lo que el número vuelve a
   * cero. Se MEZCLA con lo cargado, no lo sustituye: lo nuevo entra arriba, lo
   * ya pintado se actualiza, y las páginas traídas con «Cargar más» y su
   * cursor se quedan —ni se pierde lo leído ni salta el scroll—. Las
   * solicitudes sí se cambian por las de ahora: se leen en vivo.
   *
   * Una recarga a la vez, y nunca con un «Cargar más» en vuelo: se apunta y se
   * hace al acabar. Si falla, se queda lo que había, sin avisos: no lo ha
   * pedido nadie.
   */
  const recarga = useCallback(async () => {
    if (!cargado.current || recargando.current) return;
    if (cargandoMas.current) {
      recargaPendiente.current = true;
      return;
    }
    recargando.current = true;
    try {
      const page = await getFriendsFeedUseCase.execute({ limit: PAGE_SIZE });
      setEvents((prev) => mezclaArriba(prev, page.events));
      setAuthors((prev) => ({ ...prev, ...page.authors }));
      setCourses((prev) => ({ ...prev, ...page.courses }));
      setRequests(page.pendingFriendRequests || []);
      setUnseenCount(page.unseenCount || 0);
      // El cursor, coherente con la mezcla: si la página fresca enlaza con lo
      // cargado (comparte alguna entrada), entre las dos no falta nada y sigue
      // el cursor de siempre, el de la última página traída con «Cargar más».
      // Si no enlaza —no había nada, o han llegado más entradas de las que
      // caben en una página—, queda un hueco por debajo y manda el suyo: lo ya
      // pintado se queda y lo repetido no se duplica al seguir bajando
      const conocidos = new Set(cargados.current.map((e) => e.id));
      // Una página fresca vacía solo «enlaza» si hay algo cargado: con el feed
      // vacío no hay cursor que llegue a su página siguiente (CodeRabbit FE #947)
      const enlaza =
        page.events.length === 0
          ? cargados.current.length > 0
          : page.events.some((e) => conocidos.has(e.id));
      if (!enlaza) setNextCursor(page.nextCursor ?? null);
      marcaComoVisto();
    } catch {
      // Se queda lo que había
    } finally {
      recargando.current = false;
    }
  }, []);

  const loadFeed = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const page = await getFriendsFeedUseCase.execute({ limit: PAGE_SIZE });
      setEvents(page.events);
      setAuthors(page.authors);
      setCourses(page.courses);
      setRequests(page.pendingFriendRequests || []);
      setUnseenCount(page.unseenCount || 0);
      setNextCursor(page.nextCursor);
      setLoadError(null);
      cargado.current = true;

      if (!yaMarcado.current) {
        yaMarcado.current = true;
        marcaComoVisto();
      }
    } catch (err) {
      // `catch` sin el error no dejaba distinguir un backend roto de no tener
      // cobertura, y las dos cosas acababan en el mismo aviso
      const deRed = esFalloDeRed(err);
      setLoadError(deRed ? 'red' : 'otro');
      customToast.error(
        tRef.current(deRed ? 'common:sinConexion.mensaje' : 'common:errors.generic')
      );
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing pattern surfaced by eslint-plugin-react-hooks 7.1.1 bump; needs dedicated review (tracked in follow-up)
    loadFeed();
  }, [loadFeed]);

  // El número sube mientras se mira Actividad: se recarga. Solo cuando sube
  // —no por el que ya hubiera al entrar, que lo atiende la primera carga— y
  // si marcar falla el número no cambia, así que no vuelve a dispararse
  const novedades = useNovedadesDeActividad();
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- recarga sets state only after awaiting the API, never synchronously
    if (novedades > 0) recarga();
  }, [novedades, recarga]);

  // Pulsar Actividad estando en Actividad no vuelve a montar la página, pero
  // sí cambia la entrada del historial
  const { key: entrada } = useLocation();
  const entradaVista = useRef(entrada);
  useEffect(() => {
    if (entradaVista.current === entrada) return;
    entradaVista.current = entrada;
    recarga();
  }, [entrada, recarga]);

  const handleLoadMore = async () => {
    if (!nextCursor || isLoadingMore) return;

    setIsLoadingMore(true);
    cargandoMas.current = true;
    try {
      const page = await getFriendsFeedUseCase.execute({
        limit: PAGE_SIZE,
        cursor: nextCursor,
      });
      // Sin repetir lo que una recarga ya hubiera traído
      setEvents((prev) => mezclaAbajo(prev, page.events));
      setAuthors((prev) => ({ ...prev, ...page.authors }));
      setCourses((prev) => ({ ...prev, ...page.courses }));
      setNextCursor(page.nextCursor);
    } catch (err) {
      customToast.error(
        t(esFalloDeRed(err) ? 'common:sinConexion.mensaje' : 'common:errors.generic')
      );
    } finally {
      setIsLoadingMore(false);
      cargandoMas.current = false;
      // La recarga que llegó mientras tanto se hace ahora
      if (recargaPendiente.current) {
        recargaPendiente.current = false;
        recarga();
      }
    }
  };

  const respond = async (friendshipId, action) => {
    setRequestStates((prev) => ({ ...prev, [friendshipId]: 'enviando' }));
    try {
      await respondFriendRequestUseCase.execute(friendshipId, action);
      if (action === 'ACCEPT') {
        setRequestStates((prev) => ({ ...prev, [friendshipId]: 'aceptada' }));
      } else {
        setRequests((prev) => prev.filter((r) => r.friendshipId !== friendshipId));
      }
    } catch (err) {
      // La tarjeta se queda como estaba, con sus botones, para volver a probar
      setRequestStates((prev) => {
        const resto = { ...prev };
        delete resto[friendshipId];
        return resto;
      });
      customToast.error(
        t(esFalloDeRed(err) ? 'common:sinConexion.mensaje' : 'common:errors.generic')
      );
    }
  };

  useEffect(() => {
    cargados.current = events;
  }, [events]);

  const ahora = new Date();
  const linea = useMemo(
    () =>
      armaLaLineaDeActividad({
        eventos: events,
        solicitudes: requests,
        novedades: unseenCount,
        ahora: new Date(),
      }),
    [events, requests, unseenCount]
  );

  if (isLoadingUser || isLoading) {
    // La cabecera se queda puesta durante la espera: aparecer de golpe al
    // terminar es un salto, y de eso va justamente FE #495. El dibujo si es el
    // compartido.
    return (
      <div className={`${PANTALLA_MENOS_BARRA_INFERIOR} bg-gray-50`}>
        <HeaderAuth />
        <BlockLoader texto={t('feed:loading')} />
      </div>
    );
  }

  // Una página puede llegar con menos entradas de las pedidas, o con ninguna
  // que se sepa pintar, y aun así traer cursor: entonces queda más que ver y
  // no se dice «no hay nada», se ofrece «Cargar más»
  const vacio = linea.dias.length === 0 && linea.solicitudes.length === 0 && !nextCursor;

  return (
    <div className={`${PANTALLA_MENOS_BARRA_INFERIOR} bg-gray-50`}>
      <HeaderAuth />

      <main className="max-w-2xl mx-auto px-4 py-6 pb-24">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="min-w-0">
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

        {loadError ? (
          <LoadError deRed={loadError === 'red'} onRetry={loadFeed} t={t} />
        ) : vacio ? (
          <EmptyFeed t={t} />
        ) : (
          <>
            {linea.solicitudes.length > 0 && (
              <div className="space-y-3 mb-6" data-testid="feed-solicitudes">
                {linea.solicitudes.map((solicitud) => (
                  <FriendRequestCard
                    key={solicitud.friendshipId}
                    solicitud={solicitud}
                    autores={authors}
                    estado={requestStates[solicitud.friendshipId] || 'pendiente'}
                    onAceptar={() => respond(solicitud.friendshipId, 'ACCEPT')}
                    onRechazar={() => respond(solicitud.friendshipId, 'DECLINE')}
                    ahora={ahora}
                  />
                ))}
              </div>
            )}

            {linea.dias.length > 0 && (
              <DiasDeActividad
                dias={linea.dias}
                ahora={ahora}
                data-testid="feed-events"
                pintaTarjeta={(tarjeta) => (
                  <ActivityEventCard
                    key={tarjeta.clave}
                    tarjeta={tarjeta}
                    autores={authors}
                    campos={courses}
                    yoId={userId}
                    ahora={ahora}
                  />
                )}
              />
            )}

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
 * No se ha podido cargar. Sin cobertura se dice así —«aún no hay nada que
 * contar» sería una afirmación que no se sostiene sin haber podido preguntar—,
 * y en los dos casos se ofrece volver a intentarlo.
 */
const LoadError = ({ deRed, onRetry, t }) => (
  <div
    data-testid={deRed ? 'feed-sin-cobertura' : 'feed-error'}
    className="flex flex-col items-center justify-center py-12 text-center"
  >
    {deRed ? (
      <WifiOff className="w-12 h-12 text-gray-400 mb-3" aria-hidden="true" />
    ) : (
      <AlertCircle className="w-12 h-12 text-gray-400 mb-3" aria-hidden="true" />
    )}
    <p className="text-gray-900 font-semibold mb-1">
      {deRed ? t('common:sinConexion.aviso') : t('feed:loadError')}
    </p>
    {deRed && <p className="text-gray-500 text-sm">{t('feed:sinCoberturaDetalle')}</p>}
    <button
      type="button"
      onClick={onRetry}
      className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90"
    >
      <RefreshCw className="w-4 h-4" aria-hidden="true" />
      {t('feed:retry')}
    </button>
  </div>
);

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
