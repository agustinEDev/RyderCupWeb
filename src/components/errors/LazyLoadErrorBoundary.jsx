import { Component } from 'react';
import PropTypes from 'prop-types';

/**
 * Error Boundary specifically for handling lazy loading failures
 * Automatically reloads the page once when chunk loading fails
 * (typically happens after deployments when old chunks are deleted)
 */
class LazyLoadErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // Check if error is related to chunk/module loading
    const isChunkLoadError =
      error?.name === 'ChunkLoadError' ||
      error?.message?.includes('Loading chunk') ||
      error?.message?.includes('Importing a module script failed') ||
      error?.message?.includes('Failed to fetch dynamically imported module');

    if (isChunkLoadError) {
      // Check if we've already reloaded (prevent infinite loop)
      const hasReloaded = sessionStorage.getItem('lazy_load_error_reloaded');

      if (!hasReloaded) {
        // Mark as reloaded and reload the page
        sessionStorage.setItem('lazy_load_error_reloaded', 'true');
        window.location.reload();
        return { hasError: false }; // Don't show error UI, we're reloading
      }
    }

    // If it's a chunk error but we already reloaded, or it's a different error
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error for debugging
    console.error('LazyLoadErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
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
          <p style={{ color: '#6b7280', marginBottom: '2rem', maxWidth: '600px' }}>
            We encountered an issue loading the application. This typically happens after an update.
            Please try refreshing the page or clearing your browser cache.
          </p>
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

LazyLoadErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
};

export default LazyLoadErrorBoundary;
