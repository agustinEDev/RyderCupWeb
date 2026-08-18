import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Loader, Zap, ChevronRight, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import HeaderAuth from '../../components/layout/HeaderAuth';
import { useAuth } from '../../hooks/useAuth';
import {
  listMyQuickMatchesUseCase,
  getQuickMatchUseCase,
  getGolfCourseUseCase,
  hideQuickMatchUseCase,
} from '../../composition';
import PersonalRoundCalculator from '../../domain/services/PersonalRoundCalculator';
import customToast from '../../utils/toast';

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
  // Un Set y no un único id: si se ocultan dos partidas seguidas, la primera en
  // responder no debe reactivar el botón de la que sigue en vuelo.
  const [hidingIds, setHidingIds] = useState(() => new Set());

  // Quitar la partida del historial propio. No borra nada ni afecta a lo que
  // ven los demás participantes: cada uno la oculta solo para sí mismo.
  const handleHide = async (quickMatchId) => {
    setHidingIds((prev) => new Set(prev).add(quickMatchId));
    try {
      await hideQuickMatchUseCase.execute(quickMatchId);
      setQuickMatches((prev) => prev.filter((qm) => qm.id !== quickMatchId));
      customToast.success(t('history.hidden'));
    } catch {
      customToast.error(t('history.hideError'));
    } finally {
      setHidingIds((prev) => {
        const next = new Set(prev);
        next.delete(quickMatchId);
        return next;
      });
    }
  };

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
      // En foursomes se juega a golpes alternos con una sola bola: lo anotado
      // es del equipo, así que no hay vuelta propia que enseñar.
      if (qm.matchFormat === 'FOURSOMES') return null;
      try {
        const [detail, course] = await Promise.all([
          getQuickMatchUseCase.execute(qm.id),
          loadCourse(qm.golfCourseId),
        ]);
        const myParticipant = detail.participants.find((p) => p.userId === user.id);
        if (!myParticipant) return null;

        // Las dos lecturas de la vuelta, calculadas en un solo sitio para que
        // esta tarjeta y la pestaña de clasificación no puedan dar números
        // distintos para la misma vuelta, que es lo que pasaba.
        return PersonalRoundCalculator.compute({
          me: myParticipant,
          participants: detail.participants ?? [],
          holes: course.holes || [],
          holeScores: detail.holeScores || [],
          tees: course.tees || [],
          participantStrokes: detail.participantStrokes ?? [],
          matchFormat: qm.matchFormat,
          allowancePercentage: detail.effectiveAllowance,
          playMode: detail.playMode,
        });
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
          className="hidden md:inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-3"
        >
          &larr; {t('scoring.backToDashboard')}
        </button>

        <h1 className="hidden md:block text-xl font-bold text-gray-900 mb-4">{t('history.title')}</h1>

        {error && (
          <p className="text-sm text-red-600 mb-4">{error.message || t('scoring.errors.generic')}</p>
        )}

        {quickMatches.length === 0 ? (
          <p className="text-sm text-gray-500">{t('history.empty')}</p>
        ) : (
          <ul className="space-y-2" data-testid="quick-match-history-list">
            {quickMatches.map((qm) => (
              // El botón de quitar es hermano del de navegar, no hijo: anidar
              // botones es HTML inválido y rompe la navegación por teclado.
              <li
                key={qm.id}
                className="flex items-stretch bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-primary-300 hover:shadow-sm transition-all"
              >
                <button
                  onClick={() => navigate(`/quick-matches/${qm.id}/scoring`)}
                  data-testid={`quick-match-history-item-${qm.id}`}
                  className="flex-1 min-w-0 flex items-center justify-between p-4 text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-primary-100 rounded-lg flex-shrink-0">
                      <Zap className="w-4 h-4 text-primary-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {qm.name || t(`history.format.${qm.matchFormat ?? qm.scoringFormat}`, qm.matchFormat ?? qm.scoringFormat)}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {qm.name && `${t(`history.format.${qm.matchFormat ?? qm.scoringFormat}`, qm.matchFormat ?? qm.scoringFormat)} · `}
                        {new Date(qm.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {resultsByMatchId[qm.id] && (
                      <div className="text-right" data-testid={`quick-match-result-${qm.id}`}>
                        <p className="text-sm font-bold text-gray-900">
                          {resultsByMatchId[qm.id].personalToPar}
                          {resultsByMatchId[qm.id].matchToPar && (
                            <span
                              className="ml-1 text-[10px] font-normal text-gray-500"
                              data-testid={`quick-match-result-in-match-${qm.id}`}
                            >
                              {t('personalRound.inMatch', { value: resultsByMatchId[qm.id].matchToPar })}
                            </span>
                          )}
                        </p>
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
                <button
                  onClick={() => handleHide(qm.id)}
                  disabled={hidingIds.has(qm.id)}
                  aria-label={t('history.hide')}
                  title={t('history.hide')}
                  data-testid={`quick-match-hide-${qm.id}`}
                  className="px-3 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 border-l border-gray-100 transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                >
                  <Trash2 className="w-4 h-4" />
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
