import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { X, Loader, Trophy, AlertTriangle, ClipboardList } from 'lucide-react';
import { getMatchDetailUseCase } from '../../composition';

const MatchDetailModal = ({
  isOpen,
  onClose,
  matchId,
  playerNameMap,
  teamNames,
  t,
}) => {
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!matchId) return;

    const loadMatch = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getMatchDetailUseCase.execute(matchId);
        setMatch(data);
      } catch (err) {
        console.error('Error loading match detail:', err);
        setError(err.message || t('errors.failedToLoadMatch'));
      } finally {
        setIsLoading(false);
      }
    };

    loadMatch();
  }, [matchId, t]);

  if (!isOpen) return null;

  const getPlayerName = (playerId) => playerNameMap.get(playerId) || playerId || '--';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {t('matches.viewDetail')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader className="w-8 h-8 text-primary animate-spin" />
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-red-600">
              <p>{error}</p>
            </div>
          )}

          {match && !isLoading && (
            <div className="space-y-4">
              {/* Match Info */}
              <div className="flex justify-between items-center">
                <span className="font-bold text-lg text-gray-900">
                  {t('matches.matchNumber', { number: match.matchNumber })}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  match.status === 'COMPLETED' ? 'bg-gray-100 text-gray-800' :
                  match.status === 'IN_PROGRESS' ? 'bg-green-100 text-green-800' :
                  match.status === 'WALKOVER' ? 'bg-orange-100 text-orange-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {t(`status.${match.status}`)}
                </span>
              </div>

              {/* Team A */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">{teamNames.teamA}</h4>
                <div className="space-y-1">
                  {(match.teamAPlayers || []).map((p, i) => (
                    <p key={p.userId || i} className={`text-sm ${i === 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                      {getPlayerName(p.userId)}
                      {p.playingHandicap != null && (
                        <span className="ml-2 text-xs text-blue-600 font-medium">HCP {p.playingHandicap}</span>
                      )}
                    </p>
                  ))}
                  {(!match.teamAPlayers || match.teamAPlayers.length === 0) && (
                    <p className="text-sm text-gray-400">--</p>
                  )}
                </div>
              </div>

              {/* Team B */}
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <h4 className="font-semibold text-red-800 mb-2">{teamNames.teamB}</h4>
                <div className="space-y-1">
                  {(match.teamBPlayers || []).map((p, i) => (
                    <p key={p.userId || i} className={`text-sm ${i === 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                      {getPlayerName(p.userId)}
                      {p.playingHandicap != null && (
                        <span className="ml-2 text-xs text-red-600 font-medium">HCP {p.playingHandicap}</span>
                      )}
                    </p>
                  ))}
                  {(!match.teamBPlayers || match.teamBPlayers.length === 0) && (
                    <p className="text-sm text-gray-400">--</p>
                  )}
                </div>
              </div>

              {/* Handicap Strokes */}
              {match.handicapStrokesGiven != null && match.handicapStrokesGiven > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-sm text-gray-700">
                    {t('matches.handicapStrokes', { strokes: match.handicapStrokesGiven })}
                  </p>
                  {match.strokesGivenToTeam && (
                    <p className="text-sm text-gray-500">
                      {t('matches.strokesGivenTo', { team: match.strokesGivenToTeam === 'A' ? teamNames.teamA : teamNames.teamB })}
                    </p>
                  )}
                </div>
              )}

              {/* Result */}
              {match.result && (() => {
                const isWalkover = match.result.score === 'W/O' || match.status === 'WALKOVER';
                const bgClass = isWalkover ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200';
                const headerClass = isWalkover ? 'text-orange-800' : 'text-green-800';
                const Icon = isWalkover ? AlertTriangle : Trophy;
                const iconClass = isWalkover ? 'w-4 h-4 text-orange-500' : 'w-4 h-4 text-green-600';

                return (
                  <div className={`rounded-lg p-4 border ${bgClass}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={iconClass} />
                      <h4 className={`font-semibold ${headerClass}`}>{t('matches.result')}</h4>
                    </div>
                    <div className="space-y-1 text-sm text-gray-700">
                      {match.result.score && (
                        <p className="font-medium">{t('matches.resultScore', { score: match.result.score })}</p>
                      )}
                      {match.result.winner && (
                        <p>{t('matches.resultWinner', { team: match.result.winner === 'A' ? teamNames.teamA : teamNames.teamB })}</p>
                      )}
                      {match.result.reason && (
                        <p className="text-gray-500 italic">{t('matches.resultReason', { reason: match.result.reason })}</p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          {match && (match.status === 'IN_PROGRESS' || match.status === 'COMPLETED') && (
            <button
              onClick={() => {
                onClose();
                navigate(`/player/matches/${matchId}/scoring`);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              <ClipboardList className="w-4 h-4" />
              {t('matches.viewScorecard')}
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            {t('matches.close')}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default MatchDetailModal;
