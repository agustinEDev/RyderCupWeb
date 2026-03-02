import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const ConcedeMatchModalContent = ({ onConfirm, onClose }) => {
  const { t } = useTranslation('scoring');
  const [reason, setReason] = useState('');

  return (
    <div data-testid="concede-match-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">{t('concede.title')}</h2>
        <p className="text-sm text-gray-600 mb-4">{t('concede.message')}</p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('concede.reason')}</label>
          <input
            data-testid="concede-reason-input"
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('concede.reasonPlaceholder')}
            maxLength={500}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary focus:border-primary"
          />
        </div>

        <div className="flex gap-3 justify-end">
          <button
            data-testid="concede-cancel"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            {t('concede.cancel')}
          </button>
          <button
            data-testid="concede-confirm"
            onClick={() => onConfirm(reason || null)}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
          >
            {t('concede.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};

const ConcedeMatchModal = ({ isOpen, onConfirm, onClose }) => {
  if (!isOpen) return null;
  return <ConcedeMatchModalContent onConfirm={onConfirm} onClose={onClose} />;
};

export default ConcedeMatchModal;
