import { useTranslation } from 'react-i18next';

const TeamStandingsHeader = ({ teamAName, teamBName, teamAPoints, teamBPoints }) => {
  const { t } = useTranslation('scoring');

  return (
    <div data-testid="team-standings-header" className="flex items-center justify-center gap-6 py-4">
      <div className="text-center">
        <p className="text-sm font-medium text-gray-600 truncate max-w-[120px]">{teamAName}</p>
        <p className="text-4xl font-bold text-gray-900">{teamAPoints ?? 0}</p>
        <p className="text-xs text-gray-500">{t('leaderboard.points')}</p>
      </div>
      <div className="text-lg font-light text-gray-400">vs</div>
      <div className="text-center">
        <p className="text-sm font-medium text-gray-600 truncate max-w-[120px]">{teamBName}</p>
        <p className="text-4xl font-bold text-gray-900">{teamBPoints ?? 0}</p>
        <p className="text-xs text-gray-500">{t('leaderboard.points')}</p>
      </div>
    </div>
  );
};

export default TeamStandingsHeader;
