import { Users } from 'lucide-react';

const TeamAssignmentSection = ({
  teamAssignment,
  onAssignTeams,
  canManage,
  playerNameMap,
  enrollments,
  teamNames,
  t,
}) => {
  // Build handicap lookup from enrollments
  const handicapMap = new Map();
  (enrollments || []).forEach((e) => {
    if (e.userId && e.userHandicap != null) {
      handicapMap.set(e.userId, Number(e.userHandicap));
    }
  });
  if (!teamAssignment) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-gray-900 font-bold text-lg mb-3 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          {t('teams.title')}
        </h3>
        <div className="text-center py-6">
          <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 mb-4">{t('teams.noTeamsAssigned')}</p>
          {canManage && (
            <button
              onClick={onAssignTeams}
              className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              {t('teams.assign')}
            </button>
          )}
        </div>
      </div>
    );
  }

  const teamA = teamAssignment.teamAPlayerIds || [];
  const teamB = teamAssignment.teamBPlayerIds || [];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
        <h3 className="text-gray-900 font-bold text-lg flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          {t('teams.title')}
        </h3>
        {teamAssignment.mode && (
          <span className="text-xs text-gray-500">
            {t('teams.mode')}: {t(`teams.${teamAssignment.mode.toLowerCase()}`)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Team A */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-2">
            {teamNames.teamA} ({t('teams.playersCount', { count: teamA.length })})
          </h4>
          <ul className="space-y-1.5">
            {teamA.map((playerId) => (
              <li key={playerId} className="flex items-center justify-between text-sm">
                <span className="text-gray-800">{playerNameMap.get(playerId) || playerId}</span>
                {handicapMap.has(playerId) && (
                  <span className="text-xs text-blue-600 font-medium">HCP {handicapMap.get(playerId).toFixed(1)}</span>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Team B */}
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <h4 className="font-semibold text-red-800 mb-2">
            {teamNames.teamB} ({t('teams.playersCount', { count: teamB.length })})
          </h4>
          <ul className="space-y-1.5">
            {teamB.map((playerId) => (
              <li key={playerId} className="flex items-center justify-between text-sm">
                <span className="text-gray-800">{playerNameMap.get(playerId) || playerId}</span>
                {handicapMap.has(playerId) && (
                  <span className="text-xs text-red-600 font-medium">HCP {handicapMap.get(playerId).toFixed(1)}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {canManage && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <button
            onClick={onAssignTeams}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {t('teams.assign')}
          </button>
        </div>
      )}
    </div>
  );
};

export default TeamAssignmentSection;
