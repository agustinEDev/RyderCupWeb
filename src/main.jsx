import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import './index.css';
import './infrastructure/sentry'; // Import Sentry initialization
import './i18n'; // Import i18n initialization
import { AuthProviderWithGlobalSync } from './contexts/AuthContext'; // v1.13.0: CSRF Protection

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProviderWithGlobalSync>
      {/* Toast Notifications - En el nivel más alto para que siempre esté disponible */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#131613',
            border: '1px solid #dee3df',
            borderRadius: '0.5rem',
            padding: '16px',
            fontSize: '14px',
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

