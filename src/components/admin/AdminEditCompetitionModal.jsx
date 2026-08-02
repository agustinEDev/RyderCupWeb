import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Loader } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * AdminEditCompetitionModal Component
 * Quick-edit modal for a DRAFT competition's basic fields (name, dates)
 * from the admin panel Competitions tab.
 */
const AdminEditCompetitionModal = ({ competition, onSubmit, onCancel }) => {
  const { t } = useTranslation('admin');
  const [formData, setFormData] = useState({
    name: competition.name || '',
    startDate: competition.startDate || '',
    endDate: competition.endDate || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSaving(true);
    try {
      await onSubmit({
        name: formData.name,
        start_date: formData.startDate,
        end_date: formData.endDate,
      });
    } catch (err) {
      setError(err.message || t('competitions.editModal.error'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{t('competitions.editModal.title')}</h2>
            <p className="text-sm text-gray-500 mt-1">{t('competitions.editModal.subtitle')}</p>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600" aria-label={t('competitions.editModal.cancel')}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="edit-competition-name" className="block text-sm font-medium text-gray-700 mb-1">
              {t('competitions.editModal.name')}
            </label>
            <input
              id="edit-competition-name"
              type="text"
              value={formData.name}
              onChange={handleChange('name')}
              required
              minLength={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-competition-start-date" className="block text-sm font-medium text-gray-700 mb-1">
                {t('competitions.editModal.startDate')}
              </label>
              <input
                id="edit-competition-start-date"
                type="date"
                value={formData.startDate}
                onChange={handleChange('startDate')}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none"
              />
            </div>
            <div>
              <label htmlFor="edit-competition-end-date" className="block text-sm font-medium text-gray-700 mb-1">
                {t('competitions.editModal.endDate')}
              </label>
              <input
                id="edit-competition-end-date"
                type="date"
                value={formData.endDate}
                onChange={handleChange('endDate')}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {t('competitions.editModal.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {isSaving && <Loader className="w-4 h-4 animate-spin" />}
              {isSaving ? t('competitions.editModal.saving') : t('competitions.editModal.save')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default AdminEditCompetitionModal;
