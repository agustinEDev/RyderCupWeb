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
import * as api from '../services/api';

// Mock API
vi.mock('../services/api', () => ({
  apiRequest: vi.fn(),
}));

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
    api.apiRequest.mockResolvedValue({ id: 'u-1' });
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
    expect(api.apiRequest).not.toHaveBeenCalled();
  });

  it('should respect enabled=false flag', () => {
    const { result } = renderHook(
      () => useDeviceRevocationMonitor({ enabled: false }),
      { wrapper }
    );

    // Hook should still provide checkDeviceStatus
    expect(result.current.checkDeviceStatus).toBeDefined();

    // But should NOT trigger API calls
    expect(api.apiRequest).not.toHaveBeenCalled();
  });
});

// FE #1046: el monitor solo provoca una petición con sesión; la revocación la trata
// el interceptor con el 401 «Dispositivo revocado»
describe('useDeviceRevocationMonitor · la petición que hace', () => {
  it('pide la ruta con sesión más ligera, no la lista de dispositivos', async () => {
    renderHook(() => useDeviceRevocationMonitor({ enabled: true }), { wrapper });

    await vi.waitFor(() => expect(api.apiRequest).toHaveBeenCalledWith('/api/v1/auth/current-user'));
    expect(api.apiRequest).not.toHaveBeenCalledWith('/api/v1/users/me/devices');
  });
});
