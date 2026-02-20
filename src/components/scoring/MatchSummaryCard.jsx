import { useTranslation } from 'react-i18next';

const MatchSummaryCard = ({ summary }) => {
  const { t } = useTranslation('scoring');

  if (!summary) return null;

  return (
    <div data-testid="match-summary-card" className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
      <h2 className="text-xl font-bold text-gray-900">{t('summary.title')}</h2>

      {summary.result && (
        <div className="text-center py-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500">{t('summary.result')}</p>
          <p className="text-3xl font-bold text-primary mt-1">
            {summary.result.score}
          </p>
          {summary.result.winner && (
            <p className="text-sm text-gray-600 mt-1">
              {t('leaderboard.title')}: {summary.result.winner}
            </p>
          )}
        </div>
      )}

      {summary.stats && (
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-2 bg-gray-50 rounded">
            <p className="text-xs text-gray-500">{t('summary.grossTotal')}</p>
            <p className="text-lg font-bold">{summary.stats.playerGrossTotal}</p>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded">
            <p className="text-xs text-gray-500">{t('summary.netTotal')}</p>
            <p className="text-lg font-bold">{summary.stats.playerNetTotal}</p>
          </div>
          <div className="text-center p-2 bg-green-50 rounded">
            <p className="text-xs text-gray-500">{t('summary.holesWon')}</p>
            <p className="text-lg font-bold text-green-700">{summary.stats.holesWon}</p>
          </div>
          <div className="text-center p-2 bg-red-50 rounded">
            <p className="text-xs text-gray-500">{t('summary.holesLost')}</p>
            <p className="text-lg font-bold text-red-700">{summary.stats.holesLost}</p>
          </div>
        </div>
      )}

      {summary.matchComplete ? (
        <p className="text-center text-sm font-medium text-green-600">{t('summary.matchComplete')}</p>
      ) : (
        <p className="text-center text-sm text-gray-500">{t('summary.waitingForOthers')}</p>
      )}
    </div>
  );
};

export default MatchSummaryCard;
