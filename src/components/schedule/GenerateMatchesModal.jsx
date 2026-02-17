import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Zap, Plus, Trash2 } from 'lucide-react';

let matchIdCounter = 0;
const createEmptyMatch = () => ({ id: ++matchIdCounter, teamAPlayerIds: [], teamBPlayerIds: [] });

// Wrapper: controls mount/unmount so inner component always has fresh state
const GenerateMatchesModal = ({ isOpen, ...props }) => {
  if (!isOpen) return null;
  return <GenerateMatchesModalContent {...props} />;
};

const GenerateMatchesModalContent = ({
  onClose,
  onConfirm,
  round,
  enrollments,
  teamAssignment,
  isProcessing,
  teamNames,
  playerNameMap,
  t,
}) => {
  const [mode, setMode] = useState('automatic');
  const [matches, setMatches] = useState([createEmptyMatch()]);
  const [validationError, setValidationError] = useState(null);

  const playersPerSide = round.matchFormat === 'SINGLES' ? 1 : 2;

  const approvedPlayers = useMemo(
    () => enrollments.filter(e => e.status === 'APPROVED'),
    [enrollments]
  );

  const teamAPlayers = useMemo(
    () => approvedPlayers.filter(p =>
      teamAssignment?.teamAPlayerIds?.includes(p.userId)
    ),
    [approvedPlayers, teamAssignment]
  );

  const teamBPlayers = useMemo(
    () => approvedPlayers.filter(p =>
      teamAssignment?.teamBPlayerIds?.includes(p.userId)
    ),
    [approvedPlayers, teamAssignment]
  );

  // All player IDs currently used across all matches
  const usedPlayerIds = useMemo(() => {
    const ids = new Set();
    matches.forEach(m => {
      m.teamAPlayerIds.forEach(id => { if (id) ids.add(id); });
      m.teamBPlayerIds.forEach(id => { if (id) ids.add(id); });
    });
    return ids;
  }, [matches]);

  const assignedCount = usedPlayerIds.size;
  const totalCount = teamAPlayers.length + teamBPlayers.length;

  const addMatch = () => {
    setMatches(prev => [...prev, createEmptyMatch()]);
    setValidationError(null);
  };

  const removeMatch = (index) => {
    setMatches(prev => prev.filter((_, i) => i !== index));
    setValidationError(null);
  };

  const updateMatchPlayer = (matchIndex, team, slotIndex, playerId) => {
    setMatches(prev => prev.map((match, i) => {
      if (i !== matchIndex) return match;
      const key = team === 'A' ? 'teamAPlayerIds' : 'teamBPlayerIds';
      const updated = [...match[key]];
      if (playerId === '') {
        updated[slotIndex] = '';
      } else {
        updated[slotIndex] = playerId;
      }
      return { ...match, [key]: updated };
    }));
    setValidationError(null);
  };

  const isPlayerUsedElsewhere = (playerId, currentMatchIndex, team, slotIndex) => {
    if (!playerId) return false;
    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      if (m.teamAPlayerIds.some((id, si) => id === playerId && !(i === currentMatchIndex && team === 'A' && si === slotIndex))) return true;
      if (m.teamBPlayerIds.some((id, si) => id === playerId && !(i === currentMatchIndex && team === 'B' && si === slotIndex))) return true;
    }
    return false;
  };

  const validate = () => {
    if (matches.length === 0) {
      return t('matches.pairings.validation.noMatches');
    }

    for (const match of matches) {
      if (match.teamAPlayerIds.length !== playersPerSide ||
          match.teamBPlayerIds.length !== playersPerSide) {
        return t('matches.pairings.validation.incompleteMatch');
      }
      if (match.teamAPlayerIds.some(id => !id) || match.teamBPlayerIds.some(id => !id)) {
        return t('matches.pairings.validation.incompleteMatch');
      }
    }

    // Check duplicates
    const allIds = matches.flatMap(m => [...m.teamAPlayerIds, ...m.teamBPlayerIds]);
    if (new Set(allIds).size !== allIds.length) {
      return t('matches.pairings.validation.duplicatePlayer');
    }

    return null;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (mode === 'automatic') {
      onConfirm(null);
      return;
    }

    const error = validate();
    if (error) {
      setValidationError(error);
      return;
    }

    onConfirm(matches.map(({ teamAPlayerIds, teamBPlayerIds }) => ({ teamAPlayerIds, teamBPlayerIds })));
  };

  const renderPlayerSelect = (matchIndex, team, slotIndex, players) => {
    const key = team === 'A' ? 'teamAPlayerIds' : 'teamBPlayerIds';
    const currentValue = matches[matchIndex][key][slotIndex] || '';

    return (
      <select
        value={currentValue}
        onChange={(e) => updateMatchPlayer(matchIndex, team, slotIndex, e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary focus:border-primary"
      >
        <option value="">{t('matches.pairings.selectPlayer')}</option>
        {players.map(player => {
          const isUsed = isPlayerUsedElsewhere(player.userId, matchIndex, team, slotIndex);
          return (
            <option
              key={player.userId}
              value={player.userId}
              disabled={isUsed}
            >
              {playerNameMap.get(player.userId) || player.userName || 'Unknown'}
              {player.userHandicap != null ? ` (HCP: ${Number(player.userHandicap).toFixed(1)})` : ''}
              {isUsed ? ` - ${t('matches.pairings.playerAlreadyUsed')}` : ''}
            </option>
          );
        })}
      </select>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-gray-900">
              {t('matches.pairings.title')}
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
          {/* Mode selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('matches.pairings.mode')}
            </label>
            <div className="space-y-2">
              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="pairingMode"
                  value="automatic"
                  checked={mode === 'automatic'}
                  onChange={() => { setMode('automatic'); setValidationError(null); }}
                  className="mt-0.5 text-primary focus:ring-primary"
                />
                <div>
                  <span className="text-sm font-medium">{t('matches.pairings.automatic')}</span>
                  <p className="text-xs text-gray-500 mt-0.5">{t('matches.pairings.automaticDesc')}</p>
                </div>
              </label>
              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="pairingMode"
                  value="manual"
                  checked={mode === 'manual'}
                  onChange={() => { setMode('manual'); setValidationError(null); }}
                  className="mt-0.5 text-primary focus:ring-primary"
                />
                <div>
                  <span className="text-sm font-medium">{t('matches.pairings.manual')}</span>
                  <p className="text-xs text-gray-500 mt-0.5">{t('matches.pairings.manualDesc')}</p>
                </div>
              </label>
            </div>
          </div>

          {/* Manual matches UI */}
          {mode === 'manual' && (
            <div className="space-y-4">
              {matches.map((match, matchIndex) => (
                <div key={match.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                  {/* Match header */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-900">
                      {t('matches.pairings.matchN', { number: matchIndex + 1 })}
                    </span>
                    {matches.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMatch(matchIndex)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                        title={t('matches.pairings.removeMatch')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-start">
                    {/* Team A */}
                    <div className="space-y-2">
                      <span className="text-xs font-medium text-blue-700">{teamNames.teamA}</span>
                      {Array.from({ length: playersPerSide }, (_, slotIndex) => (
                        <div key={`a-${slotIndex}`}>
                          {renderPlayerSelect(matchIndex, 'A', slotIndex, teamAPlayers)}
                        </div>
                      ))}
                    </div>

                    {/* VS */}
                    <div className="flex items-center justify-center pt-6">
                      <span className="text-sm font-bold text-gray-400">{t('matches.vs')}</span>
                    </div>

                    {/* Team B */}
                    <div className="space-y-2">
                      <span className="text-xs font-medium text-red-700">{teamNames.teamB}</span>
                      {Array.from({ length: playersPerSide }, (_, slotIndex) => (
                        <div key={`b-${slotIndex}`}>
                          {renderPlayerSelect(matchIndex, 'B', slotIndex, teamBPlayers)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              {/* Add match button */}
              <button
                type="button"
                onClick={addMatch}
                className="flex items-center gap-2 w-full justify-center py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:border-primary hover:text-primary transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t('matches.pairings.addMatch')}
              </button>

              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                {t('matches.pairings.summary', {
                  matchCount: matches.length,
                  assignedCount,
                  totalCount,
                })}
              </div>
            </div>
          )}

          {/* Validation error */}
          {validationError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {validationError}
            </div>
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
              disabled={isProcessing}
              data-testid="generate-submit"
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Zap className="w-4 h-4" />
              {isProcessing ? '...' : t('matches.pairings.generate')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default GenerateMatchesModal;
