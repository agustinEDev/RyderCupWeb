import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Users } from 'lucide-react';

// Wrapper: controls mount/unmount so inner component always has fresh state
const AssignTeamsModal = ({ isOpen, ...props }) => {
  if (!isOpen) return null;
  return <AssignTeamsModalContent {...props} />;
};

const AssignTeamsModalContent = ({
  onClose,
  onConfirm,
  enrollments,
  isProcessing,
  teamNames,
  captains,
  t,
}) => {
  // Con los dos capitanes nombrados, cada uno queda fijo en su equipo (FE #692):
  // nombrarlos ya los fijó, y el servidor rechaza un reparto que los mueva
  // (RyderCupAM#320). Con uno solo no se fija a nadie: ese reparto lo va a
  // rechazar igualmente pidiendo el capitán que falta
  const hayCapitanes = Boolean(captains?.teamA && captains?.teamB);
  // Con uno solo, el servidor rechaza el reparto en los dos modos pidiendo el
  // que falta: mejor decirlo antes que después de rellenar doce nombres
  const faltaUnCapitan = Boolean(captains?.teamA) !== Boolean(captains?.teamB);
  const [mode, setMode] = useState('automatic');
  const [manualTeamA, setManualTeamA] = useState(hayCapitanes ? [captains.teamA] : []);
  const [manualTeamB, setManualTeamB] = useState(hayCapitanes ? [captains.teamB] : []);

  const approvedPlayers = enrollments.filter(e => e.status === 'APPROVED');
  const esCapitan = (playerId) =>
    hayCapitanes && (playerId === captains.teamA || playerId === captains.teamB);

  // Los capitanes no se mueven: sus botones van desactivados, y eso ya impide
  // que llegue aquí un clic suyo
  const togglePlayer = (playerId, team) => {
    if (team === 'A') {
      setManualTeamB(prev => prev.filter(id => id !== playerId));
      setManualTeamA(prev =>
        prev.includes(playerId)
          ? prev.filter(id => id !== playerId)
          : [...prev, playerId]
      );
    } else {
      setManualTeamA(prev => prev.filter(id => id !== playerId));
      setManualTeamB(prev =>
        prev.includes(playerId)
          ? prev.filter(id => id !== playerId)
          : [...prev, playerId]
      );
    }
  };

  const getPlayerTeam = (playerId) => {
    if (manualTeamA.includes(playerId)) return 'A';
    if (manualTeamB.includes(playerId)) return 'B';
    return null;
  };

  // En una Ryder juegan todos: un reparto incompleto borra el anterior y deja
  // gente sin equipo, y el servidor no lo impide
  const sinEquipo = approvedPlayers.filter(
    (p) => !manualTeamA.includes(p.userId) && !manualTeamB.includes(p.userId)
  ).length;

  const handleSubmit = (e) => {
    e.preventDefault();

    if (mode === 'automatic') {
      onConfirm({ mode: 'automatic' });
    } else {
      onConfirm({
        mode: 'manual',
        team_a_player_ids: manualTeamA,
        team_b_player_ids: manualTeamB,
      });
    }
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
              {t('teams.assign')}
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
          {faltaUnCapitan && (
            <p className="text-sm text-amber-700">{t('teams.captainMissing')}</p>
          )}
          {/* Mode selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('teams.mode')}
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  value="automatic"
                  checked={mode === 'automatic'}
                  onChange={() => setMode('automatic')}
                  className="text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium">{t('teams.automatic')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  value="manual"
                  checked={mode === 'manual'}
                  onChange={() => setMode('manual')}
                  className="text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium">{t('teams.manual')}</span>
              </label>
            </div>
          </div>

          {/* Manual player assignment */}
          {mode === 'manual' && (
            <>
              {hayCapitanes && (
                <p className="text-sm text-gray-600">{t('teams.captainsFixed')}</p>
              )}
              {sinEquipo > 0 && (
                <p className="text-sm text-amber-700">
                  {t('teams.everyoneNeedsTeam', { count: sinEquipo })}
                </p>
              )}
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
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-gray-900">
                          {player.userName || 'Unknown'}
                        </span>
                        {player.userHandicap != null && (
                          <span className="text-xs text-gray-500 ml-2">
                            HCP: {Number(player.userHandicap).toFixed(1)}
                          </span>
                        )}
                        {esCapitan(player.userId) && (
                          <span className="block text-xs text-yellow-800 truncate">
                            {t('teams.captainTag')}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => togglePlayer(player.userId, 'A')}
                          disabled={esCapitan(player.userId)}
                          className={`px-3 py-1 rounded text-xs font-medium transition-colors disabled:opacity-60 ${
                            team === 'A'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-blue-100'
                          }`}
                        >
                          {teamNames.teamA}
                        </button>
                        <button
                          type="button"
                          onClick={() => togglePlayer(player.userId, 'B')}
                          disabled={esCapitan(player.userId)}
                          className={`px-3 py-1 rounded text-xs font-medium transition-colors disabled:opacity-60 ${
                            team === 'B'
                              ? 'bg-red-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-red-100'
                          }`}
                        >
                          {teamNames.teamB}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <span className="font-semibold text-blue-800">
                    {teamNames.teamA}: {manualTeamA.length}
                  </span>
                </div>
                <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                  <span className="font-semibold text-red-800">
                    {teamNames.teamB}: {manualTeamB.length}
                  </span>
                </div>
              </div>
            </>
          )}

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
              disabled={
                isProcessing || faltaUnCapitan || (mode === 'manual' && sinEquipo > 0)
              }
              className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isProcessing ? '...' : t('teams.assign')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default AssignTeamsModal;
