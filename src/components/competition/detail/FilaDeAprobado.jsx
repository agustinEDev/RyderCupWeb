import { Edit, CheckCircle, XCircle, Undo2, UserMinus } from 'lucide-react';
import CaptainBadge from '../CaptainBadge';
import CampoDeHandicap from '../../ui/CampoDeHandicap';
import { formatoDeIndice } from '../../../utils/formatoDeHandicap';
import { SE_PUEDE_QUITAR, conFijado, equipoDe, esCapitan } from '../../../utils/fichaDeLaCompeticion';

/**
 * Un inscrito aprobado en la lista de la ficha: su nombre, capitanía o equipo,
 * su hándicap (con el editor del personalizado) y, para quien organiza, el
 * botón de quitarle.
 */
const FilaDeAprobado = ({
  enrollment,
  competition,
  t,
  i18n,
  canManage,
  esStrokePlay,
  reparto,
  sinHandicap,
  hayVariasCategorias,
  canEditHandicap,
  editingHandicapId,
  handicapInput,
  setHandicapInput,
  savingHandicapId,
  revertingHandicapId,
  handleStartEditHandicap,
  handleSaveHandicap,
  handleCancelEditHandicap,
  handleRevertToRfegHandicap,
  quitandoId,
  handleQuitar,
}) => (
  <div
    data-testid={`aprobado-${enrollment.userId}`}
    data-sin-handicap={sinHandicap.has(enrollment.userId) || undefined}
    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-green-50 hover:bg-green-100 transition-colors"
  >
    {/* `min-w-0`: sin él, la etiqueta de capitán con el nombre
        largo de un equipo estiraba la tarjeta y la ficha
        entera se salía por la derecha a 360 px (FE #692) */}
    <div className="flex-1 min-w-0">
      <p className="text-gray-900 font-semibold">
        {enrollment.userName || t('detail.unknownUser')}
      </p>
      <CaptainBadge
        userId={enrollment.userId}
        captains={competition.captains}
        teamNames={{ a: competition.team1Name, b: competition.team2Name }}
      />
      {/* Con el reparto hecho, el equipo de cada uno: sin esto
          solo los capitanes lo decían (#710). El capitán ya
          lo dice con su insignia */}
      {equipoDe(reparto, competition, enrollment.userId) && !esCapitan(competition.captains, enrollment.userId) && (
        <span
          data-testid="equipo-del-aprobado"
          className="inline-flex mt-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-medium max-w-full"
        >
          <span className="truncate min-w-0">{equipoDe(reparto, competition, enrollment.userId)}</span>
        </span>
      )}
      {/* Que se vea a quién le falta, no solo en un atributo (revisor) */}
      {sinHandicap.has(enrollment.userId) && (
        <span className="inline-flex mt-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
          {t('detail.missingHandicapBadge')}
        </span>
      )}
      <div className="flex items-center gap-2 mt-1">
        {editingHandicapId === enrollment.id ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <CampoDeHandicap
              aria-label={t('detail.editHandicap')}
              value={handicapInput}
              onChange={setHandicapInput}
              autoFocus
              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={() => handleSaveHandicap(enrollment.id)}
              disabled={savingHandicapId === enrollment.id}
              className="text-green-600 hover:text-green-800 disabled:opacity-50"
              title={t('detail.saveHandicap')}
            >
              <CheckCircle className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleCancelEditHandicap}
              disabled={savingHandicapId === enrollment.id || revertingHandicapId === enrollment.id}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
              title={t('detail.cancelHandicap')}
            >
              <XCircle className="w-4 h-4" />
            </button>
            {enrollment.hasCustomHandicap && enrollment.userCountryCode === 'ES' && (
              <button
                type="button"
                onClick={() => handleRevertToRfegHandicap(enrollment.id)}
                disabled={savingHandicapId === enrollment.id || revertingHandicapId === enrollment.id}
                className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                title={t('detail.revertToRfegHandicap')}
              >
                <Undo2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <>
            {conFijado(esStrokePlay, enrollment) ? (
              <span data-testid={`fijado-${enrollment.userId}`} className="text-green-700 text-sm font-medium">
                {t(enrollment.category != null && hayVariasCategorias ? 'detail.fixedHandicap' : 'detail.fixedHandicapNoCategory', {
                  handicap: formatoDeIndice(enrollment.fixedHandicap, i18n.language),
                  categoria: enrollment.category,
                })}
              </span>
            ) : enrollment.hasCustomHandicap ? (
              <span className="text-amber-700 text-sm font-medium">
                {t('detail.handicapLabel', { handicap: formatoDeIndice(enrollment.customHandicap, i18n.language) })}
                {' '}
                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-xs font-semibold">
                  {t('detail.customHandicapBadge')}
                </span>
              </span>
            ) : enrollment.userHandicap !== null && enrollment.userHandicap !== undefined ? (
              <span className="text-green-700 text-sm font-medium">
                {t('detail.handicapLabel', { handicap: formatoDeIndice(enrollment.userHandicap, i18n.language) })}
              </span>
            ) : (
              <span className="text-gray-500 text-sm">{t('detail.noHandicap')}</span>
            )}
            {canEditHandicap && (
              <button
                type="button"
                onClick={() => handleStartEditHandicap(enrollment)}
                className="text-gray-400 hover:text-primary"
                title={t('detail.editHandicap')}
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
    {enrollment.team && (
      <span className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-semibold">
        {enrollment.team}
      </span>
    )}
    {/* Quitarle (release social 2): quien organiza, antes de
        empezar, a cualquiera menos a sí mismo */}
    {canManage &&
      SE_PUEDE_QUITAR.has(competition.status) &&
      enrollment.userId !== competition.creatorId && (
        <button
          type="button"
          data-testid={`quitar-${enrollment.userId}`}
          onClick={() => handleQuitar(enrollment)}
          disabled={quitandoId !== null}
          aria-label={t('detail.removePlayerAria', {
            nombre: enrollment.userName || t('detail.unknownUser'),
          })}
          className="ml-2 flex min-h-11 min-w-11 items-center justify-center rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
        >
          <UserMinus className="h-5 w-5" aria-hidden="true" />
        </button>
      )}
  </div>
);

export default FilaDeAprobado;
