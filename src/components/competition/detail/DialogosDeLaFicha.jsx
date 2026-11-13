import ConfirmModal from '../../modals/ConfirmModal';
import NameCaptainsModal from '../NameCaptainsModal';
import { textoDelBorrado } from '../../../utils/fichaDeLaCompeticion';

/**
 * Los diálogos de la ficha: la pregunta de cada acción (con sus palabras, FE
 * #742), el borrado que dice quién pierde su plaza (FE #667) y el de nombrar
 * capitanes (FE #692).
 */
const DialogosDeLaFicha = ({
  t,
  pregunta,
  contestar,
  confirmandoBorrado,
  inscripcionesSinCargar,
  estoyInscrito,
  otrosInscritos,
  confirmarBorrado,
  alCancelarBorrado,
  borrando,
  nombrandoCapitanes,
  approvedEnrollments,
  competition,
  confirmarCapitanes,
  alCerrarCapitanes,
  guardandoCapitanes,
}) => (
  <>
    <ConfirmModal
      isOpen={Boolean(pregunta)}
      title={pregunta ? t(`detail.confirmDialogs.${pregunta.accion}.title`, pregunta.datos) : ''}
      message={pregunta ? t(`detail.confirmDialogs.${pregunta.accion}.body`, pregunta.datos) : ''}
      confirmText={pregunta ? t(`detail.confirmDialogs.${pregunta.accion}.confirm`) : ''}
      cancelText={pregunta ? t(`detail.confirmDialogs.${pregunta.accion}.keep`) : ''}
      onConfirm={() => contestar(true)}
      onCancel={() => contestar(false)}
      isDestructive={pregunta?.destructiva}
    />

    <ConfirmModal
      isOpen={confirmandoBorrado}
      title={t('detail.deleteModal.title')}
      message={textoDelBorrado(t, { inscripcionesSinCargar, estoyInscrito, otrosInscritos })}
      confirmText={t('detail.deleteModal.confirm')}
      cancelText={t('detail.deleteModal.keep')}
      onConfirm={confirmarBorrado}
      onCancel={alCancelarBorrado}
      isDestructive
      isLoading={borrando}
    />

    <NameCaptainsModal
      // Montado de nuevo al abrir: arranca con los capitanes de ahora
      key={nombrandoCapitanes ? 'capitanes-abierto' : 'capitanes-cerrado'}
      isOpen={nombrandoCapitanes}
      players={approvedEnrollments.map((e) => ({
        userId: e.userId,
        name: e.userName || t('detail.unknownUser'),
        // El que cuenta aquí: el propio de la competición, si se le puso
        handicap: e.hasCustomHandicap ? e.customHandicap : (e.userHandicap ?? null),
      }))}
      teamNames={{ a: competition.team1Name, b: competition.team2Name }}
      current={competition.captains}
      closesEnrollment={competition.status === 'ACTIVE'}
      playersUnavailable={inscripcionesSinCargar}
      onConfirm={confirmarCapitanes}
      onClose={alCerrarCapitanes}
      isLoading={guardandoCapitanes}
    />
  </>
);

export default DialogosDeLaFicha;
