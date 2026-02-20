import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Loader } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import LeaderboardView from '../../components/scoring/LeaderboardView';
import { getLeaderboardUseCase } from '../../composition';

const POLL_INTERVAL = 30000; // 30 seconds

const LeaderboardPage = () => {
  const { id: competitionId } = useParams();
  const { t } = useTranslation('scoring');

  const [leaderboard, setLeaderboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    if (!competitionId) return;

    const fetchLeaderboard = async () => {
      try {
        const data = await getLeaderboardUseCase.execute(competitionId);
        setLeaderboard(data);
        setError(null);
      } catch (err) {
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('leaderboard.title')}</h1>

        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <Loader className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-gray-500">{t('loading')}</span>
          </div>
        )}

        {error && !isLoading && (
          <div className="text-center py-8">
            <p className="text-red-600">{error.message || t('errors.generic')}</p>
          </div>
        )}

        {!isLoading && !error && <LeaderboardView leaderboard={leaderboard} />}
      </main>

      <Footer />
    </div>
  );
};

export default LeaderboardPage;
