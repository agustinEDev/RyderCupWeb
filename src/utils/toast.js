import toast from 'react-hot-toast';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { createElement } from 'react';

/**
 * Custom Toast Content Component
 */
const ToastContent = ({ message, type, toastId, icon }) => {
  const config = {
    success: {
      Icon: CheckCircle2,
      bgClass: 'bg-green-50',
      borderClass: 'border-primary/20',
      textClass: 'text-primary',
    },
    error: {
      Icon: AlertCircle,
      bgClass: 'bg-red-50',
      borderClass: 'border-red-200',
      textClass: 'text-red-600',
    },
    info: {
      Icon: Info,
      bgClass: 'bg-blue-50',
      borderClass: 'border-blue-200',
      textClass: 'text-blue-600',
    },
  };

  const typeConfig = config[type] || config.info;
  const { Icon, bgClass, borderClass, textClass } = typeConfig;

  return createElement(
    'div',
    {
      className: `flex items-start gap-3 p-4 pr-2 ${bgClass} border ${borderClass} rounded-lg shadow-lg min-w-[300px] max-w-md`,
    },
    // Icon (custom emoji or default Icon component)
    createElement('div', { className: 'flex-shrink-0' },
      icon
        ? createElement('span', { className: 'text-xl' }, icon)
        : createElement(Icon, { className: `w-5 h-5 ${textClass}` })
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
    const { icon, ...toastOptions } = options;
    return toast.custom(
      (t) => createElement(ToastContent, { message, type: 'success', toastId: t.id, icon }),
      { duration: 4000, ...toastOptions }
    );
  },

  error: (message, options = {}) => {
    const { icon, ...toastOptions } = options;
    return toast.custom(
      (t) => createElement(ToastContent, { message, type: 'error', toastId: t.id, icon }),
      { duration: 5000, ...toastOptions }
    );
  },

  info: (message, options = {}) => {
    const { icon, ...toastOptions } = options;
    return toast.custom(
      (t) => createElement(ToastContent, { message, type: 'info', toastId: t.id, icon }),
      { duration: 4000, ...toastOptions }
    );
  },

  // Wrapper for toast.dismiss to allow dismissing toasts
  dismiss: (toastId) => {
    return toast.dismiss(toastId);
  },
};

// Export default as customToast for easy import
export default customToast;
