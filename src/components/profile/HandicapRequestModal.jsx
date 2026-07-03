import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, TrendingUp, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import customToast from '../../utils/toast';
import { updateRfegHandicapUseCase, updateManualHandicapUseCase } from '../../composition';

const HandicapRequestModal = ({ isOpen, user, onClose, onSaved }) => {
  if (!isOpen) return null;
  return <HandicapRequestModalContent user={user} onClose={onClose} onSaved={onSaved} />;
};

const HandicapRequestModalContent = ({ user, onClose, onSaved }) => {
  const { t } = useTranslation('profile');

  const isSpanish = user?.country_code === 'ES';
  const [activeTab, setActiveTab] = useState(isSpanish ? 'rfeg' : 'manual');
  const [manualValue, setManualValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDismiss = () => {
    onClose();
  };

  const handleRfegFetch = async () => {
    setIsSubmitting(true);
    try {
      await updateRfegHandicapUseCase.execute({ userId: user.id });
      customToast.success(t('toasts.handicapUpdatedRFEG'));
      onSaved();
    } catch {
      customToast.error(t('toasts.failedToUpdateHandicapRFEG'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualSave = async (e) => {
    e.preventDefault();
    const parsed = parseFloat(manualValue);
    if (isNaN(parsed) || parsed < -10 || parsed > 54) {
      customToast.error(t('edit.handicap.manualHelp'));
      return;
    }
    setIsSubmitting(true);
    try {
      await updateManualHandicapUseCase.execute({ userId: user.id, handicap: parsed });
      customToast.success(t('toasts.handicapUpdated'));
      onSaved();
    } catch {
      customToast.error(t('toasts.failedToUpdateHandicap'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-2xl max-w-md w-full"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-500" />
            <h2 className="text-xl font-bold text-gray-900">{t('handicapModal.title')}</h2>
          </div>
          <button
            onClick={handleDismiss}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
            aria-label={t('handicapModal.dismiss')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800">{t('handicapModal.subtitle')}</p>
          </div>

          {/* Tabs — solo si el usuario es español */}
          {isSpanish && (
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('rfeg')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'rfeg'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t('handicapModal.rfegTab')}
              </button>
              <button
                onClick={() => setActiveTab('manual')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'manual'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t('handicapModal.manualTab')}
              </button>
            </div>
          )}

          {/* RFEG tab */}
          {activeTab === 'rfeg' && isSpanish && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">{t('edit.handicap.rfegHelp')}</p>
              <button
                onClick={handleRfegFetch}
                disabled={isSubmitting}
                className="w-full py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? t('edit.handicap.updatingFromRFEG') : t('handicapModal.fetchRfeg')}
              </button>
            </div>
          )}

          {/* Manual tab */}
          {activeTab === 'manual' && (
            <form onSubmit={handleManualSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('edit.handicap.manual')}
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="-10"
                  max="54"
                  value={manualValue}
                  onChange={(e) => setManualValue(e.target.value)}
                  placeholder={t('edit.handicap.manualPlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">{t('edit.handicap.manualHelp')}</p>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? t('edit.handicap.updating') : t('edit.handicap.updateManually')}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 pb-6">
          <button
            onClick={handleDismiss}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            {t('handicapModal.dismiss')}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default HandicapRequestModal;
