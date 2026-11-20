import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import HeaderAuth from '../../components/layout/HeaderAuth';
import { useAuth } from '../../hooks/useAuth';
import { useUserRoles } from '../../hooks/useUserRoles';
import { useDatosDeLaAgenda } from '../../hooks/useDatosDeLaAgenda';
import { useModalesDeLaAgenda } from '../../hooks/useModalesDeLaAgenda';
import { useAccionesDeLaAgenda } from '../../hooks/useAccionesDeLaAgenda';
import TeamAssignmentSection from '../../components/schedule/TeamAssignmentSection';
import CabeceraDeLaAgenda from '../../components/schedule/CabeceraDeLaAgenda';
import SesionesDeLaAgenda from '../../components/schedule/SesionesDeLaAgenda';
import ModalesDeLaAgenda from '../../components/schedule/ModalesDeLaAgenda';
import FullScreenLoader from '../../components/ui/FullScreenLoader';
import { PANTALLA_MENOS_BARRA_INFERIOR } from '../../utils/barraInferior';
import { puedeGestionarLaCompeticion } from '../../utils/puedeGestionarLaCompeticion';
import {
  entraALosSobres,
  botonesDeLosSobres,
  sePuedenDeshacerLosEquipos,
} from '../../utils/permisosDeLaAgenda';

const SchedulePage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { t } = useTranslation('schedule');
  const { t: tComp } = useTranslation('competitions');
  const { user, loading: isLoadingUser } = useAuth();
  const {
    isAdmin,
    isCreator: hasCreatorRole,
    isLoading: isLoadingRoles,
  } = useUserRoles(id, user?.id);

  const datos = useDatosDeLaAgenda({ id, user, navigate, t });
  const { competition, schedule, enrollments, isLoading } = datos;
  // Lo abierto y lo desplegado viven aquí y no en lo que se pinta: mientras la
  // agenda recarga entera sale la espera, y al volver sigue igual
  const modales = useModalesDeLaAgenda();
  const acciones = useAccionesDeLaAgenda({ id, t, tComp, datos, modales });
  const { isProcessing } = acciones;
  const [expandedRounds, setExpandedRounds] = useState({});

  // --- Permissions ---
  const canManage = puedeGestionarLaCompeticion({
    creatorId: competition?.creatorId,
    userId: user?.id,
    hasCreatorRole,
    isAdmin,
  });

  // --- UI helpers ---
  const toggleRoundExpand = (roundId) => {
    setExpandedRounds((prev) => ({ ...prev, [roundId]: !prev[roundId] }));
  };

  const handleScoreMatch = (matchId) => {
    navigate(`/player/matches/${matchId}/scoring`);
  };

  // --- Loading ---
  if (isLoadingUser || isLoading || isLoadingRoles) {
    return <FullScreenLoader texto={t('loading')} />;
  }

  if (!user || !competition) {
    return null;
  }

  const rounds = schedule?.rounds || [];
  const teamAssignment = schedule?.teamAssignment || null;
  const teamNames = {
    teamA: competition.team1Name || 'Team A',
    teamB: competition.team2Name || 'Team B',
  };
  const botones = botonesDeLosSobres({
    entra: entraALosSobres({
      userId: user?.id,
      captains: competition.captains,
      creatorId: competition.creatorId,
    }),
    canManage,
    setupMode: competition.setupMode,
    hayEquipos: Boolean(teamAssignment),
  });

  return (
    <div
      className={`relative flex h-auto ${PANTALLA_MENOS_BARRA_INFERIOR} w-full flex-col bg-white`}
    >
      <div className="layout-container flex h-full grow flex-col">
        <HeaderAuth user={user} />

        <div className="px-4 md:px-40 flex flex-1 justify-center py-5">
          <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
            <CabeceraDeLaAgenda
              competitionId={id}
              competitionName={competition.name}
              canManage={canManage}
              onVolver={() => navigate(`/competitions/${id}`)}
              t={t}
            />

            {/* Team Assignment Section: solo una Ryder tiene equipos (FE #791) */}
            {competition.hasTeams && (
              <div className="p-4">
                <TeamAssignmentSection
                  teamAssignment={teamAssignment}
                  onAssignTeams={() => modales.setShowTeamsModal(true)}
                  onUndoTeams={() => {
                    if (!isProcessing) modales.setDeshaciendoEquipos(true);
                  }}
                  sePuedenDeshacer={sePuedenDeshacerLosEquipos({
                    status: competition.status,
                    rounds,
                  })}
                  canManage={canManage}
                  playerNameMap={datos.playerNameMap}
                  enrollments={enrollments}
                  teamNames={teamNames}
                  maxPlayingHandicap={competition.maxPlayingHandicap ?? null}
                  captains={competition.captains}
                  status={competition.status}
                  onFillCaptain={modales.setCubriendoCapitan}
                  inscritosSinCargar={datos.inscritosSinCargar}
                  t={t}
                />
              </div>
            )}

            <SesionesDeLaAgenda
              rounds={rounds}
              competitionId={id}
              competition={competition}
              botones={botones}
              expandedRounds={expandedRounds}
              onToggleExpand={toggleRoundExpand}
              onGenerateMatches={modales.abrirGenerar}
              onRehacerSobres={modales.setRehaciendoSobres}
              onScoreMatch={handleScoreMatch}
              onStartMatch={acciones.handleStartMatch}
              onCompleteMatch={acciones.handleCompleteMatch}
              onDeclareWalkover={modales.abrirWalkover}
              onReassignPlayers={modales.abrirReasignar}
              onViewMatchDetail={modales.abrirDetalle}
              canManage={canManage}
              playerNameMap={datos.playerNameMap}
              playerHandicapMap={datos.playerHandicapMap}
              golfCourses={datos.golfCourses}
              teamNames={teamNames}
              t={t}
              tComp={tComp}
            />

            {/* Footer */}
            <footer className="flex flex-col gap-6 px-5 py-10 text-center">
              <p className="text-gray-500 text-base font-normal leading-normal">
                {tComp('footer', { year: new Date().getFullYear() })}
              </p>
            </footer>
          </div>
        </div>
      </div>

      <ModalesDeLaAgenda
        modales={modales}
        acciones={acciones}
        enrollments={enrollments}
        inscritosSinCargar={datos.inscritosSinCargar}
        playerNameMap={datos.playerNameMap}
        playerHandicapMap={datos.playerHandicapMap}
        competition={competition}
        rounds={rounds}
        teamAssignment={teamAssignment}
        teamNames={teamNames}
        canManage={canManage}
        t={t}
        tComp={tComp}
      />
    </div>
  );
};

export default SchedulePage;
