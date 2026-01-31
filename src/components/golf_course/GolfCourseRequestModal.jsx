import { motion } from 'framer-motion';
import { X, AlertCircle, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import GolfCourseForm from './GolfCourseForm';

/**
 * GolfCourseRequestModal Component
 *
 * Modal for requesting a new golf course (creators)
 * Wraps GolfCourseForm and handles submission to PENDING_APPROVAL state
 *
 * Props:
 * - isOpen: boolean - Whether modal is visible
 * - onClose: function - Callback to close modal
 * - onSuccess: function - Callback when request is successful (receives created course)
 * - countryCode: string | null - Pre-fill country if provided
 * - createGolfCourseRequestUseCase: object - Use case for creating request
 */
const GolfCourseRequestModal = ({
  isOpen,
  onClose,
  onSuccess,
  countryCode = null,
  createGolfCourseRequestUseCase
}) => {
  const { t } = useTranslation('golfCourses');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (formData) => {
    setError(null);
    setIsSubmitting(true);

    try {
      // Call use case to create golf course request
      const createdCourse = await createGolfCourseRequestUseCase.execute(formData);

      // Show success state briefly
      setShowSuccess(true);

      // Wait 1.5s then call onSuccess and close
      setTimeout(() => {
        setShowSuccess(false);
        onSuccess(createdCourse);
        onClose();
      }, 1500);

    } catch (err) {
      console.error('Error creating golf course request:', err);
      setError(err.message || t('requestModal.errorCreating', 'Error creating golf course request'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting && !showSuccess) {
      setError(null);
      onClose();
    }
  };

  const initialData = countryCode ? { countryCode } : null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {t('requestModal.title', 'Request New Golf Course')}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {t('requestModal.subtitle', 'Your request will be reviewed by an administrator')}
            </p>
          </div>
          {!isSubmitting && !showSuccess && (
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Success Message */}
          {showSuccess && (
            <div className="p-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-50 border border-green-200 rounded-xl p-6 text-center"
              >
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-green-900 mb-2">
                  {t('requestModal.successTitle', 'Request Submitted!')}
                </h3>
                <p className="text-sm text-green-700">
                  {t('requestModal.successMessage', 'Your golf course request has been submitted for approval.')}
                </p>
              </motion.div>
            </div>
          )}

          {/* Error Message */}
          {error && !showSuccess && (
            <div className="px-6 pt-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900 mb-1">
                    {t('requestModal.errorTitle', 'Error submitting request')}
                  </p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          {!showSuccess && (
            <div className="p-6">
              <GolfCourseForm
                initialData={initialData}
                onSubmit={handleSubmit}
                onCancel={handleClose}
              />
            </div>
          )}

          {/* Info Banner */}
          {!showSuccess && (
            <div className="px-6 pb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>{t('requestModal.infoTitle', 'Important:')}</strong>{' '}
                  {t('requestModal.infoMessage', 'Your competition will be saved as DRAFT until this golf course is approved. You won\'t be able to activate it until approval.')}
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default GolfCourseRequestModal;
