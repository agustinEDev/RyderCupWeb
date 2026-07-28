import { useTranslation } from 'react-i18next';
import GolfFigure from '../scoring/GolfFigure';
import StablefordCalculator from '../../domain/services/StablefordCalculator';

const MAX_STROKE_DOTS = 2;

/**
 * Quick match scorecard: one card per participant (instead of a single shared
 * table with every player as a row) so reviewing several cards side by side
 * isn't a wall of numbers. Each card has its own hole-by-hole grid (OUT/IN),
 * no team columns or validation icons — quick match is single-entry,
 * individual. Small dots under each score mark the holes where that
 * participant receives (or, for a plus handicap, gives back) a handicap
 * stroke, using the same Playing Handicap resolution as the classification
 * tab. In free-play matches, each hole also shows the Stableford points
 * earned (STABLEFORD) or the net strokes played (MEDAL).
 */
const QuickMatchScorecardTable = ({
  holes = [],
  holeScores = [],
  participants = [],
  currentParticipantId,
  tees = [],
  allowancePercentage = 100,
  scoringFormat = null,
}) => {
  const { t } = useTranslation('quickMatch');
  const { t: ts } = useTranslation('scoring');

  const outHoles = holes.filter((h) => h.holeNumber <= 9);
  const inHoles = holes.filter((h) => h.holeNumber > 9);

  const isStableford = scoringFormat === 'STABLEFORD';
  const isMedal = scoringFormat === 'MEDAL';

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

  const renderSection = (sectionHoles, label, participantId) => (
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
          <tr>
            <th scope="row" className="px-2 py-1.5 text-left font-medium text-gray-400 sr-only">
              {label}
            </th>
            {sectionHoles.map((h) => {
              const score = getScore(h.holeNumber, participantId);
              const strokesReceived = getStrokesReceived(h.strokeIndex, participantId);
              const dotCount = Math.min(Math.abs(strokesReceived), MAX_STROKE_DOTS);
              return (
                <td key={h.holeNumber} className="px-1 py-1 text-center align-top">
                  <div className="flex flex-col items-center gap-0.5">
                    <GolfFigure score={score} par={h.par} />
                    {score != null && isStableford && (
                      <span
                        data-testid="hole-points"
                        className="text-[10px] font-semibold text-primary"
                        title={t('scoring.scorecard.holePoints', {
                          count: StablefordCalculator.holePoints(score, h.par, strokesReceived),
                        })}
                      >
                        {StablefordCalculator.holePoints(score, h.par, strokesReceived)}
                      </span>
                    )}
                    {score != null && isMedal && (
                      <span
                        data-testid="hole-net-strokes"
                        className="text-[10px] font-semibold text-primary"
                        title={t('scoring.scorecard.holeNetStrokes', { count: score - strokesReceived })}
                      >
                        {score - strokesReceived}
                      </span>
                    )}
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
              {sumStrokes(sectionHoles, participantId) || '-'}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  return (
    <div data-testid="quick-match-scorecard-table" className="space-y-3">
      {participants.map((p) => (
        <div
          key={p.participantId}
          data-testid={`quick-match-player-card-${p.participantId}`}
          className={`rounded-lg border overflow-hidden ${
            p.participantId === currentParticipantId ? 'border-primary/40 bg-blue-50/30' : 'border-gray-200'
          }`}
        >
          <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200">
            <span className="text-sm font-semibold text-gray-800">
              {p.name}
              {p.participantId === currentParticipantId && (
                <span className="ml-1.5 text-xs font-normal text-primary">
                  ({t('scoring.classification.you')})
                </span>
              )}
            </span>
          </div>
          <div className="p-2 space-y-2">
            {renderSection(outHoles, ts('scorecard.out'), p.participantId)}
            {inHoles.length > 0 && renderSection(inHoles, ts('scorecard.in'), p.participantId)}
          </div>
        </div>
      ))}
    </div>
  );
};

export default QuickMatchScorecardTable;
