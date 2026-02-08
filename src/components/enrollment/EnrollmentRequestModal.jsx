import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const TEE_CATEGORIES = ['CHAMPIONSHIP', 'AMATEUR', 'SENIOR', 'FORWARD', 'JUNIOR'];

const EnrollmentRequestModal = ({ isOpen, onClose, onConfirm, isProcessing }) => {
  if (!isOpen) return null;
  return (
    <EnrollmentRequestModalContent
      onClose={onClose}
      onConfirm={onConfirm}
      isProcessing={isProcessing}
    />
  );
};

const EnrollmentRequestModalContent = ({ onClose, onConfirm, isProcessing }) => {
  const { t } = useTranslation(['competitions', 'golfCourses']);
  const [selectedTee, setSelectedTee] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(selectedTee || null);
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
            <UserPlus className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-gray-900">
              {t('competitions:enrollment.modalTitle')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Tee Category Select */}
          <div>
            <label
              htmlFor="tee-category"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t('competitions:enrollment.teeCategoryLabel')}
            </label>
            <select
              id="tee-category"
              value={selectedTee}
              onChange={(e) => setSelectedTee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            >
              <option value="">{t('competitions:enrollment.noPreference')}</option>
              {TEE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {t(`golfCourses:form.teeCategories.${cat}`)}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {t('competitions:enrollment.teeCategoryHint')}
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              {t('competitions:enrollment.cancel')}
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isProcessing ? '...' : t('competitions:enrollment.confirm')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default EnrollmentRequestModal;
