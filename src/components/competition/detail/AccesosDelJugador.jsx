import { Calendar, UserPlus, BarChart3 } from 'lucide-react';

/**
 * Lo que la ficha ofrece a quien no la organiza: la clasificación, el
 * calendario de sus partidos, pedir plaza o, con los equipos formados, por
 * qué ya no se puede.
 */
const AccesosDelJugador = ({
  competition,
  t,
  canManage,
  isCreator,
  esStrokePlay,
  userEnrollment,
  hasEnrollment,
  bloqueaElMaximo,
  isProcessing,
  irALaClasificacion,
  alVerCalendario,
  alPedirPlaza,
}) => (
  <>
    {/* La clasificación, para todo el mundo. A quien organiza NO se le
        repite: en un torneo en juego es su acción principal, y
        ofrecerla dos veces es lo que venía a arreglar el FE #705 */}
    {!canManage &&
      (competition.status === 'IN_PROGRESS' ||
        competition.status === 'COMPLETED') && (
        <div className="p-4">
          <button
            onClick={irALaClasificacion}
            className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors shadow-md"
          >
            <BarChart3 className="w-5 h-5" />
            <span>{t('detail.actions.leaderboard')}</span>
          </button>
        </div>
      )}

    {/* View Schedule Button - For enrolled players (not creators/admins) */}
    {!canManage &&
      !esStrokePlay &&
      competition.status !== 'DRAFT' &&
      competition.status !== 'CANCELLED' &&
      (userEnrollment?.status === 'APPROVED' ||
        competition.enrollment_status === 'APPROVED') && (
        <div className="p-4">
          <button
            onClick={alVerCalendario}
            className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-md"
          >
            <Calendar className="w-5 h-5" />
            <span>{t('detail.actions.viewSchedule')}</span>
          </button>
        </div>
      )}

    {/* Pedir plaza: abierta, pública, sin estar ya dentro ni ser quien la
        creó, sin invitación pendiente, y con sitio. En una privada se entra por invitación, y el
        servidor lo rechaza (FE #734) */}
    {!isCreator &&
      competition.status === 'ACTIVE' &&
      competition.visibility === 'PUBLIC' &&
      !hasEnrollment &&
      // Con invitación pendiente, el cuadro: aceptarla ya inscribe
      // (decidido el 27 oct)
      !competition.myPendingInvitation &&
      // Con los equipos formados no entra nadie por su cuenta (29 oct 2026)
      !competition.teamsAssigned &&
      !bloqueaElMaximo && (
        <div className="p-4">
          <button
            onClick={alPedirPlaza}
            disabled={isProcessing}
            className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-md disabled:opacity-50"
          >
            <UserPlus className="w-5 h-5" />
            <span>{t('detail.actions.request-to-join')}</span>
          </button>
        </div>
      )}

    {!isCreator &&
      competition.status === 'ACTIVE' &&
      competition.visibility === 'PUBLIC' &&
      !hasEnrollment &&
      !competition.myPendingInvitation &&
      competition.teamsAssigned && (
        <p className="px-4 pt-4 text-sm text-gray-600">
          {t('detail.teamsFormed.closed')}
        </p>
      )}
  </>
);

export default AccesosDelJugador;
