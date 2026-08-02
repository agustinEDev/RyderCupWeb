import { Edit } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
 * edit (DRAFT only) and forced status transition actions.
 */
const AdminCompetitionsTable = ({ competitions, onEdit, onTransition, disabled = false }) => {
  const { t, i18n } = useTranslation(['admin', 'competitions']);

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

  return (
    <div className="overflow-x-auto">
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
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      STATUS_BADGE_CLASSES[competition.status] || 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {t(`status.${competition.status}`, { ns: 'competitions' })}
                  </span>
                </td>
                <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                  {formatDate(competition.startDate)} – {formatDate(competition.endDate)}
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
  );
};

export default AdminCompetitionsTable;
