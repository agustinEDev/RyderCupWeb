import { Users } from 'lucide-react';

const TeamAssignmentSection = ({
  teamAssignment,
  onAssignTeams,
  onFillCaptain,
  canManage,
  playerNameMap,
  enrollments,
  teamNames,
  maxPlayingHandicap,
  captains,
  status,
  t,
}) => {
  // Quién capitanea cada equipo, y quién es su segundo (FE #692): esta es la
  // pantalla donde se preparan las sesiones, y las parejas las monta el capitán
  // Un equipo puede quedarse sin capitán: si se retira tras el reparto y no
  // había subcapitán, repartir otra vez pide los dos y nombrarlos ya no se
  // puede (RyderCupAm#320). El organizador cubre el puesto desde aquí.
  //
  // «Sin capitán» se decide contra los que siguen inscritos, como hace el
  // servidor: una baja con el torneo en marcha no le quita el puesto, así que
  // al volver a CERRADA el capitán figura pero ya no juega.
  //
  // Y solo mientras se prepara: en juego o terminado el servidor lo rechaza,
  // y ofrecerlo sería mandar al organizador a un error
  const inscritos = new Set(
    (enrollments || []).filter((e) => e.status === 'APPROVED').map((e) => e.userId)
  );
  const sePuedeCubrir = ['ACTIVE', 'CLOSED'].includes(status);
  const sinCapitan = (equipo) => {
    if (!captains || !sePuedeCubrir) return false;
    const capitan = equipo === 'A' ? captains.teamA : captains.teamB;
    return !capitan || !inscritos.has(capitan);
  };

  // Sin el nombre del equipo: cada lista ya lo lleva en su título, y uno largo
  // dejaba la etiqueta en «Capitán de E...»
  // Mirando también en qué equipo se pinta: repartir de nuevo libera los
  // subcapitanes en el servidor, y hasta que la pantalla se entere la etiqueta
  // no puede aparecer en el equipo contrario
  const papelDe = (playerId, equipo) => {
    if (!captains) return null;
    const capitan = equipo === 'A' ? captains.teamA : captains.teamB;
    const subcapitan = equipo === 'A' ? captains.viceTeamA : captains.viceTeamB;
    if (playerId === capitan) return t('teams.captainTag');
    if (playerId === subcapitan) return t('teams.viceCaptainTag');
    return null;
  };
  // Build handicap lookup from enrollments
  const handicapMap = new Map();
  (enrollments || []).forEach((e) => {
    if (!e.userId) return;
    const effectiveHandicap = e.hasCustomHandicap ? e.customHandicap : e.userHandicap;
    if (effectiveHandicap != null) {
      handicapMap.set(e.userId, Number(effectiveHandicap));
    }
  });

  const renderHandicap = (playerId, colorClass) => {
    if (!handicapMap.has(playerId)) return null;
    const hcp = handicapMap.get(playerId);
    const isLimited = maxPlayingHandicap != null && hcp > maxPlayingHandicap;
    // Sin encoger ni partirse: junto a un nombre largo, a 360 px, «HCP 18.0»
    // saltaba a dos líneas (#710)
    return (
      <span className="flex shrink-0 items-center gap-1 whitespace-nowrap">
        <span className={`text-xs ${colorClass} font-medium`}>HCP {hcp.toFixed(1)}</span>
        {isLimited && (
          <span className="text-xs text-amber-600 font-medium">| {maxPlayingHandicap} Lim.</span>
        )}
      </span>
    );
  };
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
            {/* Con `defaultValue`, un modo que el backend añada mañana y
                nadie traduzca todavía sale con su nombre en vez de con la
                clave: i18next devuelve la clave cuando no la encuentra, y eso
                acaba en pantalla tal cual */}
            {t('teams.mode')}:{' '}
            {t(`teams.${teamAssignment.mode.toLowerCase()}`, {
              defaultValue: teamAssignment.mode,
            })}
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
              <li key={playerId} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-gray-800 min-w-0">
                  {playerNameMap.get(playerId) || playerId}
                  {papelDe(playerId, 'A') && (
                    <span className="block text-xs text-yellow-800 truncate">
                      {papelDe(playerId, 'A')}
                    </span>
                  )}
                </span>
                {renderHandicap(playerId, 'text-blue-600')}
              </li>
            ))}
          </ul>

          {canManage && sinCapitan('A') && (
            <button
              type="button"
              data-testid="cubrir-capitan-A"
              onClick={() => onFillCaptain('A')}
              className="mt-3 w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm font-medium text-blue-800 hover:bg-blue-100"
            >
              {t('teams.fillCaptain')}
            </button>
          )}
        </div>

        {/* Team B */}
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <h4 className="font-semibold text-red-800 mb-2">
            {teamNames.teamB} ({t('teams.playersCount', { count: teamB.length })})
          </h4>
          <ul className="space-y-1.5">
            {teamB.map((playerId) => (
              <li key={playerId} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-gray-800 min-w-0">
                  {playerNameMap.get(playerId) || playerId}
                  {papelDe(playerId, 'B') && (
                    <span className="block text-xs text-yellow-800 truncate">
                      {papelDe(playerId, 'B')}
                    </span>
                  )}
                </span>
                {renderHandicap(playerId, 'text-red-600')}
              </li>
            ))}
          </ul>

          {canManage && sinCapitan('B') && (
            <button
              type="button"
              data-testid="cubrir-capitan-B"
              onClick={() => onFillCaptain('B')}
              className="mt-3 w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-100"
            >
              {t('teams.fillCaptain')}
            </button>
          )}
        </div>
      </div>

      {canManage && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <button
            onClick={onAssignTeams}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {t('teams.reassign')}
          </button>
        </div>
      )}
    </div>
  );
};

export default TeamAssignmentSection;
