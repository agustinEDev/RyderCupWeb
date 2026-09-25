import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

/**
 * Las fechas del perfil (FE #710), gemelas de las de editarlo: se leían sin
 * huso y en el idioma del navegador, no en el de la aplicación, y «Not set»
 * era a la vez texto y la condición de si había hándicap.
 *
 *   #    caso               | qué pasa
 *   -----|------------------|----------------------------------------------------
 *   PR1  con hándicap       | su fecha y «miembro desde», en el idioma de la app
 *   PR2  sin hándicap       | traducido, sin fecha ni insignia de hándicap
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (clave, v) => (v && typeof v === 'object' ? `${clave} ${Object.values(v).join(' ')}` : clave),
    i18n: { language: 'es' },
  }),
}));
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: () => ({ children, ...p }) => <div {...p}>{children}</div> }),
}));
vi.mock('../components/layout/HeaderAuth', () => ({ default: () => null }));
vi.mock('../components/ui/LanguageSwitcher', () => ({ default: () => null }));
vi.mock('../components/ui/Avatar', () => ({ default: () => null }));
vi.mock('../components/ui/FullScreenLoader', () => ({ default: () => null }));
vi.mock('../components/profile/ActivitySharingToggle', () => ({ default: () => null }));
vi.mock('../hooks/useStandalone', () => ({ useStandalone: () => false }));
vi.mock('../hooks/useLogout', () => ({ useLogout: () => ({ logout: vi.fn() }) }));
vi.mock('../utils/countryUtils', () => ({ CountryFlag: () => null }));
vi.mock('../composition', () => ({
  fetchCountriesUseCase: { execute: vi.fn().mockResolvedValue([]) },
  listUserCompetitionsUseCase: { execute: vi.fn().mockResolvedValue([]) },
}));
let usuario;
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: usuario, loading: false }) }));

const Profile = (await import('./Profile')).default;

const pintar = () =>
  render(
    <MemoryRouter>
      <Profile />
    </MemoryRouter>
  );

const base = {
  id: 'u1',
  first_name: 'Ana',
  last_name: 'Alba',
  email: 'ana@example.com',
  created_at: '2026-01-15T10:00:00',
  updated_at: '2026-03-02T10:00:00',
};

describe('Profile · las fechas (FE #710)', () => {
  it('PR1: con hándicap, sus fechas en el idioma de la app', async () => {
    usuario = { ...base, handicap: 18.2, handicap_updated_at: '2026-09-24T10:00:00' };
    pintar();

    expect((await screen.findAllByText('updatedOn 24 de septiembre de 2026')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('memberSince 15 de enero de 2026').length).toBeGreaterThan(0);
    expect(screen.getAllByText('lastUpdated 2 de marzo de 2026').length).toBeGreaterThan(0);
    expect(screen.getAllByText('handicapRegistered').length).toBeGreaterThan(0);
  });

  it('PR2: sin hándicap, traducido y sin fecha', async () => {
    usuario = { ...base, handicap: null, handicap_updated_at: null };
    pintar();

    expect((await screen.findAllByText('edit.handicap.notSet')).length).toBeGreaterThan(0);
    expect(screen.queryByText(/^updatedOn/)).toBeNull();
    expect(screen.queryByText('handicapRegistered')).toBeNull();
  });
});
