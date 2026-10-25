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

// Mock device revocation logout
vi.mock('../utils/deviceRevocationLogout', () => ({
  handleDeviceRevocationLogout: vi.fn(),
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

    // Default mock: device is active
    api.apiRequest.mockResolvedValue({
      devices: [{ id: '1', is_current_device: true, device_name: 'Chrome' }],
    });
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

// U7 (25 oct 2026): Sentry recoge la consola como migas, y la respuesta entera
// llevaba los dispositivos del usuario (navegador, quizá IP)
describe('useDeviceRevocationMonitor · respuesta malformada', () => {
  it('U7: el aviso dice el tipo y las claves, nunca el contenido', async () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    api.apiRequest.mockResolvedValue({ devices: 'roto', ip_address: '203.0.113.7', user_agent: 'Navegador secreto' });

    renderHook(() => useDeviceRevocationMonitor({ enabled: true }), { wrapper });

    await vi.waitFor(() => expect(aviso).toHaveBeenCalled());
    const escrito = JSON.stringify(aviso.mock.calls);
    expect(escrito).not.toContain('203.0.113.7');
    expect(escrito).not.toContain('Navegador secreto');
    expect(escrito).not.toContain('roto');
    expect(escrito).toContain('ip_address');
    aviso.mockRestore();
  });
});
