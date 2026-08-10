import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { Trophy, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import HeaderAuth from '../components/layout/HeaderAuth';
import ProfileCard from '../components/profile/ProfileCard';
import HandicapRequestModal from '../components/profile/HandicapRequestModal';
import EmailVerificationBanner from '../components/EmailVerificationBanner';
import PendingActionsCard from '../components/dashboard/PendingActionsCard';
import PlayerStatsCards from '../components/dashboard/PlayerStatsCards';
import CreateQuickMatchModal from '../components/quick_match/CreateQuickMatchModal';
import { useAuth } from '../hooks/useAuth';
import { useEntryMotion } from '../hooks/useEntryMotion';
import { slideUp, staggerContainer, getEntryProps } from '../utils/animations';
import { listUserCompetitionsUseCase, getPlayerStatsUseCase } from '../composition';

const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('dashboard');
  const { t: tQuickMatch } = useTranslation('quickMatch');
  const { user, loading: isLoadingUser, refetch: refetchUser } = useAuth();
  const { animateEntry } = useEntryMotion();
  const [competitions, setCompetitions] = useState([]);
  const [isLoadingCompetitions, setIsLoadingCompetitions] = useState(true);
  const [playerStats, setPlayerStats] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [showHandicapModal, setShowHandicapModal] = useState(false);
  const [showQuickMatchModal, setShowQuickMatchModal] = useState(false);
  const [handicapPending, setHandicapPending] = useState(
    () => typeof localStorage !== 'undefined' && localStorage.getItem('handicap_pending') === 'true'
  );

  useEffect(() => {
    if (user && localStorage.getItem('needs_handicap') === 'true') {
      localStorage.removeItem('needs_handicap');
      // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing pattern surfaced by eslint-plugin-react-hooks 7.1.1 bump; needs dedicated review (tracked in follow-up)
      setShowHandicapModal(true);
    }
  }, [user]);

  const handleHandicapSaved = useCallback(async () => {
    setShowHandicapModal(false);
    setHandicapPending(false);
    localStorage.removeItem('handicap_pending');
    await refetchUser();
  }, [refetchUser]);

  const handleHandicapDismiss = useCallback(() => {
    setShowHandicapModal(false);
    setHandicapPending(true);
    localStorage.setItem('handicap_pending', 'true');
  }, []);

  const handleQuickMatchStarted = useCallback((quickMatchId) => {
    setShowQuickMatchModal(false);
    navigate(`/quick-matches/${quickMatchId}/scoring`);
  }, [navigate]);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) {
        setIsLoadingCompetitions(false);
        return;
      }

      setIsLoadingCompetitions(true);
      try {

        // Fetch competitions using the same use case as My Competitions page
        // This ensures the count matches (user's competitions: created OR enrolled)
        const competitionsData = await listUserCompetitionsUseCase.execute(user.id);
        setCompetitions(Array.isArray(competitionsData) ? competitionsData : []);

      } catch (error) {
        console.error("Failed to load dashboard data:", error);
        setCompetitions([]);
      } finally {
        setIsLoadingCompetitions(false);
      }
    };

    loadDashboardData();
  }, [user]);

  useEffect(() => {
    // Las estadísticas van por su cuenta y no bloquean la página: son un
    // resumen, y si el backend tarda o falla, el resto del panel sigue siendo
    // útil. Un fallo deja las cifras en "--", que es lo mismo que enseña una
    // cuenta sin vueltas.
    // Son datos personales: si el usuario cambia mientras una petición está en
    // vuelo, la respuesta vieja no debe escribir nada. Sin este guardia podría
    // llegar después de la nueva y dejar en pantalla las cifras de otra cuenta
    let cancelled = false;

    const loadPlayerStats = async () => {
      if (!user) {
        setIsLoadingStats(false);
        return;
      }

      setIsLoadingStats(true);
      try {
        const stats = await getPlayerStatsUseCase.execute();
        if (!cancelled) {
          setPlayerStats(stats);
        }
      } catch (error) {
        console.error('Failed to load player stats:', error);
        if (!cancelled) {
          setPlayerStats(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingStats(false);
        }
      }
    };

    loadPlayerStats();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Only gate the full-page spinner on the initial load (no user yet).
  // Subsequent refetches (e.g. after saving handicap) shouldn't unmount the current UI.
  const isLoading = (isLoadingUser && !user) || isLoadingCompetitions;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common:loading')}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const firstName = user.first_name || 'User';

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-white">
      <HandicapRequestModal
        isOpen={showHandicapModal}
        user={user}
        onClose={handleHandicapDismiss}
        onSaved={handleHandicapSaved}
      />
      {showQuickMatchModal && (
        <CreateQuickMatchModal
          onClose={() => setShowQuickMatchModal(false)}
          onStarted={handleQuickMatchStarted}
          currentUser={user}
        />
      )}
      <div className="layout-container flex h-full grow flex-col">
        <HeaderAuth user={user} />

        <div className="px-4 md:px-40 flex flex-1 justify-center py-5">
          <motion.div
            {...getEntryProps(animateEntry)}
            variants={staggerContainer}
            className="layout-content-container flex flex-col max-w-[960px] flex-1"
          >
            {/* Welcome Message */}
            <motion.div
              variants={slideUp}
              className="flex flex-wrap justify-between gap-3 p-4"
            >
              <div>
                <p className="text-gray-900 tracking-tight text-3xl md:text-[32px] font-bold leading-tight">
                  {t('welcome', { name: firstName })}
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  {t('activitySummary')}
                </p>
              </div>
            </motion.div>

            {/* Email Verification Banner */}
            {user && !user.email_verified && (
              <div className="px-4">
                <EmailVerificationBanner userEmail={user.email} />
              </div>
            )}

            {/* Quick access: create a quick match */}
            <motion.div
              variants={slideUp}
              className="px-4 mb-2"
            >
              <button
                type="button"
                onClick={() => setShowQuickMatchModal(true)}
                data-testid="quick-match-cta"
                className="w-full flex items-center justify-between gap-3 rounded-xl border-2 border-primary-200 bg-gradient-to-r from-primary-50 to-blue-50 p-5 shadow-sm hover:shadow-md transition-shadow text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-primary-500 rounded-lg">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-primary-900">{tQuickMatch('dashboard.ctaTitle')}</p>
                    <p className="text-xs text-primary-700">{tQuickMatch('dashboard.ctaDesc')}</p>
                  </div>
                </div>
                <span className="flex-shrink-0 px-3 py-1.5 bg-primary-500 text-white text-xs font-semibold rounded-lg">
                  {tQuickMatch('dashboard.ctaButton')}
                </span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/quick-matches')}
                data-testid="quick-match-history-link"
                className="mt-1.5 text-xs text-primary-700 hover:text-primary-900 hover:underline"
              >
                {tQuickMatch('dashboard.viewHistory')}
              </button>
            </motion.div>

            {/* Pending Actions */}
            <PendingActionsCard
              user={user}
              competitions={competitions}
              handicapPending={handicapPending}
              onHandicapAction={() => setShowHandicapModal(true)}
            />

            {/* Statistics Cards */}
            <motion.div variants={slideUp} className="p-4">
              <PlayerStatsCards
                stats={playerStats}
                isLoading={isLoadingStats}
                fallbackHandicap={user.handicap ?? null}
                fallbackTournaments={Array.isArray(competitions) ? competitions.length : 0}
              />
            </motion.div>

            {/* Profile Card */}
            <ProfileCard user={user} />

            {/* Quick Actions */}
            <motion.div
              variants={slideUp}
              className="p-4 mt-4"
            >
              <h2 className="text-gray-900 text-xl font-bold mb-4">{t('quickActions.title')}</h2>
              {/* Dos, no seis: Mis Torneos, Explorar, Amigos y Perfil ya viven
                  en la navegacion, y repetirlos aqui convertia el panel en un
                  menu con otro aspecto */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Quick Match Card - primary action */}
                <motion.button
                  onClick={() => setShowQuickMatchModal(true)}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  data-testid="quick-match-card"
                  className="flex items-center gap-4 p-6 bg-primary-50 border-2 border-primary-500 rounded-xl hover:shadow-lg transition-all text-left group"
                >
                  <div className="p-3 bg-primary-500 rounded-lg">
                    <Zap className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-gray-900 font-bold text-lg group-hover:text-primary-600 transition-colors">
                      {t('quickActions.quickMatch')}
                    </h3>
                    <p className="text-gray-500 text-sm">{t('quickActions.quickMatchDesc')}</p>
                  </div>
                </motion.button>

                {/* Create Competition Card */}
                <motion.button
                  onClick={() => navigate('/competitions/create')}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-4 p-6 bg-white border-2 border-gray-200 rounded-xl hover:border-primary-500 hover:shadow-lg transition-all text-left group"
                >
                  <div className="p-3 bg-primary-100 rounded-lg group-hover:bg-primary-500 transition-colors">
                    <Trophy className="w-7 h-7 text-primary-600 group-hover:text-white transition-colors" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-gray-900 font-bold text-lg group-hover:text-primary-600 transition-colors">
                      {t('quickActions.createTournament')}
                    </h3>
                    <p className="text-gray-500 text-sm">{t('quickActions.createTournamentDesc')}</p>
                  </div>
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
