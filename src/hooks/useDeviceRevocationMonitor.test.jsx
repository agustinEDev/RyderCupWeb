/**
 * Tests for useDeviceRevocationMonitor Hook
 * v1.14.0: Event-driven device revocation detection
 *
 * Note: These are basic unit tests. Integration testing is recommended
 * for full event-driven behavior (navigation, tab visibility, etc.)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { BrowserRouter } from 'react-router';
import { useDeviceRevocationMonitor } from './useDeviceRevocationMonitor';
import { checkDeviceStatusUseCase } from '../composition';

// El hook pide la comprobación al caso de uso de la composition root (F2)
vi.mock('../composition', () => ({ checkDeviceStatusUseCase: { execute: vi.fn() } }));

// Wrapper with React Router
const wrapper = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('useDeviceRevocationMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock document.hidden
    Object.defineProperty(document, 'hidden', {
      writable: true,
      configurable: true,
      value: false,
    });

    // Default mock: the session is fine
    checkDeviceStatusUseCase.execute.mockResolvedValue(undefined);
  });

  it('should return checkDeviceStatus function', () => {
    const { result } = renderHook(
      () => useDeviceRevocationMonitor({ enabled: false }),
      { wrapper }
    );

    expect(result.current).toBeDefined();
    expect(result.current.checkDeviceStatus).toBeInstanceOf(Function);
  });

  it('should NOT check device status when disabled', () => {
    renderHook(() => useDeviceRevocationMonitor({ enabled: false }), { wrapper });

    // Should NOT have called API
    expect(checkDeviceStatusUseCase.execute).not.toHaveBeenCalled();
  });

  it('should respect enabled=false flag', () => {
    const { result } = renderHook(
      () => useDeviceRevocationMonitor({ enabled: false }),
      { wrapper }
    );

    // Hook should still provide checkDeviceStatus
    expect(result.current.checkDeviceStatus).toBeDefined();

    // But should NOT trigger API calls
    expect(checkDeviceStatusUseCase.execute).not.toHaveBeenCalled();
  });
});

// FE #1046: el monitor solo provoca una petición con sesión; la revocación la trata
// el interceptor con el 401 «Dispositivo revocado»
describe('useDeviceRevocationMonitor · la petición que hace', () => {
  it('pide la comprobación al caso de uso (la ruta la fija su repositorio)', async () => {
    renderHook(() => useDeviceRevocationMonitor({ enabled: true }), { wrapper });

    await vi.waitFor(() => expect(checkDeviceStatusUseCase.execute).toHaveBeenCalledTimes(1));
    expect(checkDeviceStatusUseCase.execute).toHaveBeenCalledWith();
  });

  it('un fallo de la comprobación no sale del hook (lo trata el interceptor)', async () => {
    checkDeviceStatusUseCase.execute.mockRejectedValue(Object.assign(new Error('x'), { status: 401 }));
    const { result } = renderHook(() => useDeviceRevocationMonitor({ enabled: true }), { wrapper });

    await vi.waitFor(() => expect(checkDeviceStatusUseCase.execute).toHaveBeenCalled());
    await expect(result.current.checkDeviceStatus()).resolves.toBeUndefined();
  });
});
