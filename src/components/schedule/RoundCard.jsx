import { ChevronDown, ChevronUp, Edit, Trash2, Zap } from 'lucide-react';
import MatchCard from './MatchCard';

const STATUS_COLORS = {
  PENDING_TEAMS: 'bg-yellow-100 text-yellow-800',
  PENDING_MATCHES: 'bg-orange-100 text-orange-800',
  SCHEDULED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-gray-100 text-gray-800',
};

const RoundCard = ({
  round,
  onEdit,
  onDelete,
  onGenerateMatches,
  onToggleExpand,
  isExpanded,
  canEdit,
  onStartMatch,
  onCompleteMatch,
  onDeclareWalkover,
  onReassignPlayers,
  onViewMatchDetail,
  onScoreMatch,
  playerNameMap,
  golfCourses,
  teamNames,
  t,
}) => {
  const status = round.status;
  const isEditable = canEdit && (status === 'PENDING_TEAMS' || status === 'PENDING_MATCHES');
  const canGenerate = canEdit && (status === 'PENDING_MATCHES' || status === 'SCHEDULED');
  const matches = round.matches || [];

  const golfCourseName = golfCourses.find(gc => gc.id === round.golfCourseId)?.name || round.golfCourseId;

  const formattedDate = round.roundDate
    ? new Date(round.roundDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
    : '';

  return (
    <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
      {/* Round Header */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        className="flex flex-wrap items-center justify-between gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggleExpand}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleExpand(); } }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-bold text-gray-900">{formattedDate}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-700'}`}>
              {t(`status.${status}`)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
            <span>{golfCourseName}</span>
            <span className="text-gray-300">|</span>
            <span>{t(`sessions.${round.sessionType}`)}</span>
            <span className="text-gray-300">|</span>
            <span>{t(`formats.${round.matchFormat}`)}</span>
            {matches.length > 0 && (
              <>
                <span className="text-gray-300">|</span>
                <span>{t('rounds.matchCount', { count: matches.length })}</span>
              </>
            )}
          </div>
          {round.handicapMode && (
            <div className="text-xs text-gray-500 mt-1">
              {t('rounds.handicapMode')}: {t(`handicapModes.${round.handicapMode}`)}
              {round.allowancePercentage != null && (
                <span className="ml-2">{t('rounds.allowancePercentage')}: {round.allowancePercentage}%</span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Action buttons (stop propagation to prevent toggle) */}
          {isEditable && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className="p-2 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                title={t('rounds.edit')}
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title={t('rounds.delete')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
          {canGenerate && (
            <button
              onClick={(e) => { e.stopPropagation(); onGenerateMatches(); }}
              className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
              title={t('matches.generate')}
            >
              <Zap className="w-3 h-3" />
              {t('matches.generate')}
            </button>
          )}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </div>

      {/* Expanded: Matches List */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          {matches.length === 0 ? (
            <p className="text-center text-gray-500 text-sm py-4">{t('matches.noMatches')}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {matches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  onStartMatch={onStartMatch}
                  onCompleteMatch={onCompleteMatch}
                  onDeclareWalkover={onDeclareWalkover}
                  onReassignPlayers={onReassignPlayers}
                  onViewDetail={onViewMatchDetail}
                  onScoreMatch={onScoreMatch}
                  canManage={canEdit}
                  playerNameMap={playerNameMap}
                  teamNames={teamNames}
                  t={t}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RoundCard;
