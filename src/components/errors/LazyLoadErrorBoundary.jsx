import { Component } from 'react';
import * as Sentry from '@sentry/react';
import { textosDelError } from './textosDelError';
import { retiraLaCortina } from '../../utils/cortinaDeArranque';
import { esElEcoDeLaRecarga } from '../../utils/recargaPorTrozoViejo';
import {
  apuntarLaRecarga,
  olvidarLaRecarga,
  puedeRecargar,
  recargarTraeLaPagina,
  ESPERA_A_LA_RECARGA_MS,
} from '../../utils/recargaDeLaBarrera';

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
    // La página ya se recarga por un trozo viejo: lo de ahora es el eco de ese
    // fallo, en blanco hasta que llegue la recarga
    if (esElEcoDeLaRecarga(error)) {
      return { hasError: false, isReloading: true, errorMessage: null, errorName: null };
    }
    // React may invoke getDerivedStateFromError more than once for the same
    // error (it's a render-phase, side-effect-free method by contract), so it
    // must only compute state here — sessionStorage writes and reload() live
    // in componentDidCatch below, which React guarantees runs exactly once.
    const isChunkLoadError =
      error?.name === 'ChunkLoadError' ||
      error?.message?.includes('Loading chunk') ||
      error?.message?.includes('Importing a module script failed') ||
      error?.message?.includes('Failed to fetch dynamically imported module');

    // Una vez por versión y página; sin almacenamiento (`null`), o sin red ni
    // service worker, ninguna: el aviso
    const willAutoReload = isChunkLoadError && puedeRecargar() === true && recargarTraeLaPagina();

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

    // Ni Sentry ni una segunda recarga: ya hay una en camino. Si no llega, el
    // aviso a los 10 s en vez del blanco
    if (esElEcoDeLaRecarga(error)) {
      this.esperarALaRecarga();
      return;
    }

    if (this.state.isReloading) {
      // Mark as reloaded and reload the page (typically happens after
      // deployments when old chunks are deleted). Self-healing: skip Sentry
      // reporting for this path, the user never actually saw a broken app.
      if (apuntarLaRecarga()) {
        window.location.reload();
        this.esperarALaRecarga();
        return;
      }
      // Sin poder apuntarla, recargar podría no acabar nunca: el aviso
      this.setState({ hasError: true, isReloading: false });
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

  // Si la recarga no llega (la aplicación se fue a segundo plano), el aviso
  esperarALaRecarga() {
    clearTimeout(this.esperaALaRecarga);
    this.esperaALaRecarga = setTimeout(() => {
      // La cortina del arranque taparía el aviso (FE #485)
      retiraLaCortina();
      this.setState({ hasError: true, isReloading: false });
    }, ESPERA_A_LA_RECARGA_MS);
  }

  componentWillUnmount() {
    clearTimeout(this.esperaALaRecarga);
  }

  render() {
    if (this.state.isReloading) {
      // Blank until the browser navigation from window.location.reload() takes
      // over — must not render `children` again or the lazy component re-throws.
      return null;
    }

    if (this.state.hasError) {
      // Fallback UI when error persists after reload. En el idioma de la app,
      // sin las traducciones: justo ahora pueden no cargar (25 oct 2026)
      const { sinCargar: textos, idioma } = textosDelError();
      return (
        <div lang={idioma} style={{
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
            {textos.titulo}
          </h1>
          <p style={{ color: '#6b7280', marginBottom: '1rem', maxWidth: '600px' }}>
            {textos.texto}
          </p>
          {/* v2.0.4: Show error details for debugging */}
          {this.state.errorMessage && (
            <details style={{ marginBottom: '2rem', maxWidth: '600px', textAlign: 'left' }}>
              <summary style={{ cursor: 'pointer', color: '#6b7280', fontSize: '0.875rem' }}>
                {textos.detalles}
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
              olvidarLaRecarga();
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
            {textos.boton}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default LazyLoadErrorBoundary;
