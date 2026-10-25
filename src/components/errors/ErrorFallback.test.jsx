import { describe, it, expect, vi, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

/**
 * La pantalla de un fallo de render (antes `ErrorFallback` dentro de App.jsx,
 * siempre en inglés). En el idioma de la app, sin depender de las traducciones
 * (25 oct 2026).
 */
const cortina = vi.hoisted(() => ({ retirada: 0 }));
// Sin i18next arrancado: el idioma sale del almacenamiento que espía cada test
vi.mock('i18next', () => ({ default: {} }));
vi.mock('../../utils/cortinaDeArranque', () => ({
  retiraLaCortina: () => {
    cortina.retirada += 1;
  },
}));

const { default: ErrorFallback } = await import('./ErrorFallback');

const enIdioma = (idioma) =>
  vi.spyOn(globalThis.Storage.prototype, 'getItem').mockImplementation((clave) => (clave === 'i18nextLng' ? idioma : null));

describe('ErrorFallback', () => {
  afterEach(() => vi.restoreAllMocks());

  it('E: en español, el título, el texto y «Reintentar»', () => {
    enIdioma('es');
    render(<ErrorFallback error={new Error('x')} resetError={() => {}} />);

    expect(screen.getByRole('heading', { name: 'Algo ha fallado' })).toBeInTheDocument();
    expect(screen.getByText(/el error ya nos ha llegado/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
    // Para que el lector de pantalla lo lea con voz española: la página dice «en»
    expect(screen.getByRole('heading', { name: 'Algo ha fallado' }).closest('[lang]')).toHaveAttribute('lang', 'es');
  });

  it('E: en inglés, la de siempre', () => {
    enIdioma('en');
    render(<ErrorFallback error={new Error('x')} resetError={() => {}} />);

    expect(screen.getByRole('heading', { name: 'Oops! Something went wrong' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
  });

  it('E4: el botón reinicia y la cortina del arranque se retira', () => {
    enIdioma('es');
    const resetError = vi.fn();
    const antes = cortina.retirada;
    render(<ErrorFallback error={new Error('x')} resetError={resetError} />);

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(resetError).toHaveBeenCalledTimes(1);
    expect(cortina.retirada).toBe(antes + 1);
  });
});
