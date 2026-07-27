import { useTranslation } from 'react-i18next';
import GolfFigure from '../scoring/GolfFigure';
import StablefordCalculator from '../../domain/services/StablefordCalculator';

/**
 * Quick match scorecard: a Stableford classification (points + gross strokes,
 * ranked highest points first) plus the hole-by-hole grid. No team columns,
 * net scores or validation icons — quick match is single-entry, individual.
 */
const QuickMatchScorecardTable = ({ holes = [], holeScores = [], participants = [], currentParticipantId }) => {
  const { t } = useTranslation('quickMatch');
  const { t: ts } = useTranslation('scoring');

  const outHoles = holes.filter((h) => h.holeNumber <= 9);
  const inHoles = holes.filter((h) => h.holeNumber > 9);

  const ranking = StablefordCalculator.rankParticipants(participants, holes, holeScores);

  const getScore = (holeNumber, participantId) => {
    const entry = holeScores.find((hs) => hs.holeNumber === holeNumber && hs.participantId === participantId);
    return entry ? entry.score : null;
  };

  const sumStrokes = (holeRange, participantId) =>
    holeRange.reduce((sum, h) => {
      const score = getScore(h.holeNumber, participantId);
      return score != null ? sum + score : sum;
    }, 0);

  const renderSection = (sectionHoles, label) => (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-2 py-1 text-left font-medium text-gray-500">{ts('scorecard.hole')}</th>
            {sectionHoles.map((h) => (
              <th key={h.holeNumber} className="px-2 py-1 text-center font-medium text-gray-500 w-8">
                {h.holeNumber}
              </th>
            ))}
            <th className="px-2 py-1 text-center font-bold text-gray-700">{label}</th>
          </tr>
          <tr className="bg-gray-50">
            <th scope="row" className="px-2 py-1 text-left text-gray-400 font-normal">{ts('scorecard.par')}</th>
            {sectionHoles.map((h) => (
              <th key={h.holeNumber} scope="col" className="px-2 py-1 text-center text-gray-400 font-normal">
                {h.par}
              </th>
            ))}
            <th scope="col" className="px-2 py-1 text-center font-medium text-gray-500">
              {sectionHoles.reduce((s, h) => s + h.par, 0)}
            </th>
          </tr>
        </thead>
        <tbody>
          {participants.map((p) => (
            <tr key={p.participantId} className={p.participantId === currentParticipantId ? 'bg-blue-50' : ''}>
              <td className="px-2 py-1.5 text-left font-medium text-gray-700 truncate max-w-[100px]">{p.name}</td>
              {sectionHoles.map((h) => (
                <td key={h.holeNumber} className="px-1 py-1 text-center">
                  <GolfFigure score={getScore(h.holeNumber, p.participantId)} par={h.par} />
                </td>
              ))}
              <td className="px-2 py-1 text-center font-bold">
                {sumStrokes(sectionHoles, p.participantId) || '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div data-testid="quick-match-scorecard-table" className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-gray-900 mb-2">{t('scoring.classification.title')}</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm" data-testid="quick-match-classification-table">
            <thead>
              <tr className="bg-gray-50 text-gray-500">
                <th className="px-2 py-1.5 text-left font-medium">#</th>
                <th className="px-2 py-1.5 text-left font-medium">{t('scoring.classification.player')}</th>
                <th className="px-2 py-1.5 text-center font-medium">{t('scoring.classification.points')}</th>
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
                  <td className="px-2 py-1.5 text-center font-bold text-primary">{row.stablefordPoints}</td>
                  <td className="px-2 py-1.5 text-center text-gray-700">{row.totalStrokes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {renderSection(outHoles, ts('scorecard.out'))}
      {inHoles.length > 0 && renderSection(inHoles, ts('scorecard.in'))}
    </div>
  );
};

export default QuickMatchScorecardTable;
