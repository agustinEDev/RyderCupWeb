import { useState } from 'react';
import customToast from '../utils/toast';
import {
  generateMatchesUseCase,
  assignTeamsUseCase,
  undoTeamsUseCase,
  fillCaptainUseCase,
  updateMatchStatusUseCase,
  declareWalkoverUseCase,
  reassignPlayersUseCase,
  resetEnvelopesUseCase,
} from '../composition';
import { mensajeDeError } from '../utils/sinCobertura';
import { mensajeDelError } from '../utils/mensajeDelError';
import { registraElFallo } from '../utils/registraElFallo';

// Empezar y terminar un partido son la misma llamada: cambia la acción y con
// qué clave se apunta el fallo
const FALLOS_DEL_CAMBIO_DE_ESTADO = {
  start: {
    clave: 'SchedulePage.error-starting-match',
    mensaje: 'Error starting match:',
  },
  complete: {
    clave: 'SchedulePage.error-completing-match',
    mensaje: 'Error completing match:',
  },
};

/**
 * Lo que el organizador hace desde la agenda: generar partidos, empezarlos y
 * terminarlos, walkovers, reasignar, repartir y deshacer equipos, cubrir un
 * capitán y rehacer los sobres. Cada acción marca `isProcessing` mientras dura.
 *
 * @param {Object} params
 * @param {string} params.id - La competición.
 * @param {Function} params.t - Las traducciones de la agenda.
 * @param {Function} params.tComp - Las de competiciones (los sobres).
 * @param {Object} params.datos - Lo de useDatosDeLaAgenda.
 * @param {Object} params.modales - Lo de useModalesDeLaAgenda.
 */
export const useAccionesDeLaAgenda = ({ id, t, tComp, datos, modales }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const {
    setCompetition,
    recargarTodo,
    recargarCompeticion,
    reloadSchedule,
    recargarTrasGeneracionBloqueada,
  } = datos;

  const cubrirCapitan = async (playerId) => {
    setIsProcessing(true);
    try {
      const { captains } = await fillCaptainUseCase.execute(
        id,
        modales.cubriendoCapitan,
        playerId,
      );
      setCompetition((prev) => ({ ...prev, captains }));
      modales.setCubriendoCapitan(null);
      customToast.success(t('success.captainFilled'));
    } catch (error) {
      registraElFallo(
        'SchedulePage.error-filling-captain',
        'Error filling captain:',
        error,
      );
      customToast.error(
        mensajeDelError(error, t('errors.failedToFillCaptain')),
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const rehacerSobres = async () => {
    setIsProcessing(true);
    try {
      await resetEnvelopesUseCase.execute(modales.rehaciendoSobres);
      modales.setRehaciendoSobres(null);
      customToast.success(tComp('envelope.resetDone'));
      recargarTodo();
    } catch (error) {
      // El servidor es quien sabe si esa sesión ya se jugó o si no había nada
      // que rehacer: aquí se enseña lo que diga
      customToast.error(mensajeDelError(error, t('common:errors.generic')));
    } finally {
      setIsProcessing(false);
    }
  };

  // El servidor lo ha apuntado en la sesión, en claves (BE #360), y el modal lo
  // enseña en su idioma, con quién y qué. Abierto: cerrarlo tiraba los
  // emparejamientos hechos a mano. Con las inscripciones: un retirado no puede
  // seguir ofreciéndose. Y con la competición: si la reabrieron entretanto,
  // «Generar» deja de ofrecerse
  const recargarTrasBloqueo = async (error) => {
    try {
      await recargarTrasGeneracionBloqueada();
    } catch (recarga) {
      // Sin la sesión recargada no hay motivo que enseñar: la frase del
      // servidor, que también dice quién
      registraElFallo(
        'SchedulePage.reloading-after-a-blocked-generation',
        'Error reloading after a blocked generation:',
        recarga,
      );
      customToast.error(
        mensajeDelError(error, t('errors.failedToGenerateMatches')),
      );
    }
  };

  const handleGenerateMatches = async (roundId, manualPairings = null) => {
    setIsProcessing(true);
    try {
      const pairings = manualPairings ? { manualPairings } : {};
      await generateMatchesUseCase.execute(roundId, pairings);
      customToast.success(t('success.matchesGenerated'));
      modales.cerrarGenerar();
      await reloadSchedule();
    } catch (error) {
      registraElFallo(
        'SchedulePage.error-generating-matches',
        'Error generating matches:',
        error,
      );
      if (error?.errorCode === 'MATCH_GENERATION_BLOCKED') {
        await recargarTrasBloqueo(error);
      } else {
        customToast.error(
          mensajeDelError(error, t('errors.failedToGenerateMatches')),
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Match handlers ---
  const cambiarEstadoDelPartido = async (matchId, accion) => {
    setIsProcessing(true);
    try {
      await updateMatchStatusUseCase.execute(matchId, accion);
      customToast.success(t('success.matchStatusUpdated'));
      await reloadSchedule();
    } catch (error) {
      const { clave, mensaje } = FALLOS_DEL_CAMBIO_DE_ESTADO[accion];
      registraElFallo(clave, mensaje, error);
      customToast.error(
        mensajeDelError(error, t('errors.failedToUpdateMatchStatus')),
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeclareWalkover = async (winningTeam, reason) => {
    if (!modales.walkoverMatch) return;
    setIsProcessing(true);
    try {
      await declareWalkoverUseCase.execute(
        modales.walkoverMatch.id,
        winningTeam,
        reason,
      );
      customToast.success(t('success.walkoverDeclared'));
      modales.cerrarWalkover();
      await reloadSchedule();
    } catch (error) {
      registraElFallo(
        'SchedulePage.error-declaring-walkover',
        'Error declaring walkover:',
        error,
      );
      customToast.error(
        mensajeDelError(error, t('errors.failedToDeclareWalkover')),
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReassignPlayers = async (teamAIds, teamBIds) => {
    if (!modales.reassignMatch) return;
    setIsProcessing(true);
    try {
      await reassignPlayersUseCase.execute(
        modales.reassignMatch.id,
        teamAIds,
        teamBIds,
      );
      customToast.success(t('success.playersReassigned'));
      modales.cerrarReasignar();
      await reloadSchedule();
    } catch (error) {
      registraElFallo(
        'SchedulePage.error-reassigning-players',
        'Error reassigning players:',
        error,
      );
      customToast.error(
        mensajeDelError(error, t('errors.failedToReassignPlayers')),
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Con su código, en cristiano (29 oct 2026): formados quedan así, y con la
  // sala de draft abierta se espera a que termine
  const avisarDelFalloAlRepartir = async (error) => {
    if (error?.errorCode === 'DRAFT_IN_PROGRESS') {
      customToast.error(t('errors.waitForDraft'));
    } else if (error?.errorCode === 'TEAMS_FORMED') {
      customToast.error(t('errors.teamsFormed'));
      modales.setShowTeamsModal(false);
      await Promise.all([reloadSchedule(), recargarCompeticion()]);
    } else {
      customToast.error(
        mensajeDelError(error, t('errors.failedToAssignTeams')),
      );
    }
  };

  // --- Team assignment handler ---
  const handleAssignTeams = async (teamData) => {
    setIsProcessing(true);
    try {
      await assignTeamsUseCase.execute(id, teamData);
      customToast.success(t('success.teamsAssigned'));
      modales.setShowTeamsModal(false);
      // La competición también: repartir libera los subcapitanes en el servidor
      // (RyderCupAM#320), y sin recargarla la etiqueta seguiría pegada a quien
      // ya no lo es
      await Promise.all([reloadSchedule(), recargarCompeticion()]);
    } catch (error) {
      registraElFallo(
        'SchedulePage.error-assigning-teams',
        'Error assigning teams:',
        error,
      );
      await avisarDelFalloAlRepartir(error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Deshacer los equipos para que entre alguien (30 oct 2026): el mismo
  // reinicio que al quitar a un jugador, y se repite el draft
  const handleUndoTeams = async () => {
    setIsProcessing(true);
    try {
      await undoTeamsUseCase.execute(id);
      customToast.success(t('success.teamsUndone'));
    } catch (error) {
      registraElFallo(
        'SchedulePage.error-undoing-teams',
        'Error undoing teams:',
        error,
      );
      // Ya deshechos (otra pestaña, o al quitar a alguien): basta con releer
      if (error?.errorCode !== 'NO_TEAMS') {
        customToast.error(
          error?.errorCode === 'TEAMS_LOCKED'
            ? t('errors.teamsLocked')
            : mensajeDeError(error, {
                sinConexion: t('common:sinConexion.mensaje'),
                generico: t('errors.failedToUndoTeams'),
              }),
        );
      }
    }
    modales.setDeshaciendoEquipos(false);
    // Haya ido bien o no, la agenda al día: sin equipos, o con los partidos
    // que no se veían. Hasta entonces sigue en curso: si no, el botón volvía
    // antes y un segundo toque daba NO_TEAMS (revisor)
    try {
      await Promise.all([reloadSchedule(), recargarCompeticion()]);
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isProcessing,
    cubrirCapitan,
    rehacerSobres,
    handleGenerateMatches,
    handleStartMatch: (matchId) => cambiarEstadoDelPartido(matchId, 'start'),
    handleCompleteMatch: (matchId) =>
      cambiarEstadoDelPartido(matchId, 'complete'),
    handleDeclareWalkover,
    handleReassignPlayers,
    handleAssignTeams,
    handleUndoTeams,
  };
};
