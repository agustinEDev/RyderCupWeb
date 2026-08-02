import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Loader } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * EditUserModal Component
 * Form modal to edit a user's profile fields and admin flag from the admin panel.
 */
const EditUserModal = ({ user, onSubmit, onCancel }) => {
  const { t } = useTranslation('admin');
  const [formData, setFormData] = useState({
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email || '',
    handicap: user.handicap ?? '',
    isAdmin: user.isAdmin,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field) => (e) => {
    const value = field === 'isAdmin' ? e.target.checked : e.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSaving(true);
    try {
      await onSubmit({
        ...formData,
        handicap: formData.handicap === '' ? undefined : Number(formData.handicap),
      });
    } catch (err) {
      setError(err.message || t('editModal.error'));
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
            <h2 className="text-xl font-bold text-gray-900">{t('editModal.title')}</h2>
            <p className="text-sm text-gray-500 mt-1">{t('editModal.subtitle')}</p>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600" aria-label={t('editModal.cancel')}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('editModal.firstName')}</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={handleChange('firstName')}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('editModal.lastName')}</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={handleChange('lastName')}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('editModal.email')}</label>
            <input
              type="email"
              value={formData.email}
              onChange={handleChange('email')}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('editModal.handicap')}</label>
            <input
              type="number"
              step="0.1"
              value={formData.handicap}
              onChange={handleChange('handicap')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none"
            />
          </div>

          <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isAdmin}
              onChange={handleChange('isAdmin')}
              className="mt-0.5 w-4 h-4 accent-primary-600"
            />
            <span>
              <span className="block text-sm font-medium text-gray-900">{t('editModal.isAdmin')}</span>
              <span className="block text-xs text-gray-500">{t('editModal.isAdminHint')}</span>
            </span>
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {t('editModal.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {isSaving && <Loader className="w-4 h-4 animate-spin" />}
              {isSaving ? t('editModal.saving') : t('editModal.save')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default EditUserModal;
