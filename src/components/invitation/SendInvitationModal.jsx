import { useState } from 'react';
import { X } from 'lucide-react';

const SendInvitationModalContent = ({ onClose, onSend, isProcessing, t }) => {
  const [email, setEmail] = useState('');
  const [personalMessage, setPersonalMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError(t('errors.invalidEmail'));
      return;
    }

    onSend(trimmedEmail, personalMessage.trim() || null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{t('send.title')}</h2>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label htmlFor="invitation-email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="invitation-email"
              type="email"
              required
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder={t('send.emailPlaceholder')}
              disabled={isProcessing}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
              data-testid="invitation-email-input"
            />
            {error && (
              <p className="text-sm text-red-600 mt-1">{error}</p>
            )}
          </div>

          <div>
            <label htmlFor="invitation-message" className="block text-sm font-medium text-gray-700 mb-1">
              {t('send.personalMessage')}
            </label>
            <textarea
              id="invitation-message"
              value={personalMessage}
              onChange={(e) => setPersonalMessage(e.target.value)}
              placeholder={t('send.personalMessagePlaceholder')}
              disabled={isProcessing}
              maxLength={500}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 resize-none"
              data-testid="invitation-message-input"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">
              {personalMessage.length}/500
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              {t('cancel', { ns: 'schedule' })}
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              data-testid="send-invitation-button"
            >
              {isProcessing ? t('send.sending') : t('send.send')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const SendInvitationModal = ({ isOpen, onClose, onSend, isProcessing, t }) => {
  if (!isOpen) return null;
  return <SendInvitationModalContent onClose={onClose} onSend={onSend} isProcessing={isProcessing} t={t} />;
};

export default SendInvitationModal;
