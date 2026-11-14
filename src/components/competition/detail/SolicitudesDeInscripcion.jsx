import { AlertCircle, UserX, ChevronRight } from 'lucide-react';
import TituloConNumero from '../../ui/TituloConNumero';
import { formatoDeIndice } from '../../../utils/formatoDeHandicap';

/**
 * Las solicitudes pendientes (aprobar o rechazar) y las rechazadas, plegadas.
 * Solo las ve quien organiza.
 */
const SolicitudesDeInscripcion = ({
  competition,
  enrollments,
  t,
  i18n,
  isFull,
  handleApproveEnrollment,
  handleRejectEnrollment,
}) => (
  <div className="px-4 space-y-4">
    {/* Pending Requests Section */}
    {enrollments.filter((e) => e.status === 'REQUESTED').length > 0 && (
      <div className="bg-white border border-orange-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-gray-900 font-bold text-base sm:text-lg mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-none text-orange-600" />
          <TituloConNumero
            texto={t('detail.pendingRequests')}
            numero={enrollments.filter((e) => e.status === 'REQUESTED').length}
          />
        </h3>

        <div className="space-y-3">
          {enrollments
            .filter((e) => e.status === 'REQUESTED')
            .map((enrollment) => (
              <div
                key={enrollment.id}
                data-testid={`pendiente-${enrollment.userId}`}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border border-orange-200 rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors"
              >
                {/* `min-w-0` y el correo partible: uno largo se salía
                    de la tarjeta (FE #744, gemelo de las rechazadas) */}
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 font-semibold break-words">
                    {enrollment.userName || t('detail.unknownUser')}
                  </p>
                  <p className="text-gray-600 text-sm wrap-anywhere">
                    {enrollment.userEmail || t('detail.noEmail')}
                  </p>
                  {enrollment.userHandicap !== null &&
                    enrollment.userHandicap !== undefined && (
                      <p className="text-gray-500 text-sm mt-1">
                        {t('detail.handicapLabel', {
                          handicap: formatoDeIndice(
                            enrollment.userHandicap,
                            i18n.language,
                          ),
                        })}
                      </p>
                    )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => handleApproveEnrollment(enrollment.id)}
                    disabled={isFull}
                    className={`px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors shadow-sm ${
                      isFull
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                    title={
                      isFull
                        ? t('detail.competitionFull', {
                            max: competition.maxPlayers,
                          })
                        : t('detail.approve')
                    }
                  >
                    ✓ {t('detail.approve')}
                  </button>
                  <button
                    onClick={() => handleRejectEnrollment(enrollment.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors shadow-sm"
                    title={t('detail.reject')}
                  >
                    ✗ {t('detail.reject')}
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>
    )}

    {/* Solicitudes rechazadas, plegadas (FE #744). En gris: un rechazo
        no es un error. Flecha propia en vez del triángulo del
        navegador, que iba suelto en su línea, y filas que no se
        salen de su tarjeta aunque el correo sea largo */}
    {enrollments.some((e) => e.status === 'REJECTED') && (
      <details
        data-testid="solicitudes-rechazadas"
        className="group bg-white border border-gray-200 rounded-xl shadow-sm"
      >
        <summary className="flex items-center gap-3 p-4 cursor-pointer list-none rounded-xl hover:bg-gray-50 [&::-webkit-details-marker]:hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <span className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-gray-100 text-gray-500">
            <UserX className="h-4 w-4" aria-hidden="true" />
          </span>
          <TituloConNumero
            texto={t('detail.rejectedRequests')}
            numero={enrollments.filter((e) => e.status === 'REJECTED').length}
            claseDelTexto="font-semibold text-gray-700"
          />
          <ChevronRight
            className="h-4 w-4 flex-none text-gray-400 transition-transform group-open:rotate-90 motion-reduce:transition-none"
            aria-hidden="true"
          />
        </summary>
        <div className="space-y-2 border-t border-gray-100 px-4 pb-4 pt-3">
          {enrollments
            .filter((e) => e.status === 'REJECTED')
            .map((enrollment) => (
              <div
                key={enrollment.id}
                data-testid={`rechazada-${enrollment.userId}`}
                className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-700 break-words">
                    {enrollment.userName || t('detail.unknownUser')}
                  </p>
                  <p className="text-xs text-gray-500 wrap-anywhere">
                    {enrollment.userEmail || t('detail.noEmail')}
                  </p>
                </div>
                <span className="flex-none rounded-full bg-gray-200 px-2 py-0.5 text-[10.5px] font-bold tracking-wide text-gray-600">
                  {t('detail.rejected')}
                </span>
              </div>
            ))}
        </div>
      </details>
    )}
  </div>
);

export default SolicitudesDeInscripcion;
