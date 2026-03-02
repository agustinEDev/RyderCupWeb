import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Users, Flag, ChevronRight, Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  listMyInvitationsUseCase,
  listEnrollmentsUseCase,
  getScheduleUseCase,
} from '../../composition';

const PendingActionsCard = ({ user, competitions }) => {
  const navigate = useNavigate();
  const { t } = useTranslation('dashboard');
  const [pendingInvitations, setPendingInvitations] = useState(0);
  const [pendingEnrollments, setPendingEnrollments] = useState([]);
  const [upcomingMatches, setUpcomingMatches] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const isCreator = useMemo(() => user?.is_admin ||
    (user?.roles && Array.isArray(user.roles) &&
      user.roles.some(r => (typeof r === 'string' ? r : r.name) === 'CREATOR' || (typeof r === 'string' ? r : r.name) === 'ADMIN')), [user]);

  useEffect(() => {
    if (!user) return;

    const loadPendingData = async () => {
      setIsLoading(true);
      try {
        const results = await Promise.allSettled([
          listMyInvitationsUseCase.execute({ status: 'PENDING' }),
          isCreator ? loadPendingEnrollments(competitions) : Promise.resolve([]),
          loadUpcomingMatches(competitions, user.id),
        ]);

        if (results[0].status === 'fulfilled') {
          const invitations = results[0].value?.invitations;
          setPendingInvitations(Array.isArray(invitations) ? invitations.length : 0);
        }
        if (results[1].status === 'fulfilled') {
          setPendingEnrollments(results[1].value);
        }
        if (results[2].status === 'fulfilled') {
          setUpcomingMatches(results[2].value);
        }
      } catch (error) {
        console.error('Error loading pending actions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPendingData();
  }, [user, competitions, isCreator]);

  const totalItems = pendingInvitations + pendingEnrollments.length + (upcomingMatches > 0 ? 1 : 0);

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05 }}
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.05 }}
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

async function loadUpcomingMatches(competitions, userId) {
  if (!competitions || competitions.length === 0) return 0;

  const activeCompetitions = competitions.filter(
    (c) => c.status === 'IN_PROGRESS'
  );

  const results = await Promise.allSettled(
    activeCompetitions.map(async (comp) => {
      const schedule = await getScheduleUseCase.execute(comp.id);
      const rounds = schedule?.rounds || [];
      return rounds.reduce((total, round) => {
        const active = (round.matches || []).filter(
          (m) =>
            (m.status === 'SCHEDULED' || m.status === 'IN_PROGRESS') &&
            ((m.teamAPlayers || []).some((p) => p.userId === userId) ||
              (m.teamBPlayers || []).some((p) => p.userId === userId))
        );
        return total + active.length;
      }, 0);
    })
  );

  return results
    .filter((r) => r.status === 'fulfilled')
    .reduce((total, r) => total + r.value, 0);
}

export default PendingActionsCard;
