import { AlertCircle } from 'lucide-react';
import { getEnrollmentStatusColor } from '../../../services/competitions';
import { etiquetaDeInscripcion } from '../../../utils/etiquetaDeInscripcion';
import { diaCortoDeLaFicha } from '../../../utils/fichaDeLaCompeticion';

/**
 * El estado de la inscripción propia (o su puesto en una espera) y, si tiene
 * alias, con qué nombre sale en ESTA competición (FE #571).
 */
const MiInscripcion = ({
  competition,
  user,
  // El género llega leído por la página, que es la que figura en la auditoría de la
  // copia sin conexión (copiaDelUsuarioSinConexion.test.js): no leer aquí user.gender
  generoDelUsuario,
  t,
  i18n,
  isCreator,
  userEnrollment,
  soloEspero,
  miEspera,
  puestoEnEspera,
  puedeElegirNombre,
  usaSuAlias,
  nombreLegal,
  savingNamePreference,
  handleToggleNamePreference,
}) => (
  <div className="p-4">
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-blue-600" />
        <span className="text-blue-900 font-medium">
          {t('detail.enrollmentStatus')}
        </span>
        {soloEspero ? (
          <span
            data-testid="estado-en-espera"
            className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800"
          >
            {t('detail.waitingListStatus', {
              position: puestoEnEspera,
              time: miEspera.teeSheet.firstTeeTime,
              day: diaCortoDeLaFicha(miEspera.roundDate, i18n?.language),
            })}
          </span>
        ) : (
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${getEnrollmentStatusColor(
              userEnrollment?.status || competition.enrollment_status,
            )}`}
          >
            {(userEnrollment?.status || competition.enrollment_status) &&
              etiquetaDeInscripcion(
                t,
                userEnrollment?.status || competition.enrollment_status,
                generoDelUsuario,
              )}
          </span>
        )}
      </div>

      {/* No sale por su cuenta: quien quita es el organizador (29 oct 2026) */}
      {!isCreator &&
        competition.teamsAssigned &&
        (userEnrollment?.status || competition.enrollment_status) ===
          'APPROVED' && (
          <p className="mt-2 text-sm text-blue-900">
            {t('detail.teamsFormed.enrolled')}
          </p>
        )}

      {puedeElegirNombre && (
        <div className="mt-3 pt-3 border-t border-blue-200">
          <div className="flex items-center justify-between gap-3">
            <span
              id="name-preference-label"
              className="text-blue-900 font-medium text-sm"
            >
              {t('detail.namePreference.label')}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={usaSuAlias}
              aria-labelledby="name-preference-label"
              aria-describedby="name-preference-help"
              disabled={savingNamePreference}
              onClick={() =>
                handleToggleNamePreference(userEnrollment.id, usaSuAlias)
              }
              className={`relative w-11 h-6 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                usaSuAlias ? 'bg-primary' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  usaSuAlias ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>
          <p id="name-preference-help" className="text-blue-800 text-sm mt-2">
            {usaSuAlias
              ? t('detail.namePreference.helpUsingAlias', {
                  realName: nombreLegal,
                  alias: user.alias,
                })
              : t('detail.namePreference.helpUsingRealName', {
                  realName: nombreLegal,
                  alias: user.alias,
                })}
          </p>
          <p className="text-blue-700 text-sm mt-1">
            {t('detail.namePreference.visibility')}
          </p>
        </div>
      )}
    </div>
  </div>
);

export default MiInscripcion;
