import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

/**
 * Quien entra por primera vez con Google desde /login o /start no pasa por el
 * registro, así que no aceptaba los Términos en ningún sitio (revisión de la
 * auditoría legal, M1). Todos los usuarios nuevos de Google aterrizan aquí
 * (`GoogleCallback`, `isNewUser`), y aquí se pide lo mismo que en el registro.
 *
 * El error es propio y no el del registro: aquí la cuenta ya existe, así que
 * no puede decir «para crear tu cuenta».
 *
 * Saltar el formulario tampoco vale sin la casilla: «Omitir por ahora» era otra
 * forma de completar la entrada sin aceptar nada.
 */
const actualizarPerfil = vi.fn();
const refetch = vi.fn();
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (clave) => clave, i18n: { language: 'es' } }),
}));
vi.mock('../utils/toast', () => ({ default: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'u-1' }, refetch }) }));
vi.mock('../components/ui/CountryAutocomplete', () => ({ default: () => null }));
vi.mock('../composition', () => ({
  updateUserProfileUseCase: { execute: (...a) => actualizarPerfil(...a) },
  updateManualHandicapUseCase: { execute: vi.fn() },
  fetchCountriesUseCase: { execute: vi.fn().mockResolvedValue([]) },
}));

const { default: CompleteProfile } = await import('./CompleteProfile');

const abrir = () =>
  render(
    <MemoryRouter initialEntries={['/auth/complete-profile']}>
      <Routes>
        <Route path="/auth/complete-profile" element={<CompleteProfile />} />
        <Route path="/dashboard" element={<p>panel</p>} />
      </Routes>
    </MemoryRouter>
  );

const casilla = () => screen.getByRole('checkbox', { name: /register\.acceptTerms/ });
const guardar = () => fireEvent.click(screen.getByRole('button', { name: 'google.completeProfile.saveButton' }));
const omitir = () => fireEvent.click(screen.getByRole('button', { name: 'google.completeProfile.skipButton' }));

describe('CompleteProfile · Términos y edad para el usuario nuevo de Google (M1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    refetch.mockResolvedValue(undefined);
  });

  it.each([
    ['register.termsLink', '/terms'],
    ['register.privacyLink', '/privacy'],
  ])('%s lleva a %s en una pestaña nueva', (texto, ruta) => {
    abrir();

    const enlace = screen.getByRole('link', { name: texto });
    expect(enlace).toHaveAttribute('href', ruta);
    expect(enlace).toHaveAttribute('target', '_blank');
    expect(enlace).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('la casilla empieza sin marcar y la privacidad se informa fuera de ella', () => {
    abrir();

    expect(casilla()).not.toBeChecked();
    expect(casilla()).not.toHaveAccessibleName(/privacy/i);
    const privacidad = screen.getByRole('link', { name: 'register.privacyLink' });
    expect(privacidad.closest('label')).toBeNull();
    expect(privacidad.parentElement).toHaveTextContent('register.privacyNoticePrefix');
  });

  it('sin marcarla no se guarda: error accesible asociado a la casilla', async () => {
    abrir();

    guardar();

    expect(await screen.findByText('google.completeProfile.acceptTermsRequired')).toBeInTheDocument();
    expect(casilla()).toHaveAttribute('aria-invalid', 'true');
    expect(casilla()).toHaveAccessibleDescription('google.completeProfile.acceptTermsRequired');
    expect(refetch).not.toHaveBeenCalled();
    expect(screen.queryByText('panel')).toBeNull();
  });

  it('sin marcarla tampoco se puede omitir', () => {
    abrir();

    omitir();

    expect(screen.getByText('google.completeProfile.acceptTermsRequired')).toBeInTheDocument();
    expect(screen.queryByText('panel')).toBeNull();
  });

  it('marcada, se guarda y se entra al panel', async () => {
    abrir();

    fireEvent.click(casilla());
    guardar();

    expect(await screen.findByText('panel')).toBeInTheDocument();
    expect(refetch).toHaveBeenCalled();
  });

  it('marcada, se puede omitir el resto', async () => {
    abrir();

    fireEvent.click(casilla());
    omitir();

    expect(await screen.findByText('panel')).toBeInTheDocument();
  });

  it('al marcarla, el error se va', async () => {
    abrir();
    guardar();
    await screen.findByText('google.completeProfile.acceptTermsRequired');

    fireEvent.click(casilla());

    await waitFor(() => expect(screen.queryByText('google.completeProfile.acceptTermsRequired')).toBeNull());
    expect(casilla()).not.toHaveAttribute('aria-invalid', 'true');
  });
});

describe('CompleteProfile · el texto del error (revisión)', () => {
  it.each([
    ['es', /continuar/i, /crear/i],
    ['en', /continue/i, /create/i],
  ])('%s: pide aceptar para continuar, no para crear la cuenta', async (idioma, continuar, crear) => {
    const { default: auth } = await import(`../i18n/locales/${idioma}/auth.json`);
    const texto = auth.google.completeProfile.acceptTermsRequired;

    expect(texto).toMatch(continuar);
    expect(texto).toMatch(/16/);
    expect(texto).not.toMatch(crear);
  });
});
