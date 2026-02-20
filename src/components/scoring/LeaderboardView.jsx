import { useTranslation } from 'react-i18next';
import TeamStandingsHeader from './TeamStandingsHeader';

const LeaderboardView = ({ leaderboard }) => {
  const { t } = useTranslation('scoring');

  if (!leaderboard) return null;

  const inProgress = (leaderboard.matches || []).filter(m => m.status === 'IN_PROGRESS');
  const completed = (leaderboard.matches || []).filter(m => m.status !== 'IN_PROGRESS');

  const renderMatch = (match) => (
    <div key={match.matchId} data-testid={`leaderboard-match-${match.matchId}`} className="bg-white rounded-lg border border-gray-200 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500">
          #{match.matchNumber} - {match.matchFormat}
        </span>
        {match.status === 'IN_PROGRESS' && match.currentHole && (
          <span className="text-xs text-gray-500">{t('leaderboard.hole')} {match.currentHole}</span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">
            {match.teamAPlayers?.map(p => p.userName).join(' / ')}
          </p>
        </div>
        <div className="text-center px-3">
          {match.standing ? (
            <span className="text-sm font-bold text-primary">
              {match.standing === 'AS' ? t('leaderboard.allSquare') : `${match.standing} ${match.leadingTeam}`}
            </span>
          ) : match.result ? (
            <span className="text-sm font-bold">
              {match.result.score}
            </span>
          ) : (
            <span className="text-xs text-gray-400">-</span>
          )}
        </div>
        <div className="flex-1 text-right">
          <p className="text-sm font-medium text-gray-900">
            {match.teamBPlayers?.map(p => p.userName).join(' / ')}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div data-testid="leaderboard-view" className="space-y-6">
      <TeamStandingsHeader
        teamAName={leaderboard.teamAName}
        teamBName={leaderboard.teamBName}
        teamAPoints={leaderboard.teamAPoints}
        teamBPoints={leaderboard.teamBPoints}
      />

      {inProgress.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">{t('leaderboard.inProgress')}</h3>
          <div className="space-y-2">{inProgress.map(renderMatch)}</div>
        </div>
      )}

      {completed.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">{t('leaderboard.completed')}</h3>
          <div className="space-y-2">{completed.map(renderMatch)}</div>
        </div>
      )}

      {inProgress.length === 0 && completed.length === 0 && (
        <p className="text-center text-gray-500 py-4">{t('leaderboard.noMatches')}</p>
      )}
    </div>
  );
};

export default LeaderboardView;
