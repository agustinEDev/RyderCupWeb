import { useTranslation } from 'react-i18next';

const SessionBlockedModalContent = ({ onTakeOver, onGoBack }) => {
  const { t } = useTranslation('scoring');

  return (
    <div data-testid="session-blocked-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">{t('session.blocked')}</h2>
        <p className="text-sm text-gray-600 mb-6">{t('session.blockedMessage')}</p>
        <div className="flex gap-3 justify-end">
          <button
            data-testid="session-go-back"
            onClick={onGoBack}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            {t('session.goBack')}
          </button>
          <button
            data-testid="session-take-over"
            onClick={onTakeOver}
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90"
          >
            {t('session.takeOver')}
          </button>
        </div>
      </div>
    </div>
  );
};

const SessionBlockedModal = ({ isOpen, onTakeOver, onGoBack }) => {
  if (!isOpen) return null;
  return <SessionBlockedModalContent onTakeOver={onTakeOver} onGoBack={onGoBack} />;
};

export default SessionBlockedModal;
