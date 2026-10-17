import { useState } from 'react';
import { Edit, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import FichaDeFila from './FichaDeFila';

const STATUS_BADGE_CLASSES = {
  ACTIVE: 'bg-green-100 text-green-800',
  CLOSED: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-gray-100 text-gray-800',
  DRAFT: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

// Actions available per current status, matching the backend state machine
// (DRAFT -> ACTIVE -> CLOSED -> IN_PROGRESS -> COMPLETED, + CANCELLED from any non-final state).
const TRANSITIONS_BY_STATUS = {
  DRAFT: ['activate', 'cancel'],
  ACTIVE: ['closeEnrollments', 'cancel'],
  CLOSED: ['start', 'reopenEnrollments', 'cancel'],
  IN_PROGRESS: ['complete', 'revertStatus', 'cancel'],
  COMPLETED: ['revertToInProgress'],
  CANCELLED: [],
};

/**
 * AdminCompetitionsTable Component
 * Table of every competition for the admin panel Competitions tab, with
 * edit (DRAFT only) and forced status transition actions. En el móvil, una
 * fila por competición y su ficha con las acciones (17 oct 2026, entrega 5).
 */
const AdminCompetitionsTable = ({ competitions, onEdit, onTransition, disabled = false }) => {
  const { t, i18n } = useTranslation(['admin', 'competitions']);
  const [abierta, setAbierta] = useState(null);

  if (!competitions || competitions.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-500">{t('competitions.noResults')}</p>
      </div>
    );
  }

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString(i18n.language);

  const creatorName = (competition) =>
    competition.creator
      ? `${competition.creator.firstName} ${competition.creator.lastName}`
      : t('competitions.unknownCreator');
  const fechas = (competition) => `${formatDate(competition.startDate)} – ${formatDate(competition.endDate)}`;
  const insignia = (competition) => (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
        STATUS_BADGE_CLASSES[competition.status] || 'bg-gray-100 text-gray-800'
      }`}
    >
      {t(`status.${competition.status}`, { ns: 'competitions' })}
    </span>
  );
  // Se cierra la ficha y se hace lo de siempre: cancelar sigue pidiendo su
  // confirmación, que vive en el panel
  const desdeLaFicha = (hacer) => () => {
    setAbierta(null);
    hacer();
  };

  return (
    <>
    <ul aria-label={t('competitions.listLabel')} className="md:hidden divide-y divide-gray-100">
      {competitions.map((competition) => (
        <li key={competition.id}>
          <button
            type="button"
            onClick={() => setAbierta(competition)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
          >
            <span className="block min-w-0 flex-1">
              <span className="block font-semibold text-gray-900 truncate">{competition.name}</span>
              <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                {insignia(competition)}
                <span>{fechas(competition)}</span>
              </span>
            </span>
            <ChevronRight aria-hidden="true" className="w-4 h-4 text-gray-400 flex-shrink-0" />
          </button>
        </li>
      ))}
    </ul>
    {abierta && (
      <FichaDeFila
        titulo={abierta.name}
        datos={[
          { etiqueta: t('competitions.columnCreator'), valor: creatorName(abierta) },
          { etiqueta: t('competitions.columnStatus'), valor: insignia(abierta) },
          { etiqueta: t('competitions.columnDates'), valor: fechas(abierta) },
        ]}
        onClose={() => setAbierta(null)}
      >
        {abierta.status === 'DRAFT' && (
          <button
            type="button"
            onClick={desdeLaFicha(() => onEdit(abierta))}
            disabled={disabled}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Edit aria-hidden="true" className="w-4 h-4" />
            {t('competitions.editTooltip')}
          </button>
        )}
        {(TRANSITIONS_BY_STATUS[abierta.status] || []).map((action) => (
          <button
            key={action}
            type="button"
            onClick={desdeLaFicha(() => onTransition(abierta, action))}
            disabled={disabled}
            className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              action === 'cancel'
                ? 'text-red-600 border-red-200 hover:bg-red-50'
                : 'text-primary-700 border-primary-200 hover:bg-primary-50'
            }`}
          >
            {t(`competitions.actions.${action}`)}
          </button>
        ))}
      </FichaDeFila>
    )}
    <div className="hidden md:block overflow-x-auto">
      <table className="w-full text-sm min-w-[820px]">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left py-3 px-4 font-semibold text-gray-700">{t('competitions.columnName')}</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-700">{t('competitions.columnCreator')}</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-700">{t('competitions.columnStatus')}</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-700">{t('competitions.columnDates')}</th>
            <th className="text-right py-3 px-4 font-semibold text-gray-700">{t('competitions.columnActions')}</th>
          </tr>
        </thead>
        <tbody>
          {competitions.map((competition) => {
            const isDraft = competition.status === 'DRAFT';
            const availableTransitions = TRANSITIONS_BY_STATUS[competition.status] || [];

            return (
              <tr key={competition.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4">
                  <p className="font-semibold text-gray-900 truncate max-w-[220px]">{competition.name}</p>
                </td>
                <td className="py-3 px-4 text-gray-700">{creatorName(competition)}</td>
                <td className="py-3 px-4">
                  {insignia(competition)}
                </td>
                <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                  {fechas(competition)}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-end gap-1 flex-wrap">
                    <button
                      onClick={() => isDraft && onEdit(competition)}
                      disabled={!isDraft || disabled}
                      className={`p-2 rounded-lg transition-colors ${
                        isDraft
                          ? 'text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed'
                          : 'text-gray-300 cursor-not-allowed'
                      }`}
                      title={isDraft ? t('competitions.editTooltip') : t('competitions.editDisabledTooltip')}
                      aria-label={isDraft ? t('competitions.editTooltip') : t('competitions.editDisabledTooltip')}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {availableTransitions.map((action) => (
                      <button
                        key={action}
                        onClick={() => onTransition(competition, action)}
                        disabled={disabled}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          action === 'cancel'
                            ? 'text-red-600 hover:bg-red-50'
                            : 'text-primary-700 hover:bg-primary-50'
                        }`}
                      >
                        {t(`competitions.actions.${action}`)}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    </>
  );
};

export default AdminCompetitionsTable;
