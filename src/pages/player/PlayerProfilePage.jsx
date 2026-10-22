import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { nombreVisible } from '../../utils/nombreVisible';
import { Link, Navigate, useLocation, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Check, Loader, Lock, UserPlus, UserX, X } from 'lucide-react';
import customToast from '../../utils/toast';
import HeaderAuth from '../../components/layout/HeaderAuth';
import Avatar from '../../components/ui/Avatar';
import ActivityEventCard from '../../components/feed/ActivityEventCard';
import DiasDeActividad from '../../components/feed/DiasDeActividad';
import ConfirmModal from '../../components/modals/ConfirmModal';
import PlayerProfileMenu from '../../components/profile/PlayerProfileMenu';
import HeadToHead from '../../components/profile/HeadToHead';
import GamesTogether from '../../components/profile/GamesTogether';
import {
  armaLaLineaDeActividad,
  primerasTarjetasPorDia,
} from '../../domain/services/lineaDeActividad';
import { useAuth } from '../../hooks/useAuth';
import {
  getPlayerProfileUseCase,
  getPlayerActivityUseCase,
  sendFriendRequestUseCase,
  respondFriendRequestUseCase,
  removeFriendUseCase,
  blockUserUseCase,
  getGamesTogetherUseCase,
} from '../../composition';
import BlockLoader from '../../components/ui/BlockLoader';
import { formatoDeIndice } from '../../utils/formatoDeHandicap';

// La actividad de un amigo se enseña de 5 en 5 TARJETAS, como las partidas
// juntos (22 oct). Al servidor se le piden eventos de 20 en 20: los logros de
// una vuelta se juntan en una tarjeta y un tipo desconocido no pinta nada, así
// que 5 eventos no son 5 tarjetas (revisión FE-2)
const ACTIVITY_PAGE_SIZE = 20;
const CARDS_STEP = 5;
const HTTP_NOT_FOUND = 404;
const HTTP_FORBIDDEN = 403;

/**
 * PlayerProfilePage - El perfil de otro jugador.
 *
 * Tiene dos niveles de detalle, los mismos que el backend: **cualquiera ve la
 * ficha mínima** —foto, nombre, cuántos amigos tiene y su hándicap (BE-3)—,
 * que es lo que hace falta para reconocer a alguien antes de mandarle una
 * solicitud; **las estadísticas, la actividad, el cara a cara y las partidas
 * juntos solo se ven entre amigos**. Con un bloqueo de por medio, en
 * cualquier sentido, solo nombre y foto. El correo de otro, nunca.
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
  const { t, i18n } = useTranslation(['playerProfile', 'common']);
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
  const [games, setGames] = useState(null);
  const [isLoadingMoreGames, setIsLoadingMoreGames] = useState(false);
  // 'remove' | 'block' | null: lo que espera confirmación
  const [pendingConfirm, setPendingConfirm] = useState(null);
  const [visibleCards, setVisibleCards] = useState(CARDS_STEP);
  // Cada carga del perfil abre una generación nueva. Lo que conteste tarde
  // —una carga anterior, un «Ver más» de otro perfil— se descarta: si no, un
  // perfil viejo pisaba al nuevo (revisión FE-2)
  const generacion = useRef(0);
  // Una acción que termina cuando ya se ha salido de este perfil no recarga
  // ni toca nada: el perfil que se ve ya es otro (revisión final FE-2)
  const montado = useRef(true);
  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

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

  /**
   * Carga el perfil. Devuelve `false` solo si la ficha no se pudo leer (y no
   * por un 404, que ya es una respuesta): quien acaba de cambiar la relación
   * lo necesita para no dejar la pantalla contradiciendo a su aviso de éxito.
   */
  const loadProfile = useCallback(async ({ avisar = true } = {}) => {
    if (!userId || isSelf) return true;

    const gen = ++generacion.current;
    const vigente = () => gen === generacion.current;

    setIsLoading(true);
    try {
      const data = await getPlayerProfileUseCase.execute(userId);
      if (!vigente()) return true;
      setProfile(data);
      setGames(data.gamesTogether ?? null);
      setIsNotFound(false);
      setActivity(null);
      setIsActivityHidden(false);
      setVisibleCards(CARDS_STEP);

      if (data.isFriend) {
        try {
          const page = await getPlayerActivityUseCase.execute(userId, { limit: ACTIVITY_PAGE_SIZE });
          if (!vigente()) return true;
          setActivity(page);
          setIsActivityHidden(false);
        } catch (error) {
          if (!vigente()) return true;
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
      return true;
    } catch (error) {
      if (!vigente()) return true;
      // El backend responde 404 tanto si el jugador no existe como si no se
      // puede ver, a propósito: un 403 confirmaría que la cuenta existe y
      // probar identificadores serviría para averiguar quién está registrado.
      if (error?.status === HTTP_NOT_FOUND) {
        setIsNotFound(true);
        setProfile(null);
        return true;
      }
      if (avisar) customToast.error(tRef.current('common:errors.generic'));
      return false;
    } finally {
      if (vigente()) setIsLoading(false);
    }
  }, [userId, isSelf]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing pattern surfaced by eslint-plugin-react-hooks 7.1.1 bump; needs dedicated review (tracked in follow-up)
    loadProfile();
  }, [loadProfile]);

  // Las tarjetas que salen de lo cargado: las mismas que Actividad (FE-1), con
  // los logros de una vuelta juntos y los tipos que no se conocen, fuera. Van
  // por días, con el separador de Actividad: la tarjeta de otro día solo dice
  // la hora
  const { activityDays, activityCards } = useMemo(() => {
    const dias = activity
      ? armaLaLineaDeActividad({ eventos: activity.events, ahora: new Date() }).dias
      : [];
    return { activityDays: dias, activityCards: dias.flatMap((dia) => dia.tarjetas) };
  }, [activity]);

  // «Ver más» enseña 5 tarjetas más; solo pide otra página al servidor cuando
  // ya no quedan tarjetas cargadas sin enseñar
  const handleLoadMore = async () => {
    if (isLoadingMore) return;
    if (activityCards.length > visibleCards) {
      setVisibleCards((n) => n + CARDS_STEP);
      return;
    }
    if (!activity?.nextCursor) return;

    const gen = generacion.current;
    setIsLoadingMore(true);
    try {
      const page = await getPlayerActivityUseCase.execute(userId, {
        limit: ACTIVITY_PAGE_SIZE,
        cursor: activity.nextCursor,
      });
      if (gen !== generacion.current) return;
      setActivity((prev) =>
        prev
          ? {
              events: [...prev.events, ...page.events],
              authors: { ...prev.authors, ...page.authors },
              // Los nombres de campo se acumulan como los autores: si no, las
              // tarjetas ya pintadas perdían el suyo al paginar (revisión FE-1)
              courses: { ...prev.courses, ...page.courses },
              nextCursor: page.nextCursor,
            }
          : prev
      );
      // Ya se veían todas las cargadas: 5 más a partir de ahí, no del límite
      // anterior, que una página de menos de 5 tarjetas dejaba por encima
      // (CodeRabbit FE-2)
      setVisibleCards(activityCards.length + CARDS_STEP);
    } catch {
      if (gen === generacion.current) customToast.error(t('common:errors.generic'));
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleLoadMoreGames = async () => {
    if (!games?.nextCursor || isLoadingMoreGames) return;

    const gen = generacion.current;
    setIsLoadingMoreGames(true);
    try {
      const page = await getGamesTogetherUseCase.execute(userId, { cursor: games.nextCursor });
      if (gen !== generacion.current) return;
      setGames((prev) =>
        prev ? { games: [...prev.games, ...page.games], nextCursor: page.nextCursor } : prev
      );
    } catch {
      if (gen === generacion.current) customToast.error(t('common:errors.generic'));
    } finally {
      setIsLoadingMoreGames(false);
    }
  };

  // Si la acción salió bien pero la recarga no, la pantalla tiene que decir
  // lo mismo que el aviso de éxito: se pone la relación nueva a mano y se
  // retira lo que solo ven los amigos (revisión FE-2)
  const applyRelationshipLocally = (status, friendshipId) => {
    setProfile((prev) => {
      if (!prev) return prev;
      const sigueAmigo = status === 'ACCEPTED' && prev.isFriend;
      return {
        ...prev,
        friendship: {
          status,
          // El id nuevo lo da la respuesta de enviar o bloquear; sin él,
          // «Cancelar solicitud» y «Desbloquear» no tendrían qué deshacer
          friendshipId:
            status === 'NONE' ? null : (friendshipId ?? prev.friendship?.friendshipId ?? null),
        },
        isFriend: sigueAmigo,
        stats: sigueAmigo ? prev.stats : null,
        headToHead: sigueAmigo ? prev.headToHead : null,
        gamesTogether: sigueAmigo ? prev.gamesTogether : null,
        handicap: status === 'BLOCKED' ? null : prev.handicap,
        // Quien llega aquí con un bloqueo acaba de ponerlo
        blockedByMe: status === 'BLOCKED' ? true : null,
      };
    });
    if (status !== 'ACCEPTED') {
      setGames(null);
      setActivity(null);
    }
  };

  // Tras cambiar la relación se recarga el perfil entero y no solo el botón:
  // aceptar una solicitud abre de golpe las estadísticas y la actividad, que
  // hasta ese momento llegaban en null, y bloquear las cierra. Nada cambia
  // antes de que el servidor conteste: si falla, el botón sigue como estaba
  // y lo dice un aviso.
  const runFriendshipAction = async (action, successKey, { statusAfter, forbiddenKey } = {}) => {
    if (isActing) return;

    setIsActing(true);
    try {
      let result;
      try {
        result = await action();
      } catch (error) {
        if (!montado.current) return;
        customToast.error(
          error?.status === HTTP_FORBIDDEN && forbiddenKey
            ? t(forbiddenKey)
            : t('common:errors.generic')
        );
        return;
      }
      if (!montado.current) return;
      customToast.success(t(successKey));
      const reloaded = await loadProfile({ avisar: false });
      if (!montado.current) return;
      if (!reloaded) {
        applyRelationshipLocally(statusAfter, result?.id ?? null);
        customToast.error(t('playerProfile:errors.reloadFailed'));
      }
    } finally {
      if (montado.current) setIsActing(false);
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

  const nombre = nombreVisible(profile);
  const relationship = profile.friendship?.status ?? 'NONE';
  const isBlocked = relationship === 'BLOCKED';
  // El hándicap va en la rejilla de estadísticas cuando la hay; si no, bajo
  // el nombre (y no en los dos sitios a la vez, revisión FE-2)
  const hasStatsGrid = Boolean(profile.isFriend && profile.stats && profile.stats.roundsPlayed > 0);

  const handleConfirm = () => {
    const accion = pendingConfirm;
    setPendingConfirm(null);
    if (accion === 'remove') {
      runFriendshipAction(
        () => removeFriendUseCase.execute(profile.friendship.friendshipId),
        'playerProfile:friendship.removed',
        { statusAfter: 'NONE' }
      );
    } else if (accion === 'block') {
      runFriendshipAction(
        () => blockUserUseCase.execute(profile.id),
        'playerProfile:friendship.blockedNow',
        { statusAfter: 'BLOCKED' }
      );
    }
  };

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
            {/* Con un bloqueo de por medio, solo nombre y foto: el backend
                manda el contador a 0 y el hándicap en null, y aquí no se
                pintan para no decir «0 amigos» de quien sí los tiene */}
            {!isBlocked && (
              <>
                <p className="text-sm text-gray-500">
                  {t('playerProfile:friendsCount', { count: profile.friendsCount })}
                </p>
                {!hasStatsGrid && (
                  <p className="text-sm text-gray-500" data-testid="player-profile-handicap">
                    {t('playerProfile:handicap')}{' '}
                    <span className="font-semibold text-gray-900">
                      {formatoDeIndice(profile.handicap) ?? t('playerProfile:stats.noValue')}
                    </span>
                  </p>
                )}
              </>
            )}
          </div>
          {!isBlocked && (
            <PlayerProfileMenu
              isFriend={relationship === 'ACCEPTED'}
              disabled={isActing || isLoadingMore || isLoadingMoreGames}
              onRemove={() => setPendingConfirm('remove')}
              onBlock={() => setPendingConfirm('block')}
              t={t}
            />
          )}
        </section>

        <FriendshipAction
          profile={profile}
          isActing={isActing}
          t={t}
          onSend={() =>
            runFriendshipAction(
              () => sendFriendRequestUseCase.execute(profile.id),
              'playerProfile:friendship.requestSent',
              { statusAfter: 'PENDING_SENT' }
            )
          }
          onAccept={() =>
            runFriendshipAction(
              () => respondFriendRequestUseCase.execute(profile.friendship.friendshipId, 'ACCEPT'),
              'playerProfile:friendship.accepted',
              { statusAfter: 'ACCEPTED' }
            )
          }
          onDecline={() =>
            runFriendshipAction(
              () => respondFriendRequestUseCase.execute(profile.friendship.friendshipId, 'DECLINE'),
              'playerProfile:friendship.declined',
              { statusAfter: 'NONE' }
            )
          }
          onCancelRequest={() =>
            runFriendshipAction(
              () => removeFriendUseCase.execute(profile.friendship.friendshipId),
              'playerProfile:friendship.cancelled',
              { statusAfter: 'NONE' }
            )
          }
          onUnblock={() =>
            runFriendshipAction(
              () => removeFriendUseCase.execute(profile.friendship.friendshipId),
              'playerProfile:friendship.unblocked',
              {
                statusAfter: 'NONE',
                // Solo desbloquea quien bloqueó: el perfil no dice quién fue,
                // y el 403 del otro lado se explica en vez de un error genérico
                forbiddenKey: 'playerProfile:friendship.onlyBlockerCanUnblock',
              }
            )
          }
        />

        {/* Sin `isLoading`: de un modal se sale siempre (4 oct). Confirmar lo
            cierra al momento y la acción sigue en el botón de estado; si
            falla, lo dice un aviso */}
        <ConfirmModal
          isOpen={pendingConfirm !== null}
          title={pendingConfirm ? t(`playerProfile:confirm.${pendingConfirm}.title`, { name: nombre }) : ''}
          message={pendingConfirm ? t(`playerProfile:confirm.${pendingConfirm}.message`) : ''}
          confirmText={pendingConfirm ? t(`playerProfile:confirm.${pendingConfirm}.confirm`) : undefined}
          isDestructive
          onCancel={() => setPendingConfirm(null)}
          onConfirm={handleConfirm}
        />

        {profile.isFriend ? (
          <>
            {/* Sin el correo: el de otro jugador no se enseña, ni siendo amigos
                (Agustín, 21 oct). El propio está en /profile */}
            <PlayerStatsSummary profile={profile} t={t} />

            <HeadToHead headToHead={profile.headToHead} t={t} />

            <GamesTogether
              games={games?.games}
              nextCursor={games?.nextCursor}
              isLoadingMore={isLoadingMoreGames}
              onLoadMore={handleLoadMoreGames}
              t={t}
              idioma={i18n?.language}
            />

            <section className="mt-4" data-testid="player-profile-activity">
              <h3 className="mb-2 text-sm font-semibold text-gray-900">
                {t('playerProfile:activity.title')}
              </h3>

              {isActivityHidden || activityCards.length === 0 ? (
                <p className="p-4 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg">
                  {isActivityHidden
                    ? t('playerProfile:activity.hidden')
                    : t('playerProfile:activity.empty')}
                </p>
              ) : (
                <>
                  <DiasDeActividad
                    dias={primerasTarjetasPorDia(activityDays, visibleCards)}
                    ahora={new Date()}
                    nivel={4}
                    pintaTarjeta={(tarjeta) => (
                      <ActivityEventCard
                        key={tarjeta.clave}
                        tarjeta={tarjeta}
                        autores={activity.authors}
                        campos={activity.courses}
                        yoId={myId}
                        perfilActualId={userId}
                      />
                    )}
                  />

                  {(activityCards.length > visibleCards || activity.nextCursor) && (
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
        ) : isBlocked || relationship === 'ACCEPTED' ? null : (
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
const FriendshipAction = ({
  profile,
  isActing,
  t,
  onSend,
  onAccept,
  onDecline,
  onCancelRequest,
  onUnblock,
}) => {
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
      <div
        className="mt-3 flex items-center justify-between gap-3 py-2 pl-3 pr-2 bg-white border border-gray-200 rounded-lg"
        data-testid="player-profile-friendship-sent"
      >
        <span className="min-w-0 text-sm text-gray-600">{t('playerProfile:friendship.sent')}</span>
        <button
          type="button"
          onClick={onCancelRequest}
          disabled={isActing}
          className="shrink-0 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-60"
          data-testid="player-profile-cancel-request"
        >
          {t('playerProfile:friendship.cancelRequest')}
        </button>
      </div>
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
      <div
        className="mt-3 flex items-center justify-between gap-3 py-2 pl-3 pr-2 bg-white border border-gray-200 rounded-lg"
        data-testid="player-profile-friendship-blocked"
      >
        <span className="min-w-0 text-sm font-medium text-gray-600">
          {t('playerProfile:friendship.blocked')}
        </span>
        {/* Solo desbloquea quien bloqueó. Si el bloqueo es del otro
            (`blockedByMe` false) no hay nada que hacer aquí: ni botón ni menú.
            Si no se sabe —un backend que no lo dice—, el botón sale y el 403
            se explica con su aviso */}
        {profile.blockedByMe !== false && (
          <button
            type="button"
            onClick={onUnblock}
            disabled={isActing}
            className="shrink-0 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-60"
            data-testid="player-profile-unblock"
          >
            {t('playerProfile:friendship.unblock')}
          </button>
        )}
      </div>
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
    { key: 'handicap', label: t('playerProfile:stats.handicap'), value: formatoDeIndice(profile.handicap) ?? t('playerProfile:stats.noValue') },
    {
      key: 'estimatedIndex',
      label: t('playerProfile:stats.estimatedIndex'),
      value: formatoDeIndice(stats.estimatedIndex) ?? t('playerProfile:stats.noValue'),
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

/**
 * Una página por jugador: al pasar de /players/A a /players/B el router
 * reutiliza el componente, y sin remontarlo B heredaba el estado de A —la
 * acción en vuelo, el botón ocupado, la recarga al terminar— (revisión final
 * FE-2). Con la clave en el id, cada perfil empieza de cero.
 */
const PlayerProfileRoute = () => {
  const { userId } = useParams();
  return <PlayerProfilePage key={userId} />;
};

export default PlayerProfileRoute;
