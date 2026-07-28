import { useTranslation } from 'react-i18next';
import GolfFigure from '../scoring/GolfFigure';
import StablefordCalculator from '../../domain/services/StablefordCalculator';

const MAX_STROKE_DOTS = 2;

/**
 * Quick match scorecard: the hole-by-hole grid (OUT/IN), no team columns or
 * validation icons — quick match is single-entry, individual. Small dots
 * under each score mark the holes where that participant receives (or, for a
 * plus handicap, gives back) a handicap stroke, using the same Playing
 * Handicap resolution as the classification tab.
 */
const QuickMatchScorecardTable = ({
  holes = [],
  holeScores = [],
  participants = [],
  currentParticipantId,
  tees = [],
  allowancePercentage = 100,
}) => {
  const { t } = useTranslation('quickMatch');
  const { t: ts } = useTranslation('scoring');

  const outHoles = holes.filter((h) => h.holeNumber <= 9);
  const inHoles = holes.filter((h) => h.holeNumber > 9);

  const strokesBasisByParticipantId = Object.fromEntries(
    participants.map((p) => [
      p.participantId,
      StablefordCalculator.resolveStrokesBasis(p, holes, tees, allowancePercentage),
    ])
  );

  const getScore = (holeNumber, participantId) => {
    const entry = holeScores.find((hs) => hs.holeNumber === holeNumber && hs.participantId === participantId);
    return entry ? entry.score : null;
  };

  const getStrokesReceived = (holeStrokeIndex, participantId) =>
    StablefordCalculator.allocateStrokes(strokesBasisByParticipantId[participantId], holeStrokeIndex);

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
              {sectionHoles.map((h) => {
                const strokesReceived = getStrokesReceived(h.strokeIndex, p.participantId);
                const dotCount = Math.min(Math.abs(strokesReceived), MAX_STROKE_DOTS);
                return (
                  <td key={h.holeNumber} className="px-1 py-1 text-center align-top">
                    <div className="flex flex-col items-center gap-0.5">
                      <GolfFigure score={getScore(h.holeNumber, p.participantId)} par={h.par} />
                      {dotCount > 0 && (
                        <div
                          className="flex gap-0.5"
                          data-testid="stroke-dots"
                          title={
                            strokesReceived > 0
                              ? t('scoring.scorecard.strokeReceived', { count: strokesReceived })
                              : t('scoring.scorecard.strokeGiven', { count: Math.abs(strokesReceived) })
                          }
                        >
                          {Array.from({ length: dotCount }).map((_, i) => (
                            <span
                              key={i}
                              className={`w-1.5 h-1.5 rounded-full ${strokesReceived > 0 ? 'bg-primary' : 'bg-amber-500'}`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                );
              })}
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
      {renderSection(outHoles, ts('scorecard.out'))}
      {inHoles.length > 0 && renderSection(inHoles, ts('scorecard.in'))}
    </div>
  );
};

export default QuickMatchScorecardTable;
