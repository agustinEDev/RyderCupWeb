import { useTranslation } from 'react-i18next';
import TeamStandingsHeader from './TeamStandingsHeader';

// Converts "5UP" at hole 14 → "5&4" (5 up with 4 to play).
// If match ended on hole 18, keeps "2UP" format.
const formatMatchPlayResult = (score, currentHole) => {
  const m = score?.match(/^(\d+)UP$/);
  if (m && currentHole && currentHole < 18) {
    return `${m[1]}&${18 - currentHole}`;
  }
  return score;
};

const LeaderboardView = ({ leaderboard }) => {
  const { t } = useTranslation('scoring');

  if (!leaderboard) return null;

  const inProgress = (leaderboard.matches || []).filter(m => m.status === 'IN_PROGRESS');
  const completed = (leaderboard.matches || []).filter(m => m.status !== 'IN_PROGRESS');

  const renderMatch = (match) => {
    const teamANames = match.teamAPlayers?.map(p => p.userName).join(' / ');
    const teamBNames = match.teamBPlayers?.map(p => p.userName).join(' / ');
    const teamAWon = match.result?.winner === 'A';
    const teamBWon = match.result?.winner === 'B';
    const isTeamALeading = match.leadingTeam === 'A';
    const isTeamBLeading = match.leadingTeam === 'B';
    const teamAHighlighted = isTeamALeading || teamAWon;
    const teamBHighlighted = isTeamBLeading || teamBWon;

    return (
      <div key={match.matchId} data-testid={`leaderboard-match-${match.matchId}`} className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-gray-500">
            #{match.matchNumber} - {match.matchFormat}
          </span>
          {match.status === 'IN_PROGRESS' && match.currentHole && (
            <span className="text-xs text-gray-500">{t('leaderboard.hole')} {match.currentHole}</span>
          )}
        </div>
        <div className="text-center space-y-1">
          <p className={`text-sm ${teamAHighlighted ? 'font-bold text-gray-900' : 'text-gray-600'}`}>
            {teamANames}
          </p>
          <div className="py-1">
            {match.standing ? (
              <span className="text-lg font-bold text-primary">
                {match.standing === 'AS' ? t('leaderboard.allSquare') : match.standing}
              </span>
            ) : match.result ? (
              <span className="text-lg font-bold text-primary">
                {match.status === 'CONCEDED' || match.result.score === 'CONCEDED'
                  ? t('leaderboard.conceded', {
                    team: match.result.winner === 'A' ? leaderboard.teamAName : leaderboard.teamBName,
                  })
                  : match.result.winner
                    ? t('leaderboard.wins', {
                      team: match.result.winner === 'A' ? leaderboard.teamAName : leaderboard.teamBName,
                      score: formatMatchPlayResult(match.result.score, match.currentHole),
                    })
                    : formatMatchPlayResult(match.result.score, match.currentHole)}
              </span>
            ) : (
              <span className="text-sm text-gray-400">-</span>
            )}
          </div>
          <p className={`text-sm ${teamBHighlighted ? 'font-bold text-gray-900' : 'text-gray-600'}`}>
            {teamBNames}
          </p>
        </div>
      </div>
    );
  };

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
