import { Play, CheckCircle, AlertTriangle, Eye, Users } from 'lucide-react';

const STATUS_COLORS = {
  SCHEDULED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-gray-100 text-gray-800',
  WALKOVER: 'bg-orange-100 text-orange-800',
};

const getPlayerName = (playerId, playerNameMap) => {
  return playerNameMap.get(playerId) || 'Unknown Player';
};

const MatchCard = ({
  match,
  onStartMatch,
  onCompleteMatch,
  onDeclareWalkover,
  onReassignPlayers,
  onViewDetail,
  canManage,
  playerNameMap,
  teamNames,
  t,
}) => {
  const status = match.status;
  const isEditable = status === 'SCHEDULED';
  const isInProgress = status === 'IN_PROGRESS';

  const teamA = match.teamAPlayers || [];
  const teamB = match.teamBPlayers || [];

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-sm transition-shadow">
      {/* Header: Match number + Status */}
      <div className="flex justify-between items-center mb-3">
        <span className="font-semibold text-gray-900">
          {t('matches.matchNumber', { number: match.matchNumber })}
        </span>
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-700'}`}>
          {t(`status.${status}`)}
        </span>
      </div>

      {/* Teams */}
      <div className="space-y-2 mb-3">
        {/* Team A */}
        <div className="bg-blue-50 rounded-lg p-2">
          <p className="text-xs font-semibold text-blue-700 mb-1">{teamNames.teamA}</p>
          {teamA.map((p, i) => (
            <p key={p.userId || i} className={`text-sm ${i === 0 ? 'text-gray-900' : 'text-gray-700'}`}>
              {getPlayerName(p.userId, playerNameMap)}
            </p>
          ))}
          {teamA.length === 0 && <p className="text-sm text-gray-400">--</p>}
        </div>

        <div className="text-center text-xs font-bold text-gray-400">{t('matches.vs')}</div>

        {/* Team B */}
        <div className="bg-red-50 rounded-lg p-2">
          <p className="text-xs font-semibold text-red-700 mb-1">{teamNames.teamB}</p>
          {teamB.map((p, i) => (
            <p key={p.userId || i} className={`text-sm ${i === 0 ? 'text-gray-900' : 'text-gray-700'}`}>
              {getPlayerName(p.userId, playerNameMap)}
            </p>
          ))}
          {teamB.length === 0 && <p className="text-sm text-gray-400">--</p>}
        </div>
      </div>

      {/* Handicap info */}
      {match.handicapStrokesGiven != null && match.handicapStrokesGiven > 0 && (
        <div className="text-xs text-gray-500 mb-3">
          {t('matches.handicapStrokes', { strokes: match.handicapStrokesGiven })}
          {match.strokesGivenToTeam && (
            <span className="ml-1">
              ({t('matches.strokesGivenTo', { team: match.strokesGivenToTeam === 'A' ? teamNames.teamA : teamNames.teamB })})
            </span>
          )}
        </div>
      )}

      {/* Action buttons */}
      {canManage && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
          {isEditable && (
            <>
              <button
                onClick={() => onStartMatch(match.id)}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-md text-xs font-medium hover:bg-green-700 transition-colors"
              >
                <Play className="w-3 h-3" />
                {t('matches.startMatch')}
              </button>
              <button
                onClick={() => onDeclareWalkover(match)}
                className="flex items-center gap-1 px-3 py-1.5 bg-orange-500 text-white rounded-md text-xs font-medium hover:bg-orange-600 transition-colors"
              >
                <AlertTriangle className="w-3 h-3" />
                {t('matches.walkover')}
              </button>
              <button
                onClick={() => onReassignPlayers(match)}
                className="flex items-center gap-1 px-3 py-1.5 bg-gray-500 text-white rounded-md text-xs font-medium hover:bg-gray-600 transition-colors"
              >
                <Users className="w-3 h-3" />
                {t('matches.reassignPlayers')}
              </button>
            </>
          )}
          {isInProgress && (
            <>
              <button
                onClick={() => onCompleteMatch(match.id)}
                className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white rounded-md text-xs font-medium hover:bg-purple-700 transition-colors"
              >
                <CheckCircle className="w-3 h-3" />
                {t('matches.completeMatch')}
              </button>
              <button
                onClick={() => onDeclareWalkover(match)}
                className="flex items-center gap-1 px-3 py-1.5 bg-orange-500 text-white rounded-md text-xs font-medium hover:bg-orange-600 transition-colors"
              >
                <AlertTriangle className="w-3 h-3" />
                {t('matches.walkover')}
              </button>
            </>
          )}
          <button
            onClick={() => onViewDetail(match.id)}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-500 text-white rounded-md text-xs font-medium hover:bg-indigo-600 transition-colors"
          >
            <Eye className="w-3 h-3" />
            {t('matches.viewDetail')}
          </button>
        </div>
      )}

      {/* Read-only: just view detail */}
      {!canManage && (
        <div className="pt-2 border-t border-gray-100">
          <button
            onClick={() => onViewDetail(match.id)}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-500 text-white rounded-md text-xs font-medium hover:bg-indigo-600 transition-colors"
          >
            <Eye className="w-3 h-3" />
            {t('matches.viewDetail')}
          </button>
        </div>
      )}
    </div>
  );
};

export default MatchCard;
