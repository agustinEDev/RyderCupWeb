import { useState } from 'react';

/**
 * Qué diálogo de la agenda está abierto, y con qué partido o sesión. Vive en
 * la pantalla y no en los diálogos: mientras la agenda recarga entera se pinta
 * la espera, y lo abierto tiene que seguir así al volver.
 *
 * Los diálogos de un partido o una sesión guardan solo eso: con él, abierto;
 * `null`, cerrado. No hay un «abierto» aparte que se pueda desacompasar.
 */
export const useModalesDeLaAgenda = () => {
  // Cubrir el puesto de un capitán que se fue tras el reparto (FE #692)
  const [cubriendoCapitan, setCubriendoCapitan] = useState(null);
  // La sesión cuyos sobres se van a rehacer, mientras se confirma
  const [rehaciendoSobres, setRehaciendoSobres] = useState(null);
  const [walkoverMatch, setWalkoverMatch] = useState(null);
  const [reassignMatch, setReassignMatch] = useState(null);
  const [detailMatchId, setDetailMatchId] = useState(null);
  const [generateRound, setGenerateRound] = useState(null);
  const [showTeamsModal, setShowTeamsModal] = useState(false);
  const [deshaciendoEquipos, setDeshaciendoEquipos] = useState(false);

  return {
    cubriendoCapitan,
    setCubriendoCapitan,
    rehaciendoSobres,
    setRehaciendoSobres,
    walkoverMatch,
    abrirWalkover: setWalkoverMatch,
    cerrarWalkover: () => setWalkoverMatch(null),
    reassignMatch,
    abrirReasignar: setReassignMatch,
    cerrarReasignar: () => setReassignMatch(null),
    detailMatchId,
    abrirDetalle: setDetailMatchId,
    cerrarDetalle: () => setDetailMatchId(null),
    generateRound,
    abrirGenerar: setGenerateRound,
    cerrarGenerar: () => setGenerateRound(null),
    showTeamsModal,
    setShowTeamsModal,
    deshaciendoEquipos,
    setDeshaciendoEquipos,
  };
};
