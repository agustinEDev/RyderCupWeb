import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Target, TrendingDown, TrendingUp, Minus, Flag, Award } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import HeaderAuth from '../components/layout/HeaderAuth';
import RecentMatches from '../components/dashboard/RecentMatches';
import { useAuth } from '../hooks/useAuth';
import { useEntryMotion } from '../hooks/useEntryMotion';
import { slideUp, staggerContainer, getEntryProps } from '../utils/animations';
import {
  getPlayerStatsUseCase,
  getRecentMatchesUseCase,
  getPlayerStatsByGolfCourseUseCase,
} from '../composition';
import FullScreenLoader from '../components/ui/FullScreenLoader';

/**
 * Las estadísticas completas del jugador (FE #306, fase 2).
 *
 * Vive en su propia página y no dentro del panel ni del perfil: el panel acaba
 * de adelgazar a propósito, y aquí caben las tres cosas que la vista pedía —
 * el resumen entero, el desglose por campo y el historial completo, que es el
 * "ver todas" que la lista del panel no tenía a dónde enlazar.
 *
 * **El índice estimado no es el oficial de la federación**: le falta el PCC y
 * los topes de la Regla 5.8. Se dice en la página, no solo en la API, porque
 * quien lo lee aquí es quien puede confundirlo con su hándicap real.
 */

const StatBlock = ({ icon: Icon, label, value, hint, testId }) => (
  <div
    data-testid={testId}
    className="rounded-xl border border-gray-200 bg-white p-4"
  >
    <div className="mb-1 flex items-center gap-2">
      <Icon className="h-4 w-4 text-gray-400" aria-hidden="true" />
      <span className="text-xs font-medium text-gray-500">{label}</span>
    </div>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
    {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
  </div>
);

const PlayerStatsPage = () => {
  const { t } = useTranslation('dashboard');
  const { user, loading: isLoadingUser } = useAuth();
  const { animateEntry } = useEntryMotion();

  const [globalStats, setGlobalStats] = useState(null);
  const [matches, setMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [courseStats, setCourseStats] = useState(null);
  const [isLoadingCourse, setIsLoadingCourse] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const [stats, history] = await Promise.all([
          getPlayerStatsUseCase.execute(),
          getRecentMatchesUseCase.execute(),
        ]);
        if (!cancelled) {
          setGlobalStats(stats);
          setMatches(history);
        }
      } catch (error) {
        console.error('Failed to load player statistics:', error);
        if (!cancelled) {
          setGlobalStats(null);
          setMatches([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
    // Se depende del id y no del objeto: un refetch del perfil devuelve un
    // `user` distinto que es la misma persona, y recargar entonces sería pedir
    // otra vez lo mismo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;

    const loadCourse = async () => {
      if (!selectedCourseId) {
        setCourseStats(null);
        return;
      }

      setIsLoadingCourse(true);
      try {
        const stats = await getPlayerStatsByGolfCourseUseCase.execute(selectedCourseId);
        if (!cancelled) {
          setCourseStats(stats);
        }
      } catch (error) {
        console.error('Failed to load golf course statistics:', error);
        if (!cancelled) {
          setCourseStats(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingCourse(false);
        }
      }
    };

    loadCourse();
    return () => {
      cancelled = true;
    };
  }, [selectedCourseId]);

  /**
   * Los campos donde ha jugado salen de su propio historial: no hay endpoint
   * que los liste, y tampoco haría falta — nadie puede tener estadísticas de un
   * campo donde no ha jugado.
   */
  const playedCourses = useMemo(() => {
    const byId = new Map();
    matches.forEach((match) => {
      if (match.golfCourseId && !byId.has(match.golfCourseId)) {
        byId.set(match.golfCourseId, match.golfCourseName || match.golfCourseId);
      }
    });
    return [...byId.entries()].map(([id, name]) => ({ id, name }));
  }, [matches]);

  const shown = selectedCourseId ? courseStats : globalStats;
  const format = (value, suffix = '') =>
    value === null || value === undefined ? '--' : `${value.toFixed(1)}${suffix}`;
  const formatToPar = (value) => {
    if (value === null || value === undefined) return '--';
    if (value === 0) return t('playerStats.levelPar');
    return value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1);
  };

  if (isLoadingUser && !user) {
    return (
      <FullScreenLoader />
    );
  }

  if (!user) {
    return null;
  }

  const trend = shown?.handicapTrend;
  const isSteady = trend === 0;
  const isImproving = shown?.isImproving?.() ?? false;
  const TrendIcon = isSteady ? Minus : isImproving ? TrendingDown : TrendingUp;

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-white">
      <div className="layout-container flex h-full grow flex-col">
        <HeaderAuth user={user} />

        <div className="flex flex-1 justify-center px-4 py-5 md:px-40">
          <motion.div
            {...getEntryProps(animateEntry)}
            variants={staggerContainer}
            className="layout-content-container flex max-w-[960px] flex-1 flex-col"
          >
            <motion.div variants={slideUp} className="p-4">
              <h1 className="hidden md:block text-3xl font-bold tracking-tight text-gray-900">
                {t('playerStats.title')}
              </h1>
              <p className="mt-1 text-sm text-gray-500">{t('playerStats.subtitle')}</p>
            </motion.div>

            {/* Selector de campo */}
            {playedCourses.length > 0 && (
              <motion.div variants={slideUp} className="px-4 pb-2">
                <div className="flex flex-wrap gap-2" data-testid="course-filter">
                  <button
                    type="button"
                    onClick={() => setSelectedCourseId(null)}
                    aria-pressed={selectedCourseId === null}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                      selectedCourseId === null
                        ? 'border-primary-500 bg-primary-500 text-white'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-primary-300'
                    }`}
                  >
                    {t('playerStats.allCourses')}
                  </button>
                  {playedCourses.map((course) => (
                    <button
                      key={course.id}
                      type="button"
                      onClick={() => setSelectedCourseId(course.id)}
                      aria-pressed={selectedCourseId === course.id}
                      data-testid={`course-filter-${course.id}`}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                        selectedCourseId === course.id
                          ? 'border-primary-500 bg-primary-500 text-white'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-primary-300'
                      }`}
                    >
                      {course.name}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Resumen */}
            <motion.div variants={slideUp} className="p-4">
              {isLoading || isLoadingCourse ? (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-busy="true">
                  {[0, 1, 2, 3].map((block) => (
                    <div key={block} className="h-24 animate-pulse rounded-xl bg-gray-100" />
                  ))}
                </div>
              ) : shown && shown.roundsPlayed > 0 ? (
                <>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <StatBlock
                      testId="stat-rounds"
                      icon={Flag}
                      label={t('playerStats.roundsPlayed')}
                      value={shown.roundsPlayed}
                    />
                    <StatBlock
                      testId="stat-scoring-avg"
                      icon={Target}
                      label={t('playerStats.scoringAvg')}
                      value={formatToPar(shown.scoringAvg)}
                      hint={t('playerStats.scoringAvgHint')}
                    />
                    <StatBlock
                      testId="stat-playing-avg"
                      icon={TrendIcon}
                      label={t('playerStats.playingAverage')}
                      value={format(shown.playingAvg)}
                      hint={
                        shown.hasPlayingAverage()
                          ? t('playerStats.overRounds', { count: shown.roundsWithDifferential })
                          : t('playerStats.needsMoreRounds')
                      }
                    />
                    <StatBlock
                      testId="stat-best"
                      icon={Award}
                      label={t('playerStats.bestRound')}
                      value={format(shown.bestDifferential)}
                    />
                  </div>

                  {shown.hasRoundsWithoutDifferential() && (
                    <p
                      data-testid="rounds-without-tee-note"
                      className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800"
                    >
                      {/* Con cero computadas no está "calculado sobre 0": es
                          que no se pudo calcular, y decirlo de otra forma
                          suena a que el número existe pero sale mal */}
                      {shown.roundsWithDifferential === 0
                        ? t('playerStats.noRoundsWithTee', { count: shown.roundsPlayed })
                        : t('playerStats.roundsWithoutTee', {
                            counted: shown.roundsWithDifferential,
                            count: shown.roundsPlayed,
                          })}
                    </p>
                  )}

                  {/* El índice se saca del resumen y se explica aparte: mira
                      solo las mejores vueltas, así que sin contexto se lee como
                      el nivel al que se está jugando, que es otra cosa */}
                  <div
                    data-testid="estimated-index-block"
                    className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-semibold text-gray-900">
                        {t('playerStats.estimatedIndex')}
                      </span>
                      <span className="text-2xl font-bold text-gray-900">
                        {format(shown.estimatedIndex)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {shown.hasEstimatedIndex()
                        ? t('playerStats.estimatedIndexExplained')
                        : t('playerStats.needsMoreRounds')}
                    </p>
                    <p className="mt-2 text-xs text-gray-400">{t('playerStats.notOfficial')}</p>
                  </div>
                </>
              ) : (
                <div
                  data-testid="player-stats-empty"
                  className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center"
                >
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedCourseId
                      ? t('playerStats.emptyCourseTitle')
                      : t('playerStats.emptyTitle')}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {selectedCourseId
                      ? t('playerStats.emptyCourseDescription')
                      : t('playerStats.emptyDescription')}
                  </p>
                </div>
              )}
            </motion.div>

            {/* Historial completo: el "ver todas" que la lista del panel no tenía */}
            <motion.div variants={slideUp} className="p-4">
              <RecentMatches
                matches={matches}
                isLoading={isLoading}
                titleKey="playerStats.historyTitle"
              />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default PlayerStatsPage;
