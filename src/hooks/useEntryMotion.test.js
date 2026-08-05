import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEntryMotion } from './useEntryMotion';

const MOBILE_QUERY = '(max-width: 767px)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

const originalMatchMedia = window.matchMedia;
const listeners = new Map();

function mockMatchMedia({ mobile = false, reducedMotion = false } = {}) {
  const state = { [MOBILE_QUERY]: mobile, [REDUCED_MOTION_QUERY]: reducedMotion };

  window.matchMedia = vi.fn().mockImplementation((query) => ({
    media: query,
    get matches() {
      return Boolean(state[query]);
    },
    addEventListener: (_event, handler) => {
      if (!listeners.has(query)) listeners.set(query, new Set());
      listeners.get(query).add(handler);
    },
    removeEventListener: (_event, handler) => listeners.get(query)?.delete(handler),
  }));

  return state;
}

function emitChange(query, matches, state) {
  act(() => {
    state[query] = matches;
    listeners.get(query)?.forEach((handler) => handler({ matches }));
  });
}

describe('useEntryMotion', () => {
  beforeEach(() => {
    listeners.clear();
    mockMatchMedia();
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    vi.restoreAllMocks();
  });

  it('enables entry and scroll animations on desktop with motion allowed', () => {
    const { result } = renderHook(() => useEntryMotion());

    expect(result.current.animateEntry).toBe(true);
    expect(result.current.animateOnScroll).toBe(true);
  });

  it('disables scroll reveals on mobile but keeps mount animations', () => {
    mockMatchMedia({ mobile: true });

    const { result } = renderHook(() => useEntryMotion());

    expect(result.current.animateEntry).toBe(true);
    expect(result.current.animateOnScroll).toBe(false);
  });

  it('disables every animation when the user prefers reduced motion', () => {
    mockMatchMedia({ reducedMotion: true });

    const { result } = renderHook(() => useEntryMotion());

    expect(result.current.animateEntry).toBe(false);
    expect(result.current.animateOnScroll).toBe(false);
  });

  it('reacts to viewport changes', () => {
    const state = mockMatchMedia();
    const { result } = renderHook(() => useEntryMotion());
    expect(result.current.animateOnScroll).toBe(true);

    emitChange(MOBILE_QUERY, true, state);

    expect(result.current.animateOnScroll).toBe(false);
  });

  it('does not crash when matchMedia is unavailable', () => {
    delete window.matchMedia;

    const { result, unmount } = renderHook(() => useEntryMotion());

    expect(result.current.animateEntry).toBe(true);
    expect(result.current.animateOnScroll).toBe(true);
    expect(() => unmount()).not.toThrow();
  });
});
