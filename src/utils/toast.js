import toast from 'react-hot-toast';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { createElement } from 'react';

/**
 * Custom Toast Content Component
 */
const ToastContent = ({ message, type, toastId }) => {
  const config = {
    success: {
      Icon: CheckCircle2,
      className: 'bg-green-50 border-primary/20 text-primary',
    },
    error: {
      Icon: AlertCircle,
      className: 'bg-red-50 border-red-200 text-red-600',
    },
    info: {
      Icon: Info,
      className: 'bg-blue-50 border-blue-200 text-blue-600',
    },
  };

  const { Icon, className } = config[type] || config.info;

  return createElement(
    'div',
    {
      className: `flex items-start gap-3 p-4 pr-2 ${config[type]?.className.split(' ')[0]} border ${config[type]?.className.split(' ')[1]} rounded-lg shadow-lg min-w-[300px] max-w-md`,
    },
    // Icon
    createElement('div', { className: 'flex-shrink-0' },
      createElement(Icon, { className: `w-5 h-5 ${config[type]?.className.split(' ')[2]}` })
    ),
    // Message
    createElement('div', { className: 'flex-1 text-sm text-gray-900 leading-relaxed' }, message),
    // Close Button
    createElement(
      'button',
      {
        onClick: () => toast.dismiss(toastId),
        className: 'flex-shrink-0 p-1 rounded-lg hover:bg-white/50 transition-colors cursor-pointer',
        'aria-label': 'Close notification',
      },
      createElement(X, { className: 'w-4 h-4 text-gray-600 hover:text-gray-900' })
    )
  );
};

/**
 * Custom toast wrapper with close button
 */
export const customToast = {
  success: (message, options = {}) => {
    return toast.custom(
      (t) => createElement(ToastContent, { message, type: 'success', toastId: t.id }),
      { duration: 4000, ...options }
    );
  },

  error: (message, options = {}) => {
    return toast.custom(
      (t) => createElement(ToastContent, { message, type: 'error', toastId: t.id }),
      { duration: 5000, ...options }
    );
  },

  info: (message, options = {}) => {
    return toast.custom(
      (t) => createElement(ToastContent, { message, type: 'info', toastId: t.id }),
      { duration: 4000, ...options }
    );
  },

  // Wrapper for toast.dismiss to allow dismissing toasts
  dismiss: (toastId) => {
    return toast.dismiss(toastId);
  },
};

// Export default as customToast for easy import
export default customToast;
