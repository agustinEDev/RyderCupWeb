import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import './index.css';
import './i18n'; // Import i18n initialization
import { AuthProviderWithGlobalSync } from './contexts/AuthContext'; // v1.13.0: CSRF Protection

// Lazy load Sentry to reduce initial bundle size (saves ~320 KB)
// Load after 2 seconds or on first error, whichever comes first
setTimeout(() => {
  import('./infrastructure/sentry').catch((error) => {
    console.warn('⚠️ Failed to load Sentry:', error);
  });
}, 2000);

// Also load Sentry immediately if there's an error
window.addEventListener('error', () => {
  import('./infrastructure/sentry').catch(() => {});
}, { once: true });

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProviderWithGlobalSync>
      {/* Toast Notifications - En el nivel más alto para que siempre esté disponible */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#131613',
            border: '1px solid #dee3df',
            borderRadius: '0.5rem',
            padding: '16px',
            fontSize: '14px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          },
          success: {
            iconTheme: {
              primary: '#2d7b3e',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <App />
    </AuthProviderWithGlobalSync>
  </React.StrictMode>,
);

