import { useTranslation } from 'react-i18next';

const SubmitScorecardModalContent = ({ validatedHoles, totalHoles, isSubmitting, onConfirm, onClose }) => {
  const { t } = useTranslation('scoring');

  return (
    <div data-testid="submit-scorecard-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">{t('submit.title')}</h2>
        <p className="text-sm text-gray-600 mb-2">{t('submit.confirm')}</p>
        <p className="text-sm font-medium text-gray-700 mb-6">
          {t('submit.allValidated', { count: validatedHoles, total: totalHoles })}
        </p>
        <div className="flex gap-3 justify-end">
          <button
            data-testid="submit-cancel"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            {t('submit.cancel')}
          </button>
          <button
            data-testid="submit-confirm"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {isSubmitting ? t('submit.submitting') : t('submit.submit')}
          </button>
        </div>
      </div>
    </div>
  );
};

const SubmitScorecardModal = ({ isOpen, validatedHoles, totalHoles, isSubmitting, onConfirm, onClose }) => {
  if (!isOpen) return null;
  return <SubmitScorecardModalContent
    validatedHoles={validatedHoles}
    totalHoles={totalHoles}
    isSubmitting={isSubmitting}
    onConfirm={onConfirm}
    onClose={onClose}
  />;
};

export default SubmitScorecardModal;
