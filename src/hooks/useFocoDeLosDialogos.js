import { useEffect, useRef } from 'react';

/**
 * El foco y la tecla Escape de los tres avisos de la anotación de partida
 * rápida (`QuickMatchScoringPage`): terminar, cancelar y el desacuerdo. Da las
 * referencias de los tres y la de las pestañas, adonde vuelve el foco si el
 * botón que abrió el aviso ya no existe.
 *
 * Dos efectos, en este orden: el foco y la tecla.
 */
export const useFocoDeLosDialogos = ({
  showFinishConfirm,
  showCancelConfirm,
  hayDiscrepancia,
  isSubmitting,
  setFinishFailedKey,
  setCancelFailedKey,
  setShowFinishConfirm,
  setShowCancelConfirm,
}) => {
  const cancelDialogRef = useRef(null);
  const finishDialogRef = useRef(null);
  const discrepanciaDialogRef = useRef(null);
  const focoPrevioRef = useRef(null);
  const tabsRef = useRef(null);

  useEffect(() => {
    // El foco entra en el aviso al abrirse. Sin esto se queda en el boton de
    // debajo del velo: el tabulador pasea por la pagina de detras y un lector
    // de pantalla no llega a leer ni la advertencia ni el fallo. El
    // atrapamiento completo del foco es otra cosa, y va en #389.
    if (showCancelConfirm || showFinishConfirm || hayDiscrepancia) {
      // `body` no cuenta como foco previo: en Safari tocar un boton no lo
      // enfoca, y guardarlo hacia que al cerrar se «restaurara» a body —que no
      // hace nada— y el respaldo de las pestanas no se usara jamas.
      // Solo al abrirse el primero: si se reescribiera al abrirse otro, lo
      // guardado seria el contenedor del aviso anterior, que al cerrarse ya no
      // esta en la pagina, y el foco caeria en las pestanas
      if (!focoPrevioRef.current) {
        const activo = document.activeElement;
        focoPrevioRef.current = activo && activo !== document.body ? activo : null;
      }
      const cual = showCancelConfirm ? cancelDialogRef
        : showFinishConfirm ? finishDialogRef
        : discrepanciaDialogRef;
      cual.current?.focus();
      return;
    }
    // Y al cerrarse vuelve donde estaba: el contenedor enfocado se desmonta y
    // el foco caeria al principio de la pagina, dejando tirado a quien navega
    // con teclado o lector de pantalla. Si el boton que lo abrio ya no existe
    // —al cancelar de verdad, desaparece— el foco va a la pestana abierta,
    // que sigue ahi (a ella y no a la barra: la barra no es enfocable en el
    // patron de pestanas, y desde ella las flechas no hacian nada).
    // Sin foco guardado no ha habido ningun aviso abierto —esto corre tambien
    // al montar la pagina— y aqui no hay nada que devolver: tocarlo movia el
    // foco a las pestanas en cada carga.
    const previo = focoPrevioRef.current;
    if (!previo) return;
    focoPrevioRef.current = null;
    if (previo.isConnected) {
      previo.focus?.();
      return;
    }
    tabsRef.current?.querySelector('[role="tab"][aria-selected="true"]')?.focus();
  }, [showFinishConfirm, showCancelConfirm, hayDiscrepancia]);

  useEffect(() => {
    if (!showFinishConfirm && !showCancelConfirm) return;
    const handleKeyDown = (e) => {
      if (e.key !== 'Escape' || isSubmitting) return;
      // Tambien el aviso de fallo: si no, el dialogo se volvia a abrir la
      // proxima vez con el error de la vez anterior ya puesto.
      setFinishFailedKey(null);
      setCancelFailedKey(null);
      setShowFinishConfirm(false);
      setShowCancelConfirm(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    // Los `set` son de la página y no cambian nunca
  }, [showFinishConfirm, showCancelConfirm, isSubmitting, setFinishFailedKey, setCancelFailedKey, setShowFinishConfirm, setShowCancelConfirm]);

  return { cancelDialogRef, finishDialogRef, discrepanciaDialogRef, tabsRef };
};
