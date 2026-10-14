import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useLocation, Navigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import Header from '../../components/layout/Header';
import HeaderAuth from '../../components/layout/HeaderAuth';
import Footer from '../../components/layout/Footer';
import LeaderboardView from '../../components/scoring/LeaderboardView';
import { useAuth } from '../../hooks/useAuth';
import { getCompetitionDetailUseCase, getLeaderboardUseCase } from '../../composition';
import BlockLoader from '../../components/ui/BlockLoader';

const POLL_INTERVAL = 30000; // 30 seconds

const LeaderboardPage = () => {
  const { id: competitionId } = useParams();
  const { t } = useTranslation('scoring');
  const { user } = useAuth();
  const location = useLocation();

  // Dynamic back link based on where the user came from
  const from = location.state?.from;
  const backTo = from === 'detail'
    ? `/competitions/${competitionId}`
    : `/competitions/${competitionId}/schedule`;
  const backText = from === 'detail'
    ? t('summary.backToCompetition')
    : t('summary.backToSchedule');

  const [leaderboard, setLeaderboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  // Un Stableford o un Medal no tiene esta clasificación: la suya está en su
  // ficha. Un enlace guardado o compartido aquí acababa en el error del
  // servidor (QA de la release, 14 oct)
  const [esStrokePlay, setEsStrokePlay] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => {
    if (!competitionId) return;

    const fetchLeaderboard = async () => {
      try {
        const data = await getLeaderboardUseCase.execute(competitionId);
        setLeaderboard(data);
        setError(null);
      } catch (err) {
        if (err?.status === 400) {
          const competicion = await getCompetitionDetailUseCase.execute(competitionId).catch(() => null);
          if (competicion?.hasTeams === false) {
            setEsStrokePlay(true);
            return;
          }
        }
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();

    // Poll for updates if there are active matches
    pollRef.current = setInterval(fetchLeaderboard, POLL_INTERVAL);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [competitionId]);

  if (esStrokePlay) return <Navigate to={`/competitions/${competitionId}#clasificaciones`} replace />;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {user ? <HeaderAuth user={user} /> : <Header />}

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        <Link
          to={backTo}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-3"
        >
          &larr; {backText}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('leaderboard.title')}</h1>

        {isLoading && (
          <BlockLoader texto={t('loading')} />
        )}

        {error && !isLoading && (
          <div className="text-center py-8">
            <p className="text-red-600">{error.message || t('errors.generic')}</p>
          </div>
        )}

        {!isLoading && !error && <LeaderboardView leaderboard={leaderboard} />}
      </main>

      {!user && <Footer />}
    </div>
  );
};

export default LeaderboardPage;
