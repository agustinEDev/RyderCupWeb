import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { Mail, Users, Flag, TrendingUp, ChevronRight, Bell, UserPlus, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useEntryMotion } from '../../hooks/useEntryMotion';
import { slideUp, getEntryProps } from '../../utils/animations';
import {
  listMyInvitationsUseCase,
  listEnrollmentsUseCase,
  listPendingFriendRequestsUseCase,
  listMyQuickMatchesUseCase,
} from '../../composition';
import { loQueSeEnseñoAntes, recuerdaLasAccionesPendientes } from '../../services/accionesPendientes';

const PendingActionsCard = ({ user, competitions, onHandicapAction, handicapPending = false , upcomingMatches = 0 }) => {
  const navigate = useNavigate();
  const { t } = useTranslation('dashboard');
  const { animateEntry } = useEntryMotion();
  // Arranca con lo ultimo que esta tarjeta llego a enseñar (FE #502). El panel
  // se remonta cada vez que se vuelve a Inicio desde la barra inferior, asi que
  // sin esto cada vuelta empezaba de cero y pintaba el esqueleto amarillo
  const recordado = loQueSeEnseñoAntes();

  const [pendingInvitations, setPendingInvitations] = useState(recordado?.pendingInvitations ?? 0);
  const [pendingEnrollments, setPendingEnrollments] = useState(recordado?.pendingEnrollments ?? []);
  const [pendingFriendRequests, setPendingFriendRequests] = useState(recordado?.pendingFriendRequests ?? 0);
  const [activeQuickMatches, setActiveQuickMatches] = useState(recordado?.activeQuickMatches ?? []);
  // Solo se enseña la espera cuando NO hay nada que enseñar: con lo de antes en
  // pantalla, el refresco va en silencio
  const [isLoading, setIsLoading] = useState(false);

  // Lo ultimo que se llego a APLICAR, que es lo que hay que recordar. En una ref
  // y no leyendo los estados dentro del efecto: eso obligaria a meterlos en sus
  // dependencias y el efecto se relanzaria a si mismo
  const ultimoAplicado = useRef({
    pendingInvitations: recordado?.pendingInvitations ?? 0,
    pendingEnrollments: recordado?.pendingEnrollments ?? [],
    pendingFriendRequests: recordado?.pendingFriendRequests ?? 0,
    activeQuickMatches: recordado?.activeQuickMatches ?? [],
  });

  const isCreator = useMemo(() => user?.is_admin ||
    (user?.roles && Array.isArray(user.roles) &&
      user.roles.some(r => (typeof r === 'string' ? r : r.name) === 'CREATOR' || (typeof r === 'string' ? r : r.name) === 'ADMIN')), [user]);

  useEffect(() => {
    if (!user) return;

    let cancelado = false;

    const loadPendingData = async () => {
      if (!loQueSeEnseñoAntes()) setIsLoading(true);
      try {
        const results = await Promise.allSettled([
          listMyInvitationsUseCase.execute({ status: 'PENDING' }),
          isCreator ? loadPendingEnrollments(competitions) : Promise.resolve([]),
          listPendingFriendRequestsUseCase.execute(user.id, 'received'),
          listMyQuickMatchesUseCase.execute({ status: 'IN_PROGRESS' }),
        ]);

        // Una respuesta que llega cuando ya nos hemos ido no escribe: antes solo
        // tocaba el estado de un componente muerto, pero ahora deja memoria que
        // pinta el SIGUIENTE montaje. Aceptar unas solicitudes y volver a Inicio
        // enseñaba las de antes, ya atendidas
        if (cancelado) return;

        // Lo que se aplica es tambien lo que se recuerda. Guardar ceros de las
        // que fallaron dejaba la memoria diciendo «no hay nada» mientras la
        // pantalla seguia enseñando lo de antes, y a la vuelta desaparecian
        const aplicado = ultimoAplicado.current;

        if (results[0].status === 'fulfilled') {
          const invitations = results[0].value?.invitations;
          aplicado.pendingInvitations = Array.isArray(invitations) ? invitations.length : 0;
          setPendingInvitations(aplicado.pendingInvitations);
        }
        // Las inscripciones se sacan de las competiciones, y al volver a Inicio
        // el panel se pinta antes de tenerlas: sin esta condicion se ponian a
        // cero en cada vuelta y la fila del creador parpadeaba
        if (results[1].status === 'fulfilled' && (competitions.length > 0 || !isCreator)) {
          aplicado.pendingEnrollments = results[1].value;
          setPendingEnrollments(aplicado.pendingEnrollments);
        }
        if (results[2].status === 'fulfilled') {
          aplicado.pendingFriendRequests = results[2].value?.totalCount || 0;
          setPendingFriendRequests(aplicado.pendingFriendRequests);
        }
        if (results[3].status === 'fulfilled') {
          aplicado.activeQuickMatches = results[3].value?.quickMatches || [];
          setActiveQuickMatches(aplicado.activeQuickMatches);
        }

        ultimoAplicado.current = aplicado;
        recuerdaLasAccionesPendientes({ ...aplicado });
      } catch (error) {
        console.error('Error loading pending actions:', error);
      } finally {
        if (!cancelado) setIsLoading(false);
      }
    };

    loadPendingData();

    return () => {
      cancelado = true;
    };
  }, [user, competitions, isCreator]);

  const totalItems = pendingInvitations + pendingEnrollments.length + (upcomingMatches > 0 ? 1 : 0) + (handicapPending ? 1 : 0) + (pendingFriendRequests > 0 ? 1 : 0) + activeQuickMatches.length;

  if (isLoading) {
    return (
      <motion.div
        {...getEntryProps(animateEntry)}
        variants={slideUp}
        className="px-4 mb-2"
      >
        <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5 animate-pulse">
          <div className="h-6 bg-amber-200/50 rounded w-48 mb-4" />
          <div className="space-y-3">
            <div className="h-10 bg-amber-200/30 rounded" />
            <div className="h-10 bg-amber-200/30 rounded" />
          </div>
        </div>
      </motion.div>
    );
  }

  if (totalItems === 0) return null;

  return (
    <motion.div
      {...getEntryProps(animateEntry)}
      variants={slideUp}
      className="px-4 mb-2"
      data-testid="pending-actions-card"
    >
      <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 bg-amber-500 rounded-lg">
            <Bell className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-lg font-bold text-amber-900">{t('pendingActions.title')}</h3>
        </div>

        <div className="space-y-3">
          {pendingInvitations > 0 && (
            <button
              onClick={() => navigate('/player/invitations')}
              className="flex items-center justify-between w-full p-3 bg-white/70 rounded-lg hover:bg-white transition-colors group"
              data-testid="pending-invitations-action"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Mail className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-900">{t('pendingActions.invitations')}</p>
                  <p className="text-xs text-gray-500">
                    {t('pendingActions.invitations', { count: pendingInvitations })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-full bg-blue-500 text-white text-xs font-bold">
                  {pendingInvitations}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </div>
            </button>
          )}

          {pendingFriendRequests > 0 && (
            <button
              onClick={() => navigate('/friends')}
              className="flex items-center justify-between w-full p-3 bg-white/70 rounded-lg hover:bg-white transition-colors group"
              data-testid="pending-friend-requests-action"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pink-100 rounded-lg">
                  <UserPlus className="w-4 h-4 text-pink-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-900">{t('pendingActions.friendRequests')}</p>
                  <p className="text-xs text-gray-500">
                    {t('pendingActions.friendRequestsDesc', { count: pendingFriendRequests })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-full bg-pink-500 text-white text-xs font-bold">
                  {pendingFriendRequests}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </div>
            </button>
          )}

          {activeQuickMatches.map((qm) => (
            <button
              key={qm.id}
              onClick={() => navigate(`/quick-matches/${qm.id}/scoring`)}
              className="flex items-center justify-between w-full p-3 bg-white/70 rounded-lg hover:bg-white transition-colors group"
              data-testid={`active-quick-match-${qm.id}`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <Zap className="w-4 h-4 text-primary-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-900">
                    {qm.name || t('pendingActions.quickMatchInProgress')}
                  </p>
                  <p className="text-xs text-gray-500">
                    {qm.name
                      ? t('pendingActions.quickMatchInProgress')
                      : t(
                          `pendingActions.quickMatchFormat.${qm.matchFormat ?? qm.scoringFormat}`,
                          qm.matchFormat ?? qm.scoringFormat
                        )}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </button>
          ))}

          {pendingEnrollments.map((enrollment) => (
            <button
              key={enrollment.competitionId}
              onClick={() => navigate(`/competitions/${enrollment.competitionId}`)}
              className="flex items-center justify-between w-full p-3 bg-white/70 rounded-lg hover:bg-white transition-colors group"
              data-testid="pending-enrollments-action"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-900">{t('pendingActions.enrollments')}</p>
                  <p className="text-xs text-gray-500">
                    {t('pendingActions.enrollments', { count: enrollment.count, name: enrollment.name })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-full bg-purple-500 text-white text-xs font-bold">
                  {enrollment.count}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </div>
            </button>
          ))}

          {upcomingMatches > 0 && (
            <button
              onClick={() => navigate('/player/matches')}
              className="flex items-center justify-between w-full p-3 bg-white/70 rounded-lg hover:bg-white transition-colors group"
              data-testid="upcoming-matches-action"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Flag className="w-4 h-4 text-green-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-900">{t('pendingActions.matches')}</p>
                  <p className="text-xs text-gray-500">
                    {t('pendingActions.matches', { count: upcomingMatches })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-full bg-green-500 text-white text-xs font-bold">
                  {upcomingMatches}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </div>
            </button>
          )}

          {handicapPending && (
            <button
              onClick={onHandicapAction}
              className="flex items-center justify-between w-full p-3 bg-white/70 rounded-lg hover:bg-white transition-colors group"
              data-testid="handicap-pending-action"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-900">{t('pendingActions.handicap')}</p>
                  <p className="text-xs text-gray-500">{t('pendingActions.handicapDesc')}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

async function loadPendingEnrollments(competitions) {
  if (!competitions || competitions.length === 0) return [];

  const createdCompetitions = competitions.filter(
    (c) => c.status === 'ACTIVE' || c.status === 'ENROLLING'
  );

  const results = await Promise.allSettled(
    createdCompetitions.map(async (comp) => {
      const enrollments = await listEnrollmentsUseCase.execute(comp.id, { status: 'REQUESTED' });
      return { competitionId: comp.id, name: comp.name, count: enrollments.length };
    })
  );

  return results
    .filter((r) => r.status === 'fulfilled' && r.value.count > 0)
    .map((r) => r.value);
}

export default PendingActionsCard;
