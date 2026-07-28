import { useTranslation } from 'react-i18next';
import StablefordCalculator from '../../domain/services/StablefordCalculator';

/**
 * Quick match classification: ranked by Stableford points (or net strokes for
 * Medal), no team columns — quick match is single-entry, individual. Split out
 * of the hole-by-hole scorecard so each lives in its own tab.
 */
const QuickMatchClassificationTable = ({
  holes = [],
  holeScores = [],
  participants = [],
  currentParticipantId,
  scoringFormat = null,
  tees = [],
  allowancePercentage = 100,
}) => {
  const { t } = useTranslation('quickMatch');

  const isMedal = scoringFormat === 'MEDAL';
  const ranking = isMedal
    ? StablefordCalculator.rankParticipantsByMedal(participants, holes, holeScores, tees, allowancePercentage)
    : StablefordCalculator.rankParticipants(participants, holes, holeScores, tees, allowancePercentage);

  return (
    <div data-testid="quick-match-classification-table" className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-gray-500">
            <th className="px-2 py-1.5 text-left font-medium">#</th>
            <th className="px-2 py-1.5 text-left font-medium">{t('scoring.classification.player')}</th>
            {isMedal ? (
              <th className="px-2 py-1.5 text-center font-medium">{t('scoring.classification.netStrokes')}</th>
            ) : (
              <th className="px-2 py-1.5 text-center font-medium">{t('scoring.classification.points')}</th>
            )}
            <th className="px-2 py-1.5 text-center font-medium">{t('scoring.classification.strokes')}</th>
          </tr>
        </thead>
        <tbody>
          {ranking.map((row, index) => (
            <tr
              key={row.participantId}
              className={row.participantId === currentParticipantId ? 'bg-blue-50' : index % 2 === 1 ? 'bg-gray-50' : ''}
            >
              <td className="px-2 py-1.5 text-left text-gray-500">{index + 1}</td>
              <td className="px-2 py-1.5 text-left font-medium text-gray-900">
                {row.name}
                {row.participantId === currentParticipantId && (
                  <span className="ml-1 text-xs text-primary">({t('scoring.classification.you')})</span>
                )}
              </td>
              {isMedal ? (
                <td className="px-2 py-1.5 text-center font-bold text-primary">{row.holesPlayed ? row.netStrokes : '-'}</td>
              ) : (
                <td className="px-2 py-1.5 text-center font-bold text-primary">{row.stablefordPoints}</td>
              )}
              <td className="px-2 py-1.5 text-center text-gray-700">{row.totalStrokes || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default QuickMatchClassificationTable;
