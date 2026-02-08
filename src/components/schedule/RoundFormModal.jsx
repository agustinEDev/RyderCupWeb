import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Info } from 'lucide-react';

const SESSION_TYPES = ['MORNING', 'AFTERNOON', 'EVENING'];
const MATCH_FORMATS = ['SINGLES', 'FOURBALL', 'FOURSOMES'];
const ALLOWANCE_OPTIONS = [50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];

/**
 * Generate array of date strings (YYYY-MM-DD) between startDate and endDate inclusive.
 */
const getCompetitionDates = (startDate, endDate) => {
  if (!startDate || !endDate) return [];
  const dates = [];
  const current = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  while (current <= end) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

// Wrapper: controls mount/unmount so inner component always has fresh state
const RoundFormModal = ({ isOpen, ...props }) => {
  if (!isOpen) return null;
  return <RoundFormModalContent {...props} />;
};

const RoundFormModalContent = ({
  onClose,
  onSubmit,
  initialData,
  golfCourses,
  competition,
  isProcessing,
  t,
}) => {
  const isEditing = !!initialData;

  const competitionDates = getCompetitionDates(competition?.startDate, competition?.endDate);

  const [formData, setFormData] = useState({
    golf_course_id: initialData?.golfCourseId || '',
    date: initialData?.roundDate || (competitionDates.length === 1 ? competitionDates[0] : ''),
    session_type: initialData?.sessionType || 'MORNING',
    match_format: initialData?.matchFormat || 'SINGLES',
    allowance_percentage: initialData?.allowancePercentage || '',
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const payload = {
      golf_course_id: formData.golf_course_id,
      round_date: formData.date,
      session_type: formData.session_type,
      match_format: formData.match_format,
      handicap_mode: 'MATCH_PLAY',
    };

    if (formData.allowance_percentage) {
      payload.allowance_percentage = Number(formData.allowance_percentage);
    }

    onSubmit(payload);
  };

  /**
   * Format a YYYY-MM-DD date string for display.
   */
  const formatDateLabel = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {isEditing ? t('rounds.edit') : t('rounds.create')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Golf Course */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('rounds.golfCourse')} *
            </label>
            <select
              value={formData.golf_course_id}
              onChange={(e) => handleChange('golf_course_id', e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">{t('rounds.golfCourse')}...</option>
              {golfCourses.map((gc) => (
                <option key={gc.id} value={gc.id}>{gc.name}</option>
              ))}
            </select>
          </div>

          {/* Date - only competition dates */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('rounds.date')} *
            </label>
            <select
              value={formData.date}
              onChange={(e) => handleChange('date', e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">{t('rounds.date')}...</option>
              {competitionDates.map((d) => (
                <option key={d} value={d}>{formatDateLabel(d)}</option>
              ))}
            </select>
          </div>

          {/* Session Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('rounds.sessionType')} *
            </label>
            <select
              value={formData.session_type}
              onChange={(e) => handleChange('session_type', e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
            >
              {SESSION_TYPES.map((st) => (
                <option key={st} value={st}>{t(`sessions.${st}`)}</option>
              ))}
            </select>
          </div>

          {/* Match Format + Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('rounds.matchFormat')} *
            </label>
            <select
              value={formData.match_format}
              onChange={(e) => handleChange('match_format', e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
            >
              {MATCH_FORMATS.map((mf) => (
                <option key={mf} value={mf}>{t(`formats.${mf}`)}</option>
              ))}
            </select>
            <div className="mt-2 flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700 leading-relaxed">
                {t(`formats.${formData.match_format}_DESC`)}
              </p>
            </div>
          </div>

          {/* Allowance Percentage (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('rounds.allowancePercentage')}
            </label>
            <select
              value={formData.allowance_percentage}
              onChange={(e) => handleChange('allowance_percentage', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">--</option>
              {ALLOWANCE_OPTIONS.map((pct) => (
                <option key={pct} value={pct}>{pct}%</option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isProcessing ? '...' : (isEditing ? t('rounds.edit') : t('rounds.create'))}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default RoundFormModal;
