import WalkoverModal from './WalkoverModal';
import ReassignPlayersModal from './ReassignPlayersModal';
import MatchDetailModal from './MatchDetailModal';
import AssignTeamsModal from './AssignTeamsModal';
import FillCaptainModal from './FillCaptainModal';
import GenerateMatchesModal from './GenerateMatchesModal';
import ResetEnvelopesModal from './ResetEnvelopesModal';
import ConfirmModal from '../modals/ConfirmModal';
import { jugadoresDelEquipo } from '../../utils/permisosDeLaAgenda';

/**
 * Los diálogos de la agenda (`SchedulePage`), en el orden de siempre. Qué está
 * abierto viene de `useModalesDeLaAgenda` y qué hace cada uno de
 * `useAccionesDeLaAgenda`: aquí solo se pintan.
 */
const ModalesDeLaAgenda = ({
  modales,
  acciones,
  datos,
  competition,
  rounds,
  teamAssignment,
  teamNames,
  canManage,
  t,
  tComp,
}) => {
  const { enrollments, inscritosSinCargar, playerNameMap, playerHandicapMap } =
    datos;
  const { isProcessing } = acciones;
  const maxPlayingHandicap = competition.maxPlayingHandicap ?? null;

  return (
    <>
      {/* Walkover Modal */}
      {modales.showWalkoverModal && modales.walkoverMatch && (
        <WalkoverModal
          isOpen={modales.showWalkoverModal}
          onClose={modales.cerrarWalkover}
          onConfirm={acciones.handleDeclareWalkover}
          matchNumber={modales.walkoverMatch.matchNumber}
          isProcessing={isProcessing}
          teamNames={teamNames}
          t={t}
        />
      )}

      {/* Reassign Players Modal */}
      {modales.showReassignModal && modales.reassignMatch && (
        <ReassignPlayersModal
          isOpen={modales.showReassignModal}
          onClose={modales.cerrarReasignar}
          onConfirm={acciones.handleReassignPlayers}
          match={modales.reassignMatch}
          enrollments={enrollments}
          isProcessing={isProcessing}
          teamNames={teamNames}
          inscritosSinCargar={inscritosSinCargar}
          t={t}
        />
      )}

      {/* Match Detail Modal */}
      {modales.showMatchDetailModal && modales.detailMatchId && (
        <MatchDetailModal
          isOpen={modales.showMatchDetailModal}
          onClose={modales.cerrarDetalle}
          matchId={modales.detailMatchId}
          playerNameMap={playerNameMap}
          playerHandicapMap={playerHandicapMap}
          maxPlayingHandicap={maxPlayingHandicap}
          teamNames={teamNames}
          t={t}
          canManage={canManage}
          matchFormat={
            rounds.find((r) =>
              r.matches?.some((m) => m.id === modales.detailMatchId),
            )?.matchFormat ?? null
          }
        />
      )}

      {/* Deshacer los equipos: siempre con confirmación (F7, 30 oct 2026) */}
      <ConfirmModal
        isOpen={modales.deshaciendoEquipos}
        title={t('teams.undoConfirm.title')}
        message={t('teams.undoConfirm.body')}
        confirmText={t('teams.undoConfirm.confirm')}
        cancelText={t('teams.undoConfirm.keep')}
        onConfirm={acciones.handleUndoTeams}
        onCancel={() => modales.setDeshaciendoEquipos(false)}
        isDestructive
        isLoading={isProcessing}
      />

      {/* Assign Teams Modal */}
      {modales.showTeamsModal && (
        <AssignTeamsModal
          isOpen={modales.showTeamsModal}
          onClose={() => modales.setShowTeamsModal(false)}
          onConfirm={acciones.handleAssignTeams}
          enrollments={enrollments}
          isProcessing={isProcessing}
          teamNames={teamNames}
          captains={competition.captains}
          inscritosSinCargar={inscritosSinCargar}
          t={t}
        />
      )}

      {/* Cubrir el puesto de un capitán que se fue tras el reparto (FE #692) */}
      {modales.cubriendoCapitan && (
        <FillCaptainModal
          isOpen
          team={modales.cubriendoCapitan}
          teamName={
            modales.cubriendoCapitan === 'A' ? teamNames.teamA : teamNames.teamB
          }
          players={jugadoresDelEquipo({
            equipo: modales.cubriendoCapitan,
            teamAssignment,
            enrollments,
            playerNameMap,
            sinNombre: () => t('unnamedPlayer'),
          })}
          onConfirm={acciones.cubrirCapitan}
          onClose={() => modales.setCubriendoCapitan(null)}
          isLoading={isProcessing}
          t={t}
        />
      )}

      {/* Generate Matches Modal */}
      {modales.showGenerateModal && modales.generateRound && (
        <GenerateMatchesModal
          isOpen={modales.showGenerateModal}
          onClose={modales.cerrarGenerar}
          onConfirm={(pairings) =>
            acciones.handleGenerateMatches(modales.generateRound.id, pairings)
          }
          round={modales.generateRound}
          bloqueo={
            rounds.find((r) => r.id === modales.generateRound.id)
              ?.matchGenerationBlock ?? null
          }
          enrollments={enrollments}
          teamAssignment={teamAssignment}
          isProcessing={isProcessing}
          teamNames={teamNames}
          playerNameMap={playerNameMap}
          setupMode={competition?.setupMode}
          t={t}
        />
      )}

      {/* Rehacer los sobres de una sesión (FE #655) */}
      {modales.rehaciendoSobres && (
        <ResetEnvelopesModal
          isOpen={Boolean(modales.rehaciendoSobres)}
          onConfirm={acciones.rehacerSobres}
          onClose={() => modales.setRehaciendoSobres(null)}
          isLoading={isProcessing}
          t={tComp}
        />
      )}
    </>
  );
};

export default ModalesDeLaAgenda;
