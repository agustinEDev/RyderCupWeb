import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

/**
 * La fecha del hándicap al editar el perfil (FE #710): salía siempre en inglés
 * (`en-US` fijo), leída sin huso, y con «Never» / «Not set» sin traducir. El
 * huso lo prueba `instanteEnTexto`; aquí, que la pantalla lo usa con su idioma.
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (clave, v) => (v && typeof v === 'object' ? `${clave} ${Object.values(v).join(' ')}` : clave),
    i18n: { language: 'es' },
  }),
}));
vi.mock('../components/layout/HeaderAuth', () => ({ default: () => null }));
vi.mock('../components/profile/AvatarPicker', () => ({ default: () => null }));
vi.mock('../components/ui/CountryAutocomplete', () => ({ default: () => null }));
vi.mock('../components/ui/FullScreenLoader', () => ({ default: () => null }));
vi.mock('../hooks/useAvatar', () => ({ useAvatar: () => ({}) }));

let usuario;
vi.mock('../hooks/useEditProfile', () => ({
  useEditProfile: () => ({
    user: usuario,
    formData: {
      firstName: '', lastName: '', alias: '', countryCode: '', gender: '',
      currentPassword: '', email: '', newPassword: '', confirmPassword: '', handicap: '',
    },
    countries: [],
    handleInputChange: vi.fn(),
  }),
}));

const EditProfile = (await import('./EditProfile')).default;

const pintar = () =>
  render(
    <MemoryRouter>
      <EditProfile />
    </MemoryRouter>
  );

describe('EditProfile · la fecha del hándicap (FE #710)', () => {
  it('EP1: en el idioma de la app', () => {
    usuario = { handicap: 18.2, handicap_updated_at: '2026-09-24T10:00:00' };
    pintar();

    expect(screen.getByText(/edit\.handicap\.lastUpdated .*24 de septiembre de 2026/)).toBeInTheDocument();
  });

  it('EP2: sin fecha ni hándicap, traducido', () => {
    usuario = { handicap: null, handicap_updated_at: null };
    pintar();

    expect(screen.getByText('edit.handicap.lastUpdated edit.handicap.never')).toBeInTheDocument();
    expect(screen.getByText('edit.handicap.notSet')).toBeInTheDocument();
  });
});
