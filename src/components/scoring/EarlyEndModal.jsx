import { useTranslation } from 'react-i18next';

const EarlyEndModalContent = ({ decidedResult, onConfirm }) => {
  const { t } = useTranslation('scoring');

  return (
    <div data-testid="early-end-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">{t('earlyEnd.title')}</h2>
        <p className="text-sm text-gray-600 mb-2">
          {t('earlyEnd.message', { team: decidedResult?.winner, score: decidedResult?.score })}
        </p>
        <p className="text-sm text-gray-500 mb-6">{t('earlyEnd.description')}</p>
        <div className="flex gap-3 justify-end">
          <button
            data-testid="early-end-confirm"
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90"
          >
            {t('earlyEnd.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};

const EarlyEndModal = ({ isOpen, decidedResult, onConfirm, onClose }) => {
  if (!isOpen) return null;
  return <EarlyEndModalContent decidedResult={decidedResult} onConfirm={onConfirm} onClose={onClose} />;
};

export default EarlyEndModal;
