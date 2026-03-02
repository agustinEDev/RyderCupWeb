import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Loader, Flag, Calendar, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import HeaderAuth from '../../components/layout/HeaderAuth';
import { useAuth } from '../../hooks/useAuth';
import {
  listUserCompetitionsUseCase,
  getScheduleUseCase,
  listEnrollmentsUseCase,
} from '../../composition';

const UpcomingMatchesPage = () => {
  const { t } = useTranslation('dashboard');
  const { t: tSchedule } = useTranslation('schedule');
  const { user, loading: isLoadingUser } = useAuth();

  const [matches, setMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadMatches = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const competitions = await listUserCompetitionsUseCase.execute(user.id);
      const activeComps = (competitions || []).filter(
        (c) => c.status === 'IN_PROGRESS'
      );

      if (activeComps.length === 0) {
        setMatches([]);
        return;
      }

      const results = await Promise.allSettled(
        activeComps.map(async (comp) => {
          const [schedule, enrollments] = await Promise.all([
            getScheduleUseCase.execute(comp.id),
            listEnrollmentsUseCase.execute(comp.id),
          ]);

          const playerNameMap = new Map();
          (enrollments || []).forEach((e) => {
            if (e.userId && e.userName) {
              playerNameMap.set(e.userId, e.userName);
            }
          });

          const rounds = schedule?.rounds || [];
          const matchList = [];

          rounds.forEach((round) => {
            (round.matches || []).forEach((match) => {
              const isPlayerInMatch =
                (match.teamAPlayers || []).some((p) => p.userId === user.id) ||
                (match.teamBPlayers || []).some((p) => p.userId === user.id);

              if (isPlayerInMatch && (match.status === 'SCHEDULED' || match.status === 'IN_PROGRESS')) {
                matchList.push({
                  ...match,
                  competitionId: comp.id,
                  competitionName: comp.name,
                  roundDate: round.roundDate,
                  sessionType: round.sessionType,
                  matchFormat: round.matchFormat,
                  golfCourseName: round.golfCourseName,
                  teamAPlayerNames: (match.teamAPlayers || []).map(
                    (p) => playerNameMap.get(p.userId) || p.userId
                  ),
                  teamBPlayerNames: (match.teamBPlayers || []).map(
                    (p) => playerNameMap.get(p.userId) || p.userId
                  ),
                });
              }
            });
          });

          return matchList;
        })
      );

      const allMatches = results
        .filter((r) => r.status === 'fulfilled')
        .flatMap((r) => r.value);

      allMatches.sort((a, b) => {
        const dateCompare = (a.roundDate || '').localeCompare(b.roundDate || '');
        if (dateCompare !== 0) return dateCompare;
        const sessionOrder = { MORNING: 0, AFTERNOON: 1, EVENING: 2 };
        return (sessionOrder[a.sessionType] || 0) - (sessionOrder[b.sessionType] || 0);
      });

      setMatches(allMatches);
    } catch (error) {
      console.error('Error loading upcoming matches:', error);
      setMatches([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadMatches();
    }
  }, [user, loadMatches]);

  const formatDate = useCallback((dateStr) => {
      if (!dateStr) return '';
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  const isPageLoading = isLoadingUser || isLoading;

  if (isPageLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <HeaderAuth user={user} />
        <div className="flex items-center justify-center h-64">
          <Loader className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-gray-500">{t('upcomingMatches.loading')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderAuth user={user} />

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{t('upcomingMatches.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('upcomingMatches.subtitle')}</p>
        </div>

        {matches.length === 0 ? (
          <div className="text-center py-12">
            <Flag className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">{t('upcomingMatches.noMatches')}</p>
            <p className="text-sm text-gray-400 mt-1">{t('upcomingMatches.noMatchesDesc')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((match) => (
              <div
                key={match.id}
                className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm"
                data-testid="upcoming-match-card"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <Link
                      to={`/competitions/${match.competitionId}`}
                      className="text-sm font-semibold text-primary hover:underline"
                    >
                      {match.competitionName}
                    </Link>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatDate(match.roundDate)}</span>
                      <span className="text-gray-300">|</span>
                      <span>{tSchedule(`sessions.${match.sessionType}`, match.sessionType)}</span>
                      <span className="text-gray-300">|</span>
                      <span>{tSchedule(`formats.${match.matchFormat}`, match.matchFormat)}</span>
                    </div>
                    {match.golfCourseName && (
                      <p className="text-xs text-gray-400 mt-0.5">{match.golfCourseName}</p>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      match.status === 'IN_PROGRESS'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {tSchedule(`status.${match.status}`, match.status)}
                  </span>
                </div>

                <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <div className="flex-1 text-center">
                    <p className="text-xs text-gray-400 mb-1">{t('upcomingMatches.teamA')}</p>
                    <div className="space-y-0.5">
                      {match.teamAPlayerNames.map((name, i) => (
                        <p key={i} className="text-sm font-medium text-gray-900">{name}</p>
                      ))}
                    </div>
                  </div>
                  <div className="px-4 text-gray-400 font-bold text-sm">vs</div>
                  <div className="flex-1 text-center">
                    <p className="text-xs text-gray-400 mb-1">{t('upcomingMatches.teamB')}</p>
                    <div className="space-y-0.5">
                      {match.teamBPlayerNames.map((name, i) => (
                        <p key={i} className="text-sm font-medium text-gray-900">{name}</p>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-gray-400">
                    {t('upcomingMatches.matchNumber', { number: match.matchNumber })}
                  </p>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/competitions/${match.competitionId}/schedule`}
                      className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      {t('upcomingMatches.viewSchedule')}
                    </Link>
                    {match.status === 'IN_PROGRESS' && (
                      <Link
                        to={`/player/matches/${match.id}/scoring`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        <Play className="w-3 h-3" />
                        {t('upcomingMatches.scoreMatch')}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UpcomingMatchesPage;
