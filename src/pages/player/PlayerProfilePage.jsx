import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Check, Loader, Lock, Mail, UserPlus, UserX, X } from 'lucide-react';
import customToast from '../../utils/toast';
import HeaderAuth from '../../components/layout/HeaderAuth';
import Avatar from '../../components/ui/Avatar';
import ActivityEventCard from '../../components/feed/ActivityEventCard';
import { useAuth } from '../../hooks/useAuth';
import {
  getPlayerProfileUseCase,
  getPlayerActivityUseCase,
  sendFriendRequestUseCase,
  respondFriendRequestUseCase,
} from '../../composition';
import BlockLoader from '../../components/ui/BlockLoader';

const PAGE_SIZE = 20;
const HTTP_NOT_FOUND = 404;
const HTTP_FORBIDDEN = 403;

/**
 * PlayerProfilePage - El perfil de otro jugador.
 *
 * Tiene dos niveles de detalle, los mismos que el backend: **cualquiera ve la
 * ficha mínima** —foto, nombre y cuántos amigos tiene—, que es lo que hace
 * falta para reconocer a alguien antes de mandarle una solicitud; **el correo,
 * el hándicap, las estadísticas y la actividad solo se ven entre amigos**.
 *
 * Los campos privados llegan en null, no recortados ni a cero, así que aquí se
 * distingue "no puedes ver esto" de "no tiene datos": lo primero se explica,
 * lo segundo se dice tal cual.
 *
 * El perfil propio no se pinta aquí. El feed enlaza a `/players/{id}` también
 * para los logros de uno mismo, y verse a través de la ficha de un desconocido
 * —sin poder editar nada— sería desconcertante: se redirige a `/profile`, que
 * es el perfil de verdad.
 */
const PlayerProfilePage = () => {
  const { userId } = useParams();
  const { t } = useTranslation(['playerProfile', 'common']);
  const { user, loading: isLoadingUser } = useAuth();
  const location = useLocation();

  // Quien enlaza al perfil dice de dónde viene; sin esa pista se vuelve al
  // feed, que es de donde se llega la mayoría de las veces
  const cameFromFriends = location.state?.from === 'friends';
  const backLink = cameFromFriends ? '/friends' : '/feed';
  const backTextKey = cameFromFriends ? 'playerProfile:backToFriends' : 'playerProfile:backToFeed';

  const [profile, setProfile] = useState(null);
  const [isNotFound, setIsNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activity, setActivity] = useState(null);
  const [isActivityHidden, setIsActivityHidden] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isActing, setIsActing] = useState(false);

  // `t` solo hace falta para los mensajes de error, pero ponerla en las
  // dependencias ata la carga a la identidad de esa función: un proveedor que
  // devuelva una `t` nueva por render dispararía el efecto sin parar. Es el
  // mismo motivo por el que se depende del id y no del objeto `user`.
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  const myId = user?.id;
  const isSelf = Boolean(myId) && myId === userId;

  const loadProfile = useCallback(async () => {
    if (!userId || isSelf) return;

    setIsLoading(true);
    try {
      const data = await getPlayerProfileUseCase.execute(userId);
      setProfile(data);
      setIsNotFound(false);

      if (data.isFriend) {
        try {
          const page = await getPlayerActivityUseCase.execute(userId, { limit: PAGE_SIZE });
          setActivity(page);
          setIsActivityHidden(false);
        } catch (error) {
          // Un 403 aquí no es un fallo: significa que no publica su actividad,
          // aunque seáis amigos. El resto del perfil sigue siendo válido, así
          // que no se tira toda la pantalla por esto.
          if (error?.status === HTTP_FORBIDDEN) {
            setActivity(null);
            setIsActivityHidden(true);
          } else {
            customToast.error(tRef.current('common:errors.generic'));
          }
        }
      }
    } catch (error) {
      // El backend responde 404 tanto si el jugador no existe como si no se
      // puede ver, a propósito: un 403 confirmaría que la cuenta existe y
      // probar identificadores serviría para averiguar quién está registrado.
      if (error?.status === HTTP_NOT_FOUND) {
        setIsNotFound(true);
        setProfile(null);
      } else {
        customToast.error(tRef.current('common:errors.generic'));
      }
    } finally {
      setIsLoading(false);
    }
  }, [userId, isSelf]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing pattern surfaced by eslint-plugin-react-hooks 7.1.1 bump; needs dedicated review (tracked in follow-up)
    loadProfile();
  }, [loadProfile]);

  const handleLoadMore = async () => {
    if (!activity?.nextCursor || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const page = await getPlayerActivityUseCase.execute(userId, {
        limit: PAGE_SIZE,
        cursor: activity.nextCursor,
      });
      setActivity((prev) => ({
        events: [...prev.events, ...page.events],
        authors: { ...prev.authors, ...page.authors },
        nextCursor: page.nextCursor,
      }));
    } catch {
      customToast.error(t('common:errors.generic'));
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Tras cambiar la relación se recarga el perfil entero y no solo el botón:
  // aceptar una solicitud abre de golpe el hándicap, las estadísticas y la
  // actividad, que hasta ese momento llegaban en null.
  const runFriendshipAction = async (action, successKey) => {
    if (isActing) return;

    setIsActing(true);
    try {
      await action();
      customToast.success(t(successKey));
      await loadProfile();
    } catch {
      customToast.error(t('common:errors.generic'));
    } finally {
      setIsActing(false);
    }
  };

  if (isSelf) {
    return <Navigate to="/profile" replace />;
  }

  if (isLoadingUser || isLoading) {
    // La cabecera se queda puesta durante la espera: aparecer de golpe al
    // terminar es un salto, y de eso va justamente FE #495. El dibujo si es el
    // compartido.
    return (
      <div className="min-h-screen bg-gray-50">
        <HeaderAuth />
        <BlockLoader texto={t('playerProfile:loading')} />
      </div>
    );
  }

  if (isNotFound || !profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <HeaderAuth />
        <main className="max-w-2xl mx-auto px-4 py-6 pb-24">
          <div
            className="text-center py-16 px-6 bg-white border border-gray-200 rounded-lg"
            data-testid="player-profile-not-found"
          >
            <UserX className="w-10 h-10 mx-auto text-gray-300" aria-hidden="true" />
            <h2 className="mt-3 text-base font-semibold text-gray-900">
              {t('playerProfile:notFound.title')}
            </h2>
            <p className="mt-1 text-sm text-gray-500">{t('playerProfile:notFound.hint')}</p>
            <Link
              to="/feed"
              className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90"
            >
              {t('playerProfile:notFound.back')}
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const nombre = `${profile.firstName} ${profile.lastName}`.trim();

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderAuth />

      <main className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {/* En móvil la vuelta la da la flecha de la cabecera contextual. En
            escritorio esa cabecera no la pinta, así que el enlace vive aquí,
            junto al contenido, igual que en el detalle de un torneo.
            Este nombra su destino, así que lleva ahí de verdad en lugar de
            retroceder a ciegas — y por eso quien enlaza dice de dónde viene:
            desde Amigos, devolver al feed obliga a rehacer el camino, y eso
            se paga en cada solicitud que se revisa */}
        <Link
          to={backLink}
          className="hidden md:flex items-center gap-2 text-gray-600 hover:text-primary transition-colors mb-4 w-fit"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span className="text-sm font-medium">{t(backTextKey)}</span>
        </Link>

        {/* La cabecera contextual ya pinta el título en móvil: un segundo
            encabezado de nivel 1 rompería la jerarquía para los lectores de
            pantalla. */}
        <h1 className="hidden md:block text-xl font-bold text-gray-900 mb-4">
          {t('playerProfile:title')}
        </h1>

        <section
          className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg"
          data-testid="player-profile-card"
        >
          <Avatar userId={profile.id} size="lg" />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-gray-900 truncate">{nombre}</h2>
            <p className="text-sm text-gray-500">
              {t('playerProfile:friendsCount', { count: profile.friendsCount })}
            </p>
          </div>
        </section>

        <FriendshipAction
          profile={profile}
          isActing={isActing}
          t={t}
          onSend={() =>
            runFriendshipAction(
              () => sendFriendRequestUseCase.execute(profile.id),
              'playerProfile:friendship.requestSent'
            )
          }
          onAccept={() =>
            runFriendshipAction(
              () => respondFriendRequestUseCase.execute(profile.friendship.friendshipId, 'ACCEPT'),
              'playerProfile:friendship.accepted'
            )
          }
          onDecline={() =>
            runFriendshipAction(
              () => respondFriendRequestUseCase.execute(profile.friendship.friendshipId, 'DECLINE'),
              'playerProfile:friendship.declined'
            )
          }
        />

        {profile.isFriend ? (
          <>
            {profile.email && (
              <section
                className="mt-4 p-4 bg-white border border-gray-200 rounded-lg"
                data-testid="player-profile-contact"
              >
                <h3 className="text-sm font-semibold text-gray-900">
                  {t('playerProfile:contact.title')}
                </h3>
                {/* Un correo no tiene espacios: no puede partirse solo, asi que
                    su ancho minimo es el ancho entero y desborda la tarjeta en
                    un movil. `min-w-0` deja encoger al hijo de flex y
                    `break-all` le permite pasar a la linea siguiente. Se parte
                    en vez de recortarse porque una direccion a medias no sirve
                    para nada */}
                <p className="mt-2 flex items-center gap-2 text-sm text-gray-700">
                  <Mail className="w-4 h-4 shrink-0 text-gray-400" aria-hidden="true" />
                  <a
                    href={`mailto:${profile.email}`}
                    className="min-w-0 break-all text-primary hover:underline"
                  >
                    {profile.email}
                  </a>
                </p>
              </section>
            )}

            <PlayerStatsSummary profile={profile} t={t} />

            <section className="mt-4" data-testid="player-profile-activity">
              <h3 className="mb-2 text-sm font-semibold text-gray-900">
                {t('playerProfile:activity.title')}
              </h3>

              {isActivityHidden || !activity || activity.events.length === 0 ? (
                <p className="p-4 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg">
                  {isActivityHidden
                    ? t('playerProfile:activity.hidden')
                    : t('playerProfile:activity.empty')}
                </p>
              ) : (
                <>
                  <div className="space-y-3">
                    {activity.events.map((event) => (
                      <ActivityEventCard
                        key={event.id}
                        event={event}
                        author={activity.authors[event.userId]}
                      />
                    ))}
                  </div>

                  {activity.nextCursor && (
                    <button
                      type="button"
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                      className="mt-4 w-full py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-60"
                      data-testid="player-profile-load-more"
                    >
                      {isLoadingMore ? (
                        <Loader className="w-4 h-4 animate-spin mx-auto" />
                      ) : (
                        t('playerProfile:activity.loadMore')
                      )}
                    </button>
                  )}
                </>
              )}
            </section>
          </>
        ) : (
          <section
            className="mt-4 p-4 text-center bg-white border border-gray-200 rounded-lg"
            data-testid="player-profile-private"
          >
            <Lock className="w-6 h-6 mx-auto text-gray-300" aria-hidden="true" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">
              {t('playerProfile:private.title')}
            </h3>
            <p className="mt-1 text-sm text-gray-500">{t('playerProfile:private.hint')}</p>
          </section>
        )}
      </main>
    </div>
  );
};

/**
 * El botón que toca según en qué punto esté la relación. `PENDING_SENT` y
 * `PENDING_RECEIVED` no llevan al mismo sitio: uno espera respuesta del otro,
 * el otro pide una respuesta tuya, y por eso el backend los distingue.
 */
const FriendshipAction = ({ profile, isActing, t, onSend, onAccept, onDecline }) => {
  const status = profile.friendship?.status ?? 'NONE';

  if (status === 'ACCEPTED') {
    return (
      <p
        className="mt-3 flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg"
        data-testid="player-profile-friendship-accepted"
      >
        <Check className="w-4 h-4" aria-hidden="true" />
        {t('playerProfile:friendship.friends')}
      </p>
    );
  }

  if (status === 'PENDING_SENT') {
    return (
      <p
        className="mt-3 py-2 text-center text-sm text-gray-500 bg-white border border-gray-200 rounded-lg"
        data-testid="player-profile-friendship-sent"
      >
        {t('playerProfile:friendship.sent')}
      </p>
    );
  }

  if (status === 'PENDING_RECEIVED') {
    return (
      <div className="mt-3" data-testid="player-profile-friendship-received">
        <p className="mb-2 text-center text-sm text-gray-600">
          {t('playerProfile:friendship.received')}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onAccept}
            disabled={isActing}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-60"
          >
            <Check className="w-4 h-4" aria-hidden="true" />
            {t('playerProfile:friendship.accept')}
          </button>
          <button
            type="button"
            onClick={onDecline}
            disabled={isActing}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-60"
          >
            <X className="w-4 h-4" aria-hidden="true" />
            {t('playerProfile:friendship.decline')}
          </button>
        </div>
      </div>
    );
  }

  if (status === 'BLOCKED') {
    return (
      <p
        className="mt-3 py-2 text-center text-sm text-gray-500 bg-white border border-gray-200 rounded-lg"
        data-testid="player-profile-friendship-blocked"
      >
        {t('playerProfile:friendship.blocked')}
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={onSend}
      disabled={isActing}
      className="mt-3 w-full inline-flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-60"
      data-testid="player-profile-add-friend"
    >
      <UserPlus className="w-4 h-4" aria-hidden="true" />
      {t('playerProfile:friendship.add')}
    </button>
  );
};

/**
 * El mismo resumen que ve el jugador en su panel, en pequeño.
 *
 * El índice estimado se marca como tal aquí también, y no solo en la página de
 * estadísticas propia: quien lo lee es igual de capaz de confundirlo con el
 * hándicap oficial de la federación, que es lo que no es.
 */
const PlayerStatsSummary = ({ profile, t }) => {
  const stats = profile.stats;

  const format = (value) =>
    value === null || value === undefined ? t('playerProfile:stats.noValue') : value.toFixed(1);

  const formatToPar = (value) => {
    if (value === null || value === undefined) return t('playerProfile:stats.noValue');
    return value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1);
  };

  if (!stats || stats.roundsPlayed === 0) {
    return (
      <section
        className="mt-4 p-4 bg-white border border-gray-200 rounded-lg"
        data-testid="player-profile-stats-empty"
      >
        <h3 className="text-sm font-semibold text-gray-900">{t('playerProfile:stats.title')}</h3>
        <p className="mt-1 text-sm text-gray-500">{t('playerProfile:stats.empty')}</p>
      </section>
    );
  }

  const items = [
    { key: 'handicap', label: t('playerProfile:stats.handicap'), value: format(profile.handicap) },
    {
      key: 'estimatedIndex',
      label: t('playerProfile:stats.estimatedIndex'),
      value: format(stats.estimatedIndex),
      hint: t('playerProfile:stats.estimatedIndexHint'),
    },
    {
      key: 'scoringAvg',
      label: t('playerProfile:stats.scoringAvg'),
      value: formatToPar(stats.scoringAvg),
    },
    {
      key: 'roundsPlayed',
      label: t('playerProfile:stats.roundsPlayed'),
      value: String(stats.roundsPlayed),
    },
    {
      key: 'bestDifferential',
      label: t('playerProfile:stats.bestDifferential'),
      value: format(stats.bestDifferential),
    },
    {
      key: 'tournaments',
      label: t('playerProfile:stats.tournaments'),
      value: String(stats.tournamentsTotal),
    },
  ];

  return (
    <section className="mt-4" data-testid="player-profile-stats">
      <h3 className="mb-2 text-sm font-semibold text-gray-900">{t('playerProfile:stats.title')}</h3>
      <div className="grid grid-cols-3 gap-2">
        {items.map((item) => (
          <div
            key={item.key}
            className="p-3 bg-white border border-gray-200 rounded-lg"
            data-testid={`player-profile-stat-${item.key}`}
          >
            <p className="text-xs text-gray-500">{item.label}</p>
            <p className="text-lg font-bold text-gray-900">{item.value}</p>
            {item.hint && <p className="mt-0.5 text-[11px] leading-tight text-gray-400">{item.hint}</p>}
          </div>
        ))}
      </div>
    </section>
  );
};

export default PlayerProfilePage;
