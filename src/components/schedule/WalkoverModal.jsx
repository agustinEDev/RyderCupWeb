import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, AlertTriangle } from 'lucide-react';

// Wrapper: controls mount/unmount so inner component always has fresh state
const WalkoverModal = ({ isOpen, ...props }) => {
  if (!isOpen) return null;
  return <WalkoverModalContent {...props} />;
};

const WalkoverModalContent = ({
  onClose,
  onConfirm,
  matchNumber,
  isProcessing,
  teamNames,
  t,
}) => {
  const [winningTeam, setWinningTeam] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!window.confirm(t('walkover.confirmMessage'))) return;
    onConfirm(winningTeam, reason);
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
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <h2 className="text-xl font-bold text-gray-900">
              {t('walkover.title')}
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
          <p className="text-sm text-gray-600">
            {t('matches.matchNumber', { number: matchNumber })}
          </p>

          {/* Winning Team */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('walkover.winningTeam')} *
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="winningTeam"
                  value="A"
                  checked={winningTeam === 'A'}
                  onChange={(e) => setWinningTeam(e.target.value)}
                  required
                  className="text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium">{teamNames.teamA}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="winningTeam"
                  value="B"
                  checked={winningTeam === 'B'}
                  onChange={(e) => setWinningTeam(e.target.value)}
                  required
                  className="text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium">{teamNames.teamB}</span>
              </label>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('walkover.reason')} *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={3}
              placeholder={t('walkover.reasonPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary resize-none"
            />
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
              className="px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
            >
              {isProcessing ? '...' : t('walkover.confirm')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default WalkoverModal;
