import { useTranslation } from 'react-i18next';
import GolfFigure from './GolfFigure';
import ValidationIcon from './ValidationIcon';

const ScorecardTable = ({ holes = [], scores = [], players = [], currentUserId }) => {
  const { t } = useTranslation('scoring');

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

  const sumScores = (holeRange, userId, field) => {
    return holeRange.reduce((sum, h) => {
      const ps = getPlayerScore(h.holeNumber, userId);
      const val = ps?.[field];
      return val !== null && val !== undefined ? sum + val : sum;
    }, 0);
  };

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
            <td className="px-2 py-1 text-left text-gray-400">{t('scorecard.par')}</td>
            {sectionHoles.map(h => (
              <td key={h.holeNumber} className="px-2 py-1 text-center text-gray-400">{h.par}</td>
            ))}
            <td className="px-2 py-1 text-center font-medium text-gray-500">
              {sectionHoles.reduce((s, h) => s + h.par, 0)}
            </td>
          </tr>
          <tr className="bg-gray-50">
            <td className="px-2 py-1 text-left text-gray-400">{t('scorecard.si')}</td>
            {sectionHoles.map(h => (
              <td key={h.holeNumber} className="px-2 py-1 text-center text-gray-400">{h.strokeIndex}</td>
            ))}
            <td className="px-2 py-1"></td>
          </tr>
        </thead>
        <tbody>
          {players.map(player => (
            <tr key={player.userId} className={player.userId === currentUserId ? 'bg-blue-50' : ''}>
              <td className="px-2 py-1.5 text-left font-medium text-gray-700 truncate max-w-[80px]">
                {player.userName}
              </td>
              {sectionHoles.map(h => {
                const ps = getPlayerScore(h.holeNumber, player.userId);
                return (
                  <td key={h.holeNumber} className="px-1 py-1 text-center">
                    {ps ? (
                      <div className="flex flex-col items-center">
                        <GolfFigure score={ps.netScore ?? ps.ownScore} par={h.par} />
                        <ValidationIcon status={ps.validationStatus} />
                      </div>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                );
              })}
              <td className="px-2 py-1 text-center font-bold">
                {sumScores(sectionHoles, player.userId, 'ownScore') || '-'}
              </td>
            </tr>
          ))}
          <tr className="border-t">
            <td className="px-2 py-1 text-left text-gray-500">{t('scorecard.result')}</td>
            {sectionHoles.map(h => {
              const result = getHoleResult(h.holeNumber);
              return (
                <td key={h.holeNumber} className="px-2 py-1 text-center text-xs">
                  {result ? (result.winner === 'HALVED' ? '-' : result.winner) : ''}
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
      {renderSection(outHoles, t('scorecard.out'))}
      {inHoles.length > 0 && renderSection(inHoles, t('scorecard.in'))}
    </div>
  );
};

export default ScorecardTable;
