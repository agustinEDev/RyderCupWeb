import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * Este componente es tambien el fallback del `Suspense` raiz, donde se pinta
 * antes de que baje el namespace `common`: ahi `t()` no resuelve y manda el
 * respaldo. Por eso el mock devuelve el `defaultValue` en vez de la clave.
 */
const estadoI18n = { language: 'es', resolvedLanguage: 'es' };

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_clave, opciones) => opciones?.defaultValue ?? _clave,
    i18n: estadoI18n,
  }),
}));

const FullScreenLoader = (await import('./FullScreenLoader')).default;

describe('FullScreenLoader', () => {
  beforeEach(() => {
    estadoI18n.language = 'es';
    estadoI18n.resolvedLanguage = 'es';
  });

  it('espera en español mientras el namespace no ha bajado', () => {
    render(<FullScreenLoader />);
    expect(screen.getByRole('status')).toHaveTextContent('Cargando...');
  });

  it('espera en ingles cuando ese es el idioma activo', () => {
    estadoI18n.resolvedLanguage = 'en';
    render(<FullScreenLoader />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading...');
  });

  it('acepta la etiqueta con region', () => {
    estadoI18n.resolvedLanguage = 'es-ES';
    render(<FullScreenLoader />);
    expect(screen.getByRole('status')).toHaveTextContent('Cargando...');
  });

  it('acepta la etiqueta con region en su forma con guion bajo', () => {
    // `es_ES` es la forma que ya hizo estallar `localeCompare` en este proyecto
    estadoI18n.resolvedLanguage = 'es_ES';
    render(<FullScreenLoader />);
    expect(screen.getByRole('status')).toHaveTextContent('Cargando...');
  });

  it('cae en ingles ante una etiqueta heredada de Object', () => {
    // `i18nextLng` es texto libre: en un objeto, `constructor` habria devuelto
    // una funcion y React no sabe pintarla —pantalla en blanco al arrancar—
    estadoI18n.resolvedLanguage = 'constructor';
    render(<FullScreenLoader />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading...');
  });

  it('cae en ingles ante una etiqueta que no reconoce', () => {
    // El idioma sale de `i18nextLng`, que no pasa por ninguna lista cerrada
    estadoI18n.resolvedLanguage = 'zz';
    render(<FullScreenLoader />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading...');
  });
});
