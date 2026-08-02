import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Loader, UserX, UserCheck, Trash2, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * ManageAccountModal Component
 * Lets an admin deactivate/reactivate a user, or permanently delete the account.
 * Permanent delete may be blocked (409) by the backend if the user has activity
 * (competitions/quick matches created, courses requested, hole scores) — in that
 * case we surface the block, fall back to the deactivate/reactivate option, and
 * let the admin confirm that instead without closing the modal.
 */
const ManageAccountModal = ({ user, onToggleActive, onDelete, onCancel }) => {
  const { t } = useTranslation('admin');
  const safeOption = user.isActive ? 'deactivate' : 'reactivate';
  const [option, setOption] = useState(safeOption);
  const [confirmText, setConfirmText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [blocked, setBlocked] = useState(false);

  const fullName = `${user.firstName} ${user.lastName}`;
  const deleteWord = t('manageModal.confirmDeleteWord');

  const handleConfirm = async () => {
    setError('');
    setIsProcessing(true);
    try {
      if (option === 'delete') {
        await onDelete();
      } else {
        await onToggleActive();
      }
    } catch (err) {
      if (err.status === 409 || err.statusCode === 409) {
        setBlocked(true);
        setOption(safeOption);
      } else {
        setError(err.message || t('manageModal.genericError'));
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const canConfirmDelete = option !== 'delete' || confirmText === deleteWord;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{t('manageModal.title', { name: fullName })}</h2>
            <p className="text-sm text-gray-500 mt-1">{t('manageModal.subtitle')}</p>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600" aria-label={t('manageModal.cancel')}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          {blocked && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">{t('manageModal.deleteBlockedTitle')}</p>
                <p className="text-sm text-amber-700 mt-0.5">{t('manageModal.deleteBlockedHint')}</p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {user.isActive ? (
              <label
                className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                  option === 'deactivate' ? 'border-primary-400 bg-primary-50' : 'border-gray-200'
                }`}
              >
                <input
                  type="radio"
                  name="manage-option"
                  checked={option === 'deactivate'}
                  onChange={() => setOption('deactivate')}
                  className="mt-1 accent-primary-600"
                />
                <span>
                  <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <UserX className="w-4 h-4 text-amber-600" />
                    {t('manageModal.deactivateOption')}
                  </span>
                  <span className="block text-xs text-gray-500 mt-0.5">{t('manageModal.deactivateDesc')}</span>
                </span>
              </label>
            ) : (
              <label
                className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                  option === 'reactivate' ? 'border-primary-400 bg-primary-50' : 'border-gray-200'
                }`}
              >
                <input
                  type="radio"
                  name="manage-option"
                  checked={option === 'reactivate'}
                  onChange={() => setOption('reactivate')}
                  className="mt-1 accent-primary-600"
                />
                <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <UserCheck className="w-4 h-4 text-primary-600" />
                  {t('manageModal.confirmReactivate')}
                </span>
              </label>
            )}

            {!blocked && (
              <label
                className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                  option === 'delete' ? 'border-red-400 bg-red-50' : 'border-gray-200'
                }`}
              >
                <input
                  type="radio"
                  name="manage-option"
                  checked={option === 'delete'}
                  onChange={() => setOption('delete')}
                  className="mt-1 accent-red-600"
                />
                <span className="w-full">
                  <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <Trash2 className="w-4 h-4 text-red-600" />
                    {t('manageModal.deleteOption')}
                  </span>
                  <span className="block text-xs text-gray-500 mt-0.5">{t('manageModal.deleteDesc')}</span>
                </span>
              </label>
            )}

            {!blocked && option === 'delete' && (
              <div className="pl-3">
                <label htmlFor="manage-confirm-delete" className="block text-xs font-medium text-gray-700 mb-1">
                  {t('manageModal.confirmDeleteLabel')}
                </label>
                <input
                  id="manage-confirm-delete"
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={t('manageModal.confirmDeletePlaceholder')}
                  className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400 outline-none"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isProcessing}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {t('manageModal.cancel')}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isProcessing || !canConfirmDelete}
              className={`flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-60 ${
                option === 'delete'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-primary text-white hover:bg-primary/90'
              }`}
            >
              {isProcessing && <Loader className="w-4 h-4 animate-spin" />}
              {isProcessing
                ? t('manageModal.processing')
                : option === 'delete'
                  ? t('manageModal.confirmDelete')
                  : option === 'reactivate'
                    ? t('manageModal.confirmReactivate')
                    : t('manageModal.confirmDeactivate')}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ManageAccountModal;
