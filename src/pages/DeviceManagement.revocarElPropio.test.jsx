import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

/**
 * Revocar el propio dispositivo es salir a propósito (regla 3 de `vueltaTrasEntrar`):
 * la marca dice «propia», y el aviso de cierre que llegue después no guarda la página.
 * Si la página pusiera otra marca, volvería a guardarla (revisión, 8 nov 2026).
 */
vi.mock('../utils/cortinaDeArranque', () => ({ laPantallaEstaLista: vi.fn() }));
vi.mock('../hooks/useTerminosPendientes', () => ({ useTerminosPendientes: () => false }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: 'es' } }),
}));
vi.mock('../components/layout/HeaderAuth', () => ({ default: () => null }));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'u-1' }, loading: false }) }));
vi.mock('../hooks/useLogout', () => ({ useLogout: () => ({ logout: vi.fn() }) }));
vi.mock('../components/modals/ConfirmModal', () => ({
  default: ({ isOpen, onConfirm }) => (isOpen ? <button onClick={onConfirm}>confirmar</button> : null),
}));

const ESTE = {
  id: 'd-1',
  deviceName: 'Safari on iOS',
  deviceType: 'phone',
  platform: 'iphone',
  browser: 'safari',
  installedApp: false,
  countryCode: 'ES',
  ipAddress: '90.71.66.***',
  lastUsedAt: '2026-11-05T19:07:00Z',
  createdAt: '2026-11-05T19:04:00Z',
  isActive: true,
  isCurrentDevice: true,
};
vi.mock('../hooks/useDeviceManagement', () => ({
  useDeviceManagement: () => ({
    devices: [ESTE],
    isLoading: false,
    error: null,
    revokeDevice: vi.fn().mockResolvedValue(true),
    refetch: vi.fn(),
    revokingDeviceIds: new Set(),
    deviceErrors: new Map(),
  }),
}));

const { default: DeviceManagement } = await import('./DeviceManagement');

describe('revocar el propio dispositivo', () => {
  let almacen;
  beforeEach(() => {
    almacen = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((k) => almacen[k] ?? null),
      setItem: vi.fn((k, v) => {
        almacen[k] = String(v);
      }),
      removeItem: vi.fn((k) => {
        delete almacen[k];
      }),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('deja la marca de salida a propósito («propia»)', async () => {
    render(
      <MemoryRouter>
        <DeviceManagement />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /actions.revoke/ }));
    fireEvent.click(screen.getByRole('button', { name: 'confirmar' }));

    await waitFor(() => expect(almacen.device_revocation_handled).toBe('propia'));
  });
});
