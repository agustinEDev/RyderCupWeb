import { Component } from 'react';
import * as Sentry from '@sentry/react';
import { retiraLaCortina } from '../../utils/cortinaDeArranque';

/**
 * Error Boundary specifically for handling lazy loading failures
 * Automatically reloads the page once when chunk loading fails
 * (typically happens after deployments when old chunks are deleted)
 *
 * v2.0.4: Added Sentry error reporting for debugging mobile issues
 */
class LazyLoadErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, isReloading: false, errorMessage: null, errorName: null };
  }

  static getDerivedStateFromError(error) {
    // React may invoke getDerivedStateFromError more than once for the same
    // error (it's a render-phase, side-effect-free method by contract), so it
    // must only compute state here — sessionStorage writes and reload() live
    // in componentDidCatch below, which React guarantees runs exactly once.
    const isChunkLoadError =
      error?.name === 'ChunkLoadError' ||
      error?.message?.includes('Loading chunk') ||
      error?.message?.includes('Importing a module script failed') ||
      error?.message?.includes('Failed to fetch dynamically imported module');

    const alreadyReloaded = Boolean(sessionStorage.getItem('lazy_load_error_reloaded'));
    const willAutoReload = isChunkLoadError && !alreadyReloaded;

    return {
      hasError: !willAutoReload,
      isReloading: willAutoReload,
      errorMessage: error?.message || 'Unknown error',
      errorName: error?.name || 'Error'
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error for debugging
    console.error('LazyLoadErrorBoundary caught an error:', error, errorInfo);

    if (this.state.isReloading) {
      // Mark as reloaded and reload the page (typically happens after
      // deployments when old chunks are deleted). Self-healing: skip Sentry
      // reporting for this path, the user never actually saw a broken app.
      sessionStorage.setItem('lazy_load_error_reloaded', 'true');
      window.location.reload();
      return;
    }

    // La cortina del arranque tapa la pantalla entera: sin esto se quedaria
    // encima de este mismo aviso hasta que la red del CSS la aparta. En el
    // camino de arriba no se toca a proposito: la pagina se esta recargando y
    // levantarla solo enseñaria un blanco antes del viaje (FE #485).
    retiraLaCortina();

    // v2.0.4: Report to Sentry with full context for mobile debugging
    Sentry.withScope((scope) => {
      scope.setTag('errorBoundary', 'LazyLoadErrorBoundary');
      scope.setTag('userAgent', navigator.userAgent);
      scope.setTag('platform', navigator.platform);
      scope.setExtra('componentStack', errorInfo?.componentStack);
      scope.setExtra('errorMessage', error?.message);
      scope.setExtra('errorName', error?.name);
      scope.setExtra('url', window.location.href);
      Sentry.captureException(error);
    });
  }

  render() {
    if (this.state.isReloading) {
      // Blank until the browser navigation from window.location.reload() takes
      // over — must not render `children` again or the lazy component re-throws.
      return null;
    }

    if (this.state.hasError) {
      // Fallback UI when error persists after reload
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          padding: '2rem',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#ef4444' }}>
            Unable to Load Application
          </h1>
          <p style={{ color: '#6b7280', marginBottom: '1rem', maxWidth: '600px' }}>
            We encountered an issue loading the application. This typically happens after an update.
            Please try refreshing the page or clearing your browser cache.
          </p>
          {/* v2.0.4: Show error details for debugging */}
          {this.state.errorMessage && (
            <details style={{ marginBottom: '2rem', maxWidth: '600px', textAlign: 'left' }}>
              <summary style={{ cursor: 'pointer', color: '#6b7280', fontSize: '0.875rem' }}>
                Technical details
              </summary>
              <pre style={{
                marginTop: '0.5rem',
                padding: '1rem',
                backgroundColor: '#f3f4f6',
                borderRadius: '0.5rem',
                fontSize: '0.75rem',
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {this.state.errorName}: {this.state.errorMessage}
              </pre>
            </details>
          )}
          <button
            onClick={() => {
              sessionStorage.removeItem('lazy_load_error_reloaded');
              window.location.reload();
            }}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#2d7b3e',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '1rem',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#235a2e'}
            onFocus={(e) => e.target.style.backgroundColor = '#235a2e'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#2d7b3e'}
            onBlur={(e) => e.target.style.backgroundColor = '#2d7b3e'}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default LazyLoadErrorBoundary;
