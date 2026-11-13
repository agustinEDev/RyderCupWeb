import ConcedeMatchModal from './ConcedeMatchModal';
import EarlyEndModal from './EarlyEndModal';
import SessionBlockedModal from './SessionBlockedModal';
import SubmitScorecardModal from './SubmitScorecardModal';
import { resultadoParaElAviso } from '../../utils/lecturaDelPartido';

/**
 * Los cuatro avisos de la anotación de competición (`ScoringPage`): la sesión
 * tomada en otra pantalla, el partido decidido, conceder y entregar la
 * tarjeta. Sin estado ni efectos: lo que se abre y lo que se hace llegan de la
 * página.
 */
const ModalesDelPartido = ({
  scoringView,
  isSessionBlocked,
  onSessionTakeOver,
  volver,
  showEarlyEnd,
  canSubmitScorecard,
  onEarlyEndConfirm,
  onEarlyEndClose,
  showConcedeModal,
  cerradoSinJugar,
  onConcede,
  onConcedeClose,
  showSubmitModal,
  validatedHoles,
  holesToSubmit,
  isSubmitting,
  onSubmitScorecard,
  onSubmitClose,
}) => (
  <>
    <SessionBlockedModal
      isOpen={isSessionBlocked}
      onTakeOver={onSessionTakeOver}
      onGoBack={volver}
    />

    <EarlyEndModal
      isOpen={showEarlyEnd}
      listaParaEnviar={canSubmitScorecard}
      decidedResult={resultadoParaElAviso(scoringView)}
      onConfirm={onEarlyEndConfirm}
      onClose={onEarlyEndClose}
    />

    <ConcedeMatchModal
      // Cerrado mientras estaba abierto, ya no hay nada que conceder ni que
      // entregar, aunque llegue sin ganador (CodeRabbit en la #735)
      isOpen={showConcedeModal && !scoringView?.isDecided && !cerradoSinJugar}
      onConfirm={onConcede}
      onClose={onConcedeClose}
    />

    <SubmitScorecardModal
      isOpen={showSubmitModal && canSubmitScorecard && !cerradoSinJugar}
      validatedHoles={validatedHoles}
      totalHoles={holesToSubmit}
      isSubmitting={isSubmitting}
      onConfirm={onSubmitScorecard}
      onClose={onSubmitClose}
    />
  </>
);

export default ModalesDelPartido;
