import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import * as Sentry from '@sentry/react';
import LazyLoadErrorBoundary from './LazyLoadErrorBoundary';

vi.mock('@sentry/react', () => ({
  withScope: vi.fn((callback) => callback({ setTag: vi.fn(), setExtra: vi.fn() })),
  captureException: vi.fn(),
}));

const recarga = vi.hoisted(() => ({ enCurso: false }));
vi.mock('../../utils/recargaPorTrozoViejo', () => ({ esElEcoDeLaRecarga: () => recarga.enCurso }));

const AHORA = 1_000_000;
const TROZO = 'Failed to fetch dynamically imported module: x.js';

function Bomb({ error }) {
  throw error;
}

describe('LazyLoadErrorBoundary', () => {
  const originalLocation = window.location;
  let reloadMock;

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    recarga.enCurso = false;
    reloadMock = vi.fn();
    // jsdom's window.location.reload isn't configurable, so spyOn fails on it directly
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, reload: reloadMock },
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(Date, 'now').mockReturnValue(AHORA);
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
    vi.restoreAllMocks();
  });

  it('does not report to Sentry on the first chunk-load error (silent auto-reload)', () => {
    render(
      <LazyLoadErrorBoundary>
        <Bomb error={new Error('Failed to fetch dynamically imported module: x.js')} />
      </LazyLoadErrorBoundary>
    );

    expect(reloadMock).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).not.toHaveBeenCalled();
    // La hora de la recarga: cuenta 30 s (24 oct)
    expect(sessionStorage.getItem('lazy_load_error_reloaded')).toBe(String(AHORA));
  });

  it('reports to Sentry when the chunk-load error persists after the reload already happened', () => {
    sessionStorage.setItem('lazy_load_error_reloaded', String(AHORA - 29_999));

    render(
      <LazyLoadErrorBoundary>
        <Bomb error={new Error('Failed to fetch dynamically imported module: x.js')} />
      </LazyLoadErrorBoundary>
    );

    expect(reloadMock).not.toHaveBeenCalled();
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Unable to Load Application')).toBeInTheDocument();
  });

  it('reports to Sentry for non-chunk errors without reloading', () => {
    render(
      <LazyLoadErrorBoundary>
        <Bomb error={new Error('Something unrelated broke')} />
      </LazyLoadErrorBoundary>
    );

    expect(reloadMock).not.toHaveBeenCalled();
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Unable to Load Application')).toBeInTheDocument();
  });

  it('recargando ya por un trozo viejo: en blanco, sin Sentry ni otra recarga (24 oct)', () => {
    recarga.enCurso = true;

    const { container } = render(
      <LazyLoadErrorBoundary>
        <Bomb error={new TypeError("undefined is not an object (evaluating 'e.default')")} />
      </LazyLoadErrorBoundary>
    );

    expect(container).toBeEmptyDOMElement();
    expect(reloadMock).not.toHaveBeenCalled();
    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('lazy_load_error_reloaded')).toBeNull();
  });

  it('R8: el botón del aviso borra la marca y recarga (24 oct)', () => {
    sessionStorage.setItem('lazy_load_error_reloaded', String(AHORA));
    render(
      <LazyLoadErrorBoundary>
        <Bomb error={new Error('Failed to fetch dynamically imported module: x.js')} />
      </LazyLoadErrorBoundary>
    );
    expect(reloadMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Refresh Page' }));

    expect(sessionStorage.getItem('lazy_load_error_reloaded')).toBeNull();
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  // La marca es la hora de la recarga y solo cuenta 30 s (24 oct)
  it.each([
    ['R4: de hace 30 s o más', String(AHORA - 30_000)],
    ["R6: la vieja 'true' de la versión anterior", 'true'],
    ['R6: ilegible', 'abc'],
    ['R7: del futuro (reloj hacia atrás)', String(AHORA + 60_000)],
  ])('%s no cuenta: recarga una vez', (_caso, marca) => {
    sessionStorage.setItem('lazy_load_error_reloaded', marca);

    render(
      <LazyLoadErrorBoundary>
        <Bomb error={new Error(TROZO)} />
      </LazyLoadErrorBoundary>
    );

    expect(reloadMock).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem('lazy_load_error_reloaded')).toBe(String(AHORA));
  });

  it('R9: sin almacenamiento no puede apuntarla: el aviso, sin recargar', () => {
    vi.spyOn(globalThis.Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    vi.spyOn(globalThis.Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    render(
      <LazyLoadErrorBoundary>
        <Bomb error={new Error(TROZO)} />
      </LazyLoadErrorBoundary>
    );

    expect(reloadMock).not.toHaveBeenCalled();
    expect(screen.getByText('Unable to Load Application')).toBeInTheDocument();
  });

  it('R9: si se lee pero no se puede escribir, tampoco recarga', () => {
    vi.spyOn(globalThis.Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    render(
      <LazyLoadErrorBoundary>
        <Bomb error={new Error(TROZO)} />
      </LazyLoadErrorBoundary>
    );

    expect(reloadMock).not.toHaveBeenCalled();
    expect(screen.getByText('Unable to Load Application')).toBeInTheDocument();
  });

  it('R9: el botón del aviso recarga aunque no pueda borrar la marca', () => {
    vi.spyOn(globalThis.Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    vi.spyOn(globalThis.Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    render(
      <LazyLoadErrorBoundary>
        <Bomb error={new Error(TROZO)} />
      </LazyLoadErrorBoundary>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Refresh Page' }));

    expect(reloadMock).toHaveBeenCalledTimes(1);
  });
});
