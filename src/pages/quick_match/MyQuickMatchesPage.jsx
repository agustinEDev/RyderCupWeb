import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Loader, Zap, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import HeaderAuth from '../../components/layout/HeaderAuth';
import { useAuth } from '../../hooks/useAuth';
import { listMyQuickMatchesUseCase, getQuickMatchUseCase, getGolfCourseUseCase } from '../../composition';
import StablefordCalculator from '../../domain/services/StablefordCalculator';

const STATUS_STYLES = {
  PENDING: 'bg-amber-100 text-amber-800',
  IN_PROGRESS: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-gray-100 text-gray-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const MyQuickMatchesPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('quickMatch');
  const { user, loading: isLoadingUser } = useAuth();

  const [quickMatches, setQuickMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resultsByMatchId, setResultsByMatchId] = useState({});

  useEffect(() => {
    if (!user) return;

    listMyQuickMatchesUseCase
      .execute({ page: 1, limit: 50 })
      .then((result) => setQuickMatches(result.quickMatches))
      .catch((err) => setError(err))
      .finally(() => setIsLoading(false));
  }, [user]);

  // For each finished quick match, compute the current user's own result
  // (net-to-par + gross strokes) shown on its card. The list endpoint doesn't
  // carry hole scores, so this fetches match detail + course per finished
  // match (course lookups deduplicated), same approach the scoring page uses.
  useEffect(() => {
    const completedMatches = quickMatches.filter((qm) => qm.status === 'COMPLETED');
    if (!user || completedMatches.length === 0) return;

    let cancelled = false;
    const courseCache = new Map();
    const loadCourse = (golfCourseId) => {
      if (!courseCache.has(golfCourseId)) {
        courseCache.set(golfCourseId, getGolfCourseUseCase.execute(golfCourseId));
      }
      return courseCache.get(golfCourseId);
    };

    const loadResult = async (qm) => {
      try {
        const [detail, course] = await Promise.all([
          getQuickMatchUseCase.execute(qm.id),
          loadCourse(qm.golfCourseId),
        ]);
        const myParticipant = detail.participants.find((p) => p.userId === user.id);
        if (!myParticipant) return null;

        const totals = StablefordCalculator.computeParticipantTotals(
          myParticipant,
          course.holes || [],
          detail.holeScores || [],
          course.tees || [],
          detail.effectiveAllowance ?? 100
        );
        if (totals.holesPlayed === 0) return null;

        return {
          toParLabel: StablefordCalculator.formatToPar(totals.netStrokes - totals.parPlayed),
          totalStrokes: totals.totalStrokes,
        };
      } catch {
        return null;
      }
    };

    Promise.all(completedMatches.map((qm) => loadResult(qm).then((result) => [qm.id, result]))).then(
      (entries) => {
        if (cancelled) return;
        const next = {};
        for (const [id, result] of entries) {
          if (result) next[id] = result;
        }
        setResultsByMatchId(next);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [quickMatches, user]);

  if (isLoadingUser || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <HeaderAuth user={user} />
        <div className="flex items-center justify-center h-64">
          <Loader className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderAuth user={user} />

      <div className="max-w-2xl mx-auto px-4 py-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-3"
        >
          &larr; {t('scoring.backToDashboard')}
        </button>

        <h1 className="text-xl font-bold text-gray-900 mb-4">{t('history.title')}</h1>

        {error && (
          <p className="text-sm text-red-600 mb-4">{error.message || t('scoring.errors.generic')}</p>
        )}

        {quickMatches.length === 0 ? (
          <p className="text-sm text-gray-500">{t('history.empty')}</p>
        ) : (
          <ul className="space-y-2" data-testid="quick-match-history-list">
            {quickMatches.map((qm) => (
              <li key={qm.id}>
                <button
                  onClick={() => navigate(`/quick-matches/${qm.id}/scoring`)}
                  data-testid={`quick-match-history-item-${qm.id}`}
                  className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-primary-300 hover:shadow-sm transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-100 rounded-lg">
                      <Zap className="w-4 h-4 text-primary-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {qm.name || t(`history.format.${qm.matchFormat ?? qm.scoringFormat}`, qm.matchFormat ?? qm.scoringFormat)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {qm.name && `${t(`history.format.${qm.matchFormat ?? qm.scoringFormat}`, qm.matchFormat ?? qm.scoringFormat)} · `}
                        {new Date(qm.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {resultsByMatchId[qm.id] && (
                      <div className="text-right" data-testid={`quick-match-result-${qm.id}`}>
                        <p className="text-sm font-bold text-gray-900">{resultsByMatchId[qm.id].toParLabel}</p>
                        <p className="text-[10px] text-gray-500">
                          {t('history.grossStrokes', { count: resultsByMatchId[qm.id].totalStrokes })}
                        </p>
                      </div>
                    )}
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_STYLES[qm.status] ?? 'bg-gray-100 text-gray-700'}`}>
                      {t(`history.status.${qm.status}`, qm.status)}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default MyQuickMatchesPage;
