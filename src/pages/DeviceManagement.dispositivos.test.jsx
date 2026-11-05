import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

/**
 * Lo que enseña cada dispositivo (FE #1046).
 *
 *   #   caso                                   | esperado
 *   ----|---------------------------------------|----------------------------------------
 *   P1  las horas                              | en la zona del que mira, también si la
 *                                              |   API manda la fecha sin «Z» (es UTC)
 *   P2  el nombre y el icono                   | «iPhone · Safari» con icono de móvil;
 *                                              |   un Mac, icono de ordenador
 *   P3  el dispositivo desde el que se mira    | marcado «Este dispositivo»
 *   P4  la IP y el país                        | la IP tapada que manda la API y el país
 */
vi.mock('../utils/cortinaDeArranque', () => ({ laPantallaEstaLista: vi.fn() }));
vi.mock('../hooks/useTerminosPendientes', () => ({ useTerminosPendientes: () => false }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k) =>
      ({
        'platform.iphone': 'iPhone',
        'platform.mac': 'Mac',
        'browser.safari': 'Safari',
        'device.current': 'Este dispositivo',
      })[k] ?? k,
    i18n: { language: 'es' },
  }),
}));
vi.mock('../components/layout/HeaderAuth', () => ({ default: () => null }));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'u-1' }, loading: false }) }));
vi.mock('../hooks/useLogout', () => ({ useLogout: () => ({ logout: vi.fn() }) }));

const IPHONE = {
  id: 'd-1',
  deviceName: 'Safari on iOS',
  deviceType: 'phone',
  platform: 'iphone',
  browser: 'safari',
  installedApp: false,
  countryCode: 'ES',
  ipAddress: '90.71.66.***',
  // Sin «Z», como mandaba la API: es UTC
  lastUsedAt: '2026-11-05T19:07:00',
  createdAt: '2026-11-05T19:04:00Z',
  isActive: true,
  isCurrentDevice: true,
};
const MAC = {
  ...IPHONE,
  id: 'd-2',
  deviceType: 'computer',
  platform: 'mac',
  countryCode: null,
  isCurrentDevice: false,
};
vi.mock('../hooks/useDeviceManagement', () => ({
  useDeviceManagement: () => ({ devices: [IPHONE, MAC], isLoading: false, error: null, revokeDevice: vi.fn(), refetch: vi.fn(), revokingDeviceIds: new Set(), deviceErrors: new Map() }),
}));

const { default: DeviceManagement } = await import('./DeviceManagement');
const abrir = () => render(<MemoryRouter><DeviceManagement /></MemoryRouter>);

// En una zona fija distinta de UTC: el CI corre en UTC, y ahí leer la fecha sin «Z»
// como hora local da lo mismo que leerla como UTC, así que el test no probaría nada
const ZONA_ORIGINAL = process.env.TZ;
beforeAll(() => {
  process.env.TZ = 'Europe/Madrid';
});
afterAll(() => {
  process.env.TZ = ZONA_ORIGINAL;
});

describe('DeviceManagement · lo que enseña cada dispositivo', () => {
  beforeEach(() => vi.clearAllMocks());

  it('P1: las horas, en la zona del que mira, aunque la API las mande sin «Z»', () => {
    abrir();

    // 19:07 y 19:04 UTC son las 20:07 y 20:04 en Madrid (noviembre, UTC+1)
    expect(screen.getAllByText((_, el) => el?.tagName === 'SPAN' && el.textContent.includes('20:07')).length).toBeGreaterThan(0);
    expect(screen.getAllByText((_, el) => el?.tagName === 'SPAN' && el.textContent.includes('20:04')).length).toBeGreaterThan(0);
    expect(screen.queryAllByText((_, el) => el?.tagName === 'SPAN' && el.textContent.includes('19:07'))).toHaveLength(0);
  });

  it('P2: el nombre traducido y el icono por tipo', () => {
    abrir();

    expect(screen.getByText('iPhone · Safari')).toBeInTheDocument();
    expect(screen.getByText('Mac · Safari')).toBeInTheDocument();
    expect(screen.getAllByTestId('icono-phone')).toHaveLength(1);
    expect(screen.getAllByTestId('icono-computer')).toHaveLength(1);
    expect(screen.queryByText('Safari on iOS')).not.toBeInTheDocument();
  });

  it('P3: el dispositivo desde el que se mira sale como «Este dispositivo»', () => {
    abrir();

    expect(screen.getAllByText('Este dispositivo')).toHaveLength(1);
  });

  it('P4: la IP tapada y el país', () => {
    abrir();

    expect(screen.getAllByText((_, el) => el?.tagName === 'SPAN' && el.textContent.includes('90.71.66.***')).length).toBeGreaterThan(0);
    expect(screen.getAllByText((_, el) => el?.tagName === 'SPAN' && el.textContent.includes('España')).length).toBe(1);
  });
});
