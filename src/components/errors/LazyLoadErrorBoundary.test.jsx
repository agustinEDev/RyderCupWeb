import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as Sentry from '@sentry/react';
import LazyLoadErrorBoundary from './LazyLoadErrorBoundary';

vi.mock('@sentry/react', () => ({
  withScope: vi.fn((callback) => callback({ setTag: vi.fn(), setExtra: vi.fn() })),
  captureException: vi.fn(),
}));

const recarga = vi.hoisted(() => ({ enCurso: false }));
vi.mock('../../utils/recargaPorTrozoViejo', () => ({ esElEcoDeLaRecarga: () => recarga.enCurso }));

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
});
