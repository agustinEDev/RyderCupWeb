import { useTranslation } from 'react-i18next';

const PreMatchInfo = ({ markerAssignment, matchFormat }) => {
  const { t } = useTranslation('scoring');

  if (!markerAssignment) return null;

  return (
    <div data-testid="pre-match-info" className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      <h3 className="text-lg font-semibold text-gray-900">{t('preMatch.title')}</h3>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{t('preMatch.format')}:</span>
          <span className="text-sm font-medium">{matchFormat}</span>
        </div>

        {markerAssignment.marksName && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{t('preMatch.youMark')}:</span>
            <span className="text-sm font-medium text-primary">{markerAssignment.marksName}</span>
          </div>
        )}

        {markerAssignment.markedByName && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{t('preMatch.markedBy')}:</span>
            <span className="text-sm font-medium text-primary">{markerAssignment.markedByName}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PreMatchInfo;
