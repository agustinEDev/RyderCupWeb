import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import * as Sentry from '@sentry/react';
import LazyLoadErrorBoundary from './LazyLoadErrorBoundary';

vi.mock('@sentry/react', () => ({
  withScope: vi.fn((callback) => callback({ setTag: vi.fn(), setExtra: vi.fn() })),
  captureException: vi.fn(),
}));

const recarga = vi.hoisted(() => ({ enCurso: false }));
vi.mock('../../utils/recargaPorTrozoViejo', () => ({ esElEcoDeLaRecarga: () => recarga.enCurso }));

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
    expect(sessionStorage.getItem('lazy_load_error_reloaded')).toBe('true');
  });

  it('reports to Sentry when the chunk-load error persists after the reload already happened', () => {
    sessionStorage.setItem('lazy_load_error_reloaded', 'true');

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
    sessionStorage.setItem('lazy_load_error_reloaded', 'true');
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

  it('R10: sin red y sin service worker, el aviso en vez de la página de error del navegador', () => {
    vi.spyOn(globalThis.navigator, 'onLine', 'get').mockReturnValue(false);

    render(
      <LazyLoadErrorBoundary>
        <Bomb error={new Error(TROZO)} />
      </LazyLoadErrorBoundary>
    );

    expect(reloadMock).not.toHaveBeenCalled();
    expect(screen.getByText('Unable to Load Application')).toBeInTheDocument();
  });

  it('R10: sin red pero con service worker, sí recarga: la página sale de la caché', () => {
    vi.spyOn(globalThis.navigator, 'onLine', 'get').mockReturnValue(false);
    Object.defineProperty(globalThis.navigator, 'serviceWorker', {
      configurable: true,
      value: { controller: {} },
    });

    try {
      render(
        <LazyLoadErrorBoundary>
          <Bomb error={new Error(TROZO)} />
        </LazyLoadErrorBoundary>
      );

      expect(reloadMock).toHaveBeenCalledTimes(1);
    } finally {
      delete globalThis.navigator.serviceWorker;
    }
  });

  it('R11: si la recarga no llega en 10 s, el aviso en vez de la pantalla en blanco', () => {
    vi.useFakeTimers();
    try {
      const { container } = render(
        <LazyLoadErrorBoundary>
          <Bomb error={new Error(TROZO)} />
        </LazyLoadErrorBoundary>
      );
      expect(reloadMock).toHaveBeenCalledTimes(1);
      expect(container).toBeEmptyDOMElement();

      act(() => vi.advanceTimersByTime(9_999));
      expect(container).toBeEmptyDOMElement();
      act(() => vi.advanceTimersByTime(1));

      expect(screen.getByText('Unable to Load Application')).toBeInTheDocument();
      expect(reloadMock).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
