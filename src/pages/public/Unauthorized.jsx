import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

/**
 * Unauthorized Page
 * Shown when user tries to access a route without required permissions
 */
const Unauthorized = () => {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '2rem',
      fontFamily: 'system-ui, sans-serif',
      backgroundColor: '#f9fafb',
    }}>
      <div style={{
        maxWidth: '32rem',
        textAlign: 'center',
        backgroundColor: 'white',
        padding: '3rem 2rem',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      }}>
        {/* Icon */}
        <div style={{
          width: '4rem',
          height: '4rem',
          margin: '0 auto 1.5rem',
          borderRadius: '50%',
          backgroundColor: '#fee2e2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <svg
            style={{ width: '2rem', height: '2rem', color: '#dc2626' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: '1.875rem',
          fontWeight: 'bold',
          color: '#111827',
          marginBottom: '0.5rem',
        }}>
          {t('unauthorized.title', 'Access Denied')}
        </h1>

        {/* Message */}
        <p style={{
          color: '#6b7280',
          marginBottom: '2rem',
          lineHeight: '1.625',
        }}>
          {t(
            'unauthorized.message',
            'You do not have permission to access this page. If you believe this is an error, please contact an administrator.'
          )}
        </p>

        {/* Attempted path (if available) */}
        {from && from !== '/dashboard' && (
          <p style={{
            fontSize: '0.875rem',
            color: '#9ca3af',
            marginBottom: '2rem',
            fontFamily: 'monospace',
            backgroundColor: '#f3f4f6',
            padding: '0.5rem 1rem',
            borderRadius: '0.25rem',
          }}>
            {t('unauthorized.attempted', 'Attempted to access')}: {from}
          </p>
        )}

        {/* Actions */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              padding: '0.625rem 1.25rem',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              fontWeight: '500',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#1d4ed8'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#2563eb'}
          >
            {t('unauthorized.goToDashboard', 'Go to Dashboard')}
          </button>

          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '0.625rem 1.25rem',
              backgroundColor: 'white',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              fontWeight: '500',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#f9fafb'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'white'}
          >
            {t('unauthorized.goBack', 'Go Back')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
