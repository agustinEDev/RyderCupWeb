import { useState } from 'react';
import { claveDeFallo } from '../utils/textosDePartidaRapida';

/**
 * Los dos avisos de cierre de la anotación de partida rápida
 * (`QuickMatchScoringPage`): terminar y anular, abiertos o no, y la clave del
 * fallo de cada uno. Solo estado, sin efectos.
 *
 * La clave del aviso, no un booleano: un 409 —ya la cerró otro— y quedarse
 * sin cobertura piden explicaciones distintas.
 */
export const useDialogosDeCierreRapida = () => {
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelFailedKey, setCancelFailedKey] = useState(null);
  const [finishFailedKey, setFinishFailedKey] = useState(null);
  return {
    showFinishConfirm,
    setShowFinishConfirm,
    showCancelConfirm,
    setShowCancelConfirm,
    cancelFailedKey,
    setCancelFailedKey,
    finishFailedKey,
    setFinishFailedKey,
  };
};

/**
 * Lo que hace cada botón de la anotación de partida rápida: anotar, moverse
 * entre hoyos sin salirse de la vuelta, y pedir, confirmar o cerrar terminar
 * y anular. No es un hook: se rehace en cada pintado, como antes en la página.
 *
 * @param {{
 *   dialogos: ReturnType<typeof useDialogosDeCierreRapida>,
 *   currentHole: number,
 *   totalHoles: number,
 *   setCurrentHole: (hoyo: number) => void,
 *   submitScore: Function,
 *   completeMatch: () => Promise<any>,
 *   cancelMatch: () => Promise<any>,
 *   refetch: () => void,
 * }} datos
 */
export const accionesDeAnotarRapida = ({
  dialogos,
  currentHole,
  totalHoles,
  setCurrentHole,
  submitScore,
  completeMatch,
  cancelMatch,
  refetch,
}) => {
  const {
    setShowFinishConfirm,
    setShowCancelConfirm,
    setCancelFailedKey,
    setFinishFailedKey,
  } = dialogos;

  const handleScoreChange = (participantId, score) => {
    submitScore(currentHole, participantId, score);
  };

  const handlePrevHole = () => {
    if (currentHole > 1) setCurrentHole(currentHole - 1);
  };

  const handleNextHole = () => {
    if (currentHole < totalHoles) setCurrentHole(currentHole + 1);
  };

  const handleFinishConfirm = async () => {
    setFinishFailedKey(null);
    const { ok, error } = (await completeMatch()) ?? {};
    if (ok) {
      setShowFinishConfirm(false);
      return;
    }
    setFinishFailedKey(claveDeFallo('scoring.finish', error));
    refetch();
  };

  const handleCancelConfirm = async () => {
    // Solo se cierra si de verdad se cancelo, y el fallo se cuenta AQUI dentro:
    // el aviso general vive detras del velo del dialogo y su texto habla de
    // anotar —«no se ha podido guardar el resultado»—, que no es lo que acaba
    // de pasar.
    setCancelFailedKey(null);
    const { ok, error } = (await cancelMatch()) ?? {};
    if (ok) {
      setShowCancelConfirm(false);
      return;
    }
    setCancelFailedKey(claveDeFallo('scoring.cancelMatch', error));
    // Recargar: si fallo porque otro dispositivo ya la cerro, el estado nuevo
    // se lleva por delante los botones que ya no valen.
    refetch();
  };

  return {
    handleScoreChange,
    handlePrevHole,
    handleNextHole,
    handleFinishConfirm,
    handleCancelConfirm,
    pedirTerminar: () => setShowFinishConfirm(true),
    pedirCancelar: () => setShowCancelConfirm(true),
    cerrarTerminar: () => {
      setFinishFailedKey(null);
      setShowFinishConfirm(false);
    },
    cerrarCancelar: () => {
      setCancelFailedKey(null);
      setShowCancelConfirm(false);
    },
  };
};
