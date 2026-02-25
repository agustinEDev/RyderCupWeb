import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import GolfFigure from './GolfFigure';
import ValidationIcon from './ValidationIcon';

const ScorecardTable = ({ holes = [], scores = [], players = [], currentUserId, teamAName, teamBName }) => {
  const { t } = useTranslation('scoring');
  const [showNet, setShowNet] = useState(false);

  const outHoles = holes.filter(h => h.holeNumber <= 9);
  const inHoles = holes.filter(h => h.holeNumber > 9);

  const getPlayerScore = (holeNumber, userId) => {
    const holeData = scores.find(s => s.holeNumber === holeNumber);
    if (!holeData) return null;
    return holeData.playerScores?.find(ps => ps.userId === userId) || null;
  };

  const getHoleResult = (holeNumber) => {
    const holeData = scores.find(s => s.holeNumber === holeNumber);
    return holeData?.holeResult || null;
  };

  const sumScores = (holeRange, userId) => {
    return holeRange.reduce((sum, h) => {
      const ps = getPlayerScore(h.holeNumber, userId);
      const val = showNet ? (ps?.netScore ?? ps?.ownScore) : ps?.ownScore;
      return val !== null && val !== undefined ? sum + val : sum;
    }, 0);
  };

  const hasAnyStrokes = players.some(p => p.strokesReceived?.length > 0);

  const renderSection = (sectionHoles, label) => (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-2 py-1 text-left font-medium text-gray-500">{t('scorecard.hole')}</th>
            {sectionHoles.map(h => (
              <th key={h.holeNumber} className="px-2 py-1 text-center font-medium text-gray-500 w-8">{h.holeNumber}</th>
            ))}
            <th className="px-2 py-1 text-center font-bold text-gray-700">{label}</th>
          </tr>
          <tr className="bg-gray-50">
            <th scope="row" className="px-2 py-1 text-left text-gray-400 font-normal">{t('scorecard.par')}</th>
            {sectionHoles.map(h => (
              <th key={h.holeNumber} scope="col" className="px-2 py-1 text-center text-gray-400 font-normal">{h.par}</th>
            ))}
            <th scope="col" className="px-2 py-1 text-center font-medium text-gray-500">
              {sectionHoles.reduce((s, h) => s + h.par, 0)}
            </th>
          </tr>
          <tr className="bg-gray-50">
            <th scope="row" className="px-2 py-1 text-left text-gray-400 font-normal">{t('scorecard.si')}</th>
            {sectionHoles.map(h => (
              <th key={h.holeNumber} scope="col" className="px-2 py-1 text-center text-gray-400 font-normal">{h.strokeIndex}</th>
            ))}
            <th scope="col" className="px-2 py-1"></th>
          </tr>
        </thead>
        <tbody>
          {players.map(player => {
            return (
              <tr key={player.userId} className={player.userId === currentUserId ? 'bg-blue-50' : ''}>
                <td className="px-2 py-1.5 text-left font-medium text-gray-700 truncate max-w-[80px]">
                  {player.userName}
                </td>
                {sectionHoles.map(h => {
                  const ps = getPlayerScore(h.holeNumber, player.userId);
                  const displayScore = showNet ? (ps?.netScore ?? ps?.ownScore) : ps?.ownScore;
                  const strokeCount = ps?.strokesReceivedThisHole ?? 0;
                  const result = getHoleResult(h.holeNumber);
                  const isBestBall = (
                    (player.team === 'A' && result?.bestBallPlayerA === player.userId) ||
                    (player.team === 'B' && result?.bestBallPlayerB === player.userId)
                  );
                  return (
                    <td key={h.holeNumber} className={`px-1 py-1 text-center ${isBestBall ? 'bg-yellow-50' : ''}`}>
                      {ps ? (
                        <div className="flex flex-col items-center">
                          {showNet && strokeCount > 0 && (
                            <div className="flex gap-px justify-center">
                              {Array.from({ length: strokeCount }).map((_, i) => (
                                <span key={i} className="block w-1.5 h-1.5 bg-blue-500 rounded-full" />
                              ))}
                            </div>
                          )}
                          <GolfFigure score={displayScore} par={h.par} />
                          <ValidationIcon status={ps.validationStatus} />
                        </div>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                  );
                })}
                <td className="px-2 py-1 text-center font-bold">
                  {sumScores(sectionHoles, player.userId) || '-'}
                </td>
              </tr>
            );
          })}
          <tr className="border-t">
            <td className="px-2 py-1 text-left text-gray-500">{t('scorecard.result')}</td>
            {sectionHoles.map(h => {
              const result = getHoleResult(h.holeNumber);
              const bestPlayerName = result?.winner === 'A'
                ? players.find(p => p.userId === result.bestBallPlayerA)?.userName
                : result?.winner === 'B'
                  ? players.find(p => p.userId === result.bestBallPlayerB)?.userName
                  : null;
              const winnerLabel = bestPlayerName
                || (result?.winner === 'A' ? (teamAName || 'A') : result?.winner === 'B' ? (teamBName || 'B') : null);
              const winnerColor = result?.winner === 'A' ? 'bg-blue-100 text-blue-700 font-bold' : result?.winner === 'B' ? 'bg-red-100 text-red-700 font-bold' : '';
              return (
                <td key={h.holeNumber} className={`px-1 py-1 text-center text-xs ${winnerColor}`}>
                  {result ? (result.winner === 'HALVED' ? t('scorecard.halved') : winnerLabel) : ''}
                </td>
              );
            })}
            <td className="px-2 py-1"></td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  return (
    <div data-testid="scorecard-table" className="space-y-4">
      {hasAnyStrokes && (
        <div className="flex items-center justify-end gap-2 mb-2">
          <span className="text-xs text-gray-500">{t('scorecard.gross')}</span>
          <button
            type="button"
            role="switch"
            aria-checked={showNet}
            aria-label={t('scorecard.grossNet')}
            onClick={() => setShowNet(!showNet)}
            className={`relative w-10 h-5 rounded-full transition-colors ${showNet ? 'bg-primary' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${showNet ? 'translate-x-5' : ''}`} />
          </button>
          <span className="text-xs text-gray-500">{t('scorecard.net')}</span>
        </div>
      )}
      {renderSection(outHoles, t('scorecard.out'))}
      {inHoles.length > 0 && renderSection(inHoles, t('scorecard.in'))}
    </div>
  );
};

export default ScorecardTable;
