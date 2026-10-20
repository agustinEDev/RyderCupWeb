import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

/**
 * Revisión (punto 9): con los Términos pendientes se puede ir a gestionar los
 * dispositivos. Si se llega así, la pantalla avisa a la cortina del arranque de
 * que está lista; con los Términos aceptados no hace falta, y no lo hace.
 */
const pantallaLista = vi.fn();
const pendientes = vi.hoisted(() => ({ valor: false }));
vi.mock('../utils/cortinaDeArranque', () => ({ laPantallaEstaLista: (...a) => pantallaLista(...a) }));
vi.mock('../hooks/useTerminosPendientes', () => ({ useTerminosPendientes: () => pendientes.valor }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k) => k, i18n: { language: 'es' } }) }));
vi.mock('../components/layout/HeaderAuth', () => ({ default: () => null }));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'u-1' }, loading: false }) }));
vi.mock('../hooks/useLogout', () => ({ useLogout: () => ({ logout: vi.fn() }) }));
vi.mock('../hooks/useDeviceManagement', () => ({
  useDeviceManagement: () => ({ devices: [], isLoading: false, error: null, revokeDevice: vi.fn(), refetch: vi.fn() }),
}));

const { default: DeviceManagement } = await import('./DeviceManagement');

const abrir = () => render(<MemoryRouter><DeviceManagement /></MemoryRouter>);

describe('DeviceManagement · la cortina con los Términos pendientes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('con los Términos pendientes, avisa al montarse', () => {
    pendientes.valor = true;
    abrir();

    expect(pantallaLista).toHaveBeenCalled();
  });

  it('con los Términos aceptados, no toca la cortina', () => {
    pendientes.valor = false;
    abrir();

    expect(pantallaLista).not.toHaveBeenCalled();
  });
});
