import { useState } from 'react';

/**
 * Qué diálogo de la agenda está abierto, y con qué partido o sesión. Vive en
 * la pantalla y no en los diálogos: mientras la agenda recarga entera se pinta
 * la espera, y lo abierto tiene que seguir así al volver.
 */
export const useModalesDeLaAgenda = () => {
  // Cubrir el puesto de un capitán que se fue tras el reparto (FE #692)
  const [cubriendoCapitan, setCubriendoCapitan] = useState(null);
  // La sesión cuyos sobres se van a rehacer, mientras se confirma
  const [rehaciendoSobres, setRehaciendoSobres] = useState(null);
  const [showWalkoverModal, setShowWalkoverModal] = useState(false);
  const [walkoverMatch, setWalkoverMatch] = useState(null);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignMatch, setReassignMatch] = useState(null);
  const [showMatchDetailModal, setShowMatchDetailModal] = useState(false);
  const [detailMatchId, setDetailMatchId] = useState(null);
  const [showTeamsModal, setShowTeamsModal] = useState(false);
  const [deshaciendoEquipos, setDeshaciendoEquipos] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateRound, setGenerateRound] = useState(null);

  return {
    cubriendoCapitan,
    setCubriendoCapitan,
    rehaciendoSobres,
    setRehaciendoSobres,
    showWalkoverModal,
    walkoverMatch,
    abrirWalkover: (match) => {
      setWalkoverMatch(match);
      setShowWalkoverModal(true);
    },
    cerrarWalkover: () => {
      setShowWalkoverModal(false);
      setWalkoverMatch(null);
    },
    showReassignModal,
    reassignMatch,
    abrirReasignar: (match) => {
      setReassignMatch(match);
      setShowReassignModal(true);
    },
    cerrarReasignar: () => {
      setShowReassignModal(false);
      setReassignMatch(null);
    },
    showMatchDetailModal,
    detailMatchId,
    abrirDetalle: (matchId) => {
      setDetailMatchId(matchId);
      setShowMatchDetailModal(true);
    },
    cerrarDetalle: () => {
      setShowMatchDetailModal(false);
      setDetailMatchId(null);
    },
    showTeamsModal,
    setShowTeamsModal,
    deshaciendoEquipos,
    setDeshaciendoEquipos,
    showGenerateModal,
    generateRound,
    abrirGenerar: (round) => {
      setGenerateRound(round);
      setShowGenerateModal(true);
    },
    cerrarGenerar: () => {
      setShowGenerateModal(false);
      setGenerateRound(null);
    },
  };
};
