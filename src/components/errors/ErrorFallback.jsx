import { useLayoutEffect } from 'react';
import { retiraLaCortina } from '../../utils/cortinaDeArranque';
import { textosDelError } from './textosDelError';

/**
 * La pantalla de un fallo de render, para el ErrorBoundary de Sentry en App.
 * En el idioma de la app con textos propios: las traducciones pueden no haber
 * cargado (25 oct 2026; antes, dentro de App.jsx y siempre en inglés).
 */
const ErrorFallback = ({ error, componentStack, resetError }) => {
  const { fallo: textos, idioma } = textosDelError();
  // Si el arbol revienta, la cortina se queda encima tapando esta misma
  // pantalla hasta que la red del CSS la aparta seis segundos despues. Ya paso:
  // `useInstallPrompt` lee `localStorage`, y en Safari con las cookies
  // bloqueadas eso lanza.
  useLayoutEffect(() => {
    retiraLaCortina();
  }, []);

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
    <p style={{ color: '#6b7280', marginBottom: '2rem', maxWidth: '600px' }}>
      {textos.texto}
    </p>
    <button
      onClick={resetError}
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
    {process.env.NODE_ENV === 'development' && (
      <details style={{ marginTop: '2rem', textAlign: 'left', maxWidth: '800px' }}>
        <summary style={{ cursor: 'pointer', color: '#ef4444', marginBottom: '0.5rem' }}>
          {textos.detalles}
        </summary>
        <pre style={{
          backgroundColor: '#1f2937',
          color: '#f3f4f6',
          padding: '1rem',
          borderRadius: '0.5rem',
          overflow: 'auto',
          fontSize: '0.875rem'
        }}>
          {error?.toString()}
          {componentStack}
        </pre>
      </details>
    )}
  </div>
  );
};

export default ErrorFallback;
