import toast from 'react-hot-toast';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';

/**
 * Custom Toast Component with close button
 * @param {string} message - Toast message
 * @param {string} type - Toast type: 'success' | 'error' | 'info'
 * @param {string} toastId - Toast ID for dismissal
 */
const ToastContent = ({ message, type = 'info', toastId }) => {
  const config = {
    success: {
      icon: CheckCircle2,
      iconColor: 'text-primary',
      bgColor: 'bg-green-50',
      borderColor: 'border-primary/20',
    },
    error: {
      icon: AlertCircle,
      iconColor: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
    },
    info: {
      icon: Info,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
  };

  const { icon: Icon, iconColor, bgColor, borderColor } = config[type] || config.info;

  return (
    <div className={`flex items-start gap-3 p-4 pr-2 ${bgColor} border ${borderColor} rounded-lg shadow-lg min-w-[300px] max-w-md`}>
      {/* Icon */}
      <div className="flex-shrink-0">
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>

      {/* Message */}
      <div className="flex-1 text-sm text-gray-900 leading-relaxed">
        {message}
      </div>

      {/* Close Button */}
      <button
        onClick={() => toast.dismiss(toastId)}
        className="flex-shrink-0 p-1 rounded-lg hover:bg-white/50 transition-colors cursor-pointer"
        aria-label="Close notification"
      >
        <X className="w-4 h-4 text-gray-600 hover:text-gray-900" />
      </button>
    </div>
  );
};

// Helper functions to show custom toasts
export const showSuccessToast = (message) => {
  toast.custom((t) => <ToastContent message={message} type="success" toastId={t.id} />, {
    duration: 4000,
  });
};

export const showErrorToast = (message) => {
  toast.custom((t) => <ToastContent message={message} type="error" toastId={t.id} />, {
    duration: 5000,
  });
};

export const showInfoToast = (message) => {
  toast.custom((t) => <ToastContent message={message} type="info" toastId={t.id} />, {
    duration: 4000,
  });
};

export default ToastContent;
