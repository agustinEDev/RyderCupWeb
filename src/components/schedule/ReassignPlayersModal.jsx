import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Users } from 'lucide-react';

// Wrapper: controls mount/unmount so inner component always has fresh state.
// key={match?.id} forces remount if the match changes while the modal is open.
const ReassignPlayersModal = ({ isOpen, match, ...props }) => {
  if (!isOpen) return null;
  return <ReassignPlayersModalContent key={match?.id} match={match} {...props} />;
};

const ReassignPlayersModalContent = ({
  onClose,
  onConfirm,
  match,
  enrollments,
  isProcessing,
  t,
}) => {
  const [teamAIds, setTeamAIds] = useState(() =>
    (match?.teamAPlayers || []).map(p => p.userId)
  );

  const [teamBIds, setTeamBIds] = useState(() =>
    (match?.teamBPlayers || []).map(p => p.userId)
  );

  // Only approved enrollments
  const approvedPlayers = enrollments.filter(e => e.status === 'APPROVED');

  const togglePlayer = (playerId, team) => {
    if (team === 'A') {
      // Remove from B if present
      setTeamBIds(prev => prev.filter(id => id !== playerId));
      setTeamAIds(prev =>
        prev.includes(playerId)
          ? prev.filter(id => id !== playerId)
          : [...prev, playerId]
      );
    } else {
      // Remove from A if present
      setTeamAIds(prev => prev.filter(id => id !== playerId));
      setTeamBIds(prev =>
        prev.includes(playerId)
          ? prev.filter(id => id !== playerId)
          : [...prev, playerId]
      );
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (teamAIds.length === 0 || teamBIds.length === 0) return;
    onConfirm(teamAIds, teamBIds);
  };

  const getPlayerTeam = (playerId) => {
    if (teamAIds.includes(playerId)) return 'A';
    if (teamBIds.includes(playerId)) return 'B';
    return null;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-gray-900">
              {t('matches.reassignPlayers')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            {t('matches.matchNumber', { number: match.matchNumber })}
          </p>

          {/* Player list */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {approvedPlayers.map((player) => {
              const team = getPlayerTeam(player.userId);
              return (
                <div
                  key={player.userId}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    team === 'A' ? 'border-blue-300 bg-blue-50' :
                    team === 'B' ? 'border-red-300 bg-red-50' :
                    'border-gray-200 bg-white'
                  }`}
                >
                  <span className="text-sm font-medium text-gray-900">
                    {player.userName || 'Unknown'}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => togglePlayer(player.userId, 'A')}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        team === 'A'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-blue-100'
                      }`}
                    >
                      {t('matches.teamA')}
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePlayer(player.userId, 'B')}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        team === 'B'
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-red-100'
                      }`}
                    >
                      {t('matches.teamB')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <span className="font-semibold text-blue-800">{t('matches.teamA')}: {teamAIds.length}</span>
            </div>
            <div className="bg-red-50 rounded-lg p-3 border border-red-200">
              <span className="font-semibold text-red-800">{t('matches.teamB')}: {teamBIds.length}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isProcessing || teamAIds.length === 0 || teamBIds.length === 0}
              className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isProcessing ? '...' : t('matches.reassignPlayers')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default ReassignPlayersModal;
