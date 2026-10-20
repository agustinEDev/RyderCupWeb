import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

/**
 * Lo legal del registro (auditoría del 20 oct 2026).
 *
 * - Los enlaces iban a `#terms` y `#privacy`, que no llevan a ningún sitio.
 * - Los Términos se ACEPTAN con una casilla, y con ella se declara la edad
 *   mínima (16 años): sin marcarla no se crea la cuenta.
 * - La privacidad se INFORMA, no se acepta: el tratamiento se basa en el
 *   contrato, no en un consentimiento. Por eso va fuera de la casilla.
 * - Google no pasa por esta casilla: su botón también entra con cuentas que ya
 *   existen, y los usuarios nuevos de Google aceptan en /auth/complete-profile.
 */
const registrar = vi.fn();
const urlDeGoogle = vi.fn(() => '#google');
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (clave) => clave, i18n: { language: 'es' } }),
}));
vi.mock('../utils/toast', () => ({ default: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));
vi.mock('../hooks/useRedirectIfAuthenticated', () => ({ useRedirectIfAuthenticated: () => false }));
vi.mock('../utils/googleOAuth', () => ({ buildGoogleOAuthUrl: (...a) => urlDeGoogle(...a) }));
vi.mock('../composition', () => ({
  registerUseCase: { execute: (...a) => registrar(...a) },
  fetchCountriesUseCase: { execute: vi.fn().mockResolvedValue([]) },
}));

const { default: Register } = await import('./Register');

const abrir = () =>
  render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>
  );

const rellenar = (container) => {
  const campo = (nombre) => container.querySelector(`[name="${nombre}"]`);
  fireEvent.change(campo('firstName'), { target: { name: 'firstName', value: 'Ana' } });
  fireEvent.change(campo('lastName'), { target: { name: 'lastName', value: 'Prueba' } });
  fireEvent.change(campo('email'), { target: { name: 'email', value: 'ana@example.com' } });
  fireEvent.change(campo('password'), { target: { name: 'password', value: 'Valida-Prueba123!' } });
  fireEvent.change(campo('confirmPassword'), { target: { name: 'confirmPassword', value: 'Valida-Prueba123!' } });
  return () => fireEvent.submit(campo('password').closest('form'));
};

const casilla = () => screen.getByRole('checkbox', { name: /register\.acceptTerms/ });

describe('Register · Términos, edad y privacidad', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registrar.mockResolvedValue({});
  });

  it.each([
    ['register.termsLink', '/terms'],
    ['register.privacyLink', '/privacy'],
  ])('R1: %s lleva a %s en una pestaña nueva, sin perder el formulario', (texto, ruta) => {
    abrir();

    const enlace = screen.getByRole('link', { name: texto });
    expect(enlace).toHaveAttribute('href', ruta);
    expect(enlace).toHaveAttribute('target', '_blank');
    expect(enlace).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(enlace).toHaveAttribute('rel', expect.stringContaining('noreferrer'));
  });

  it('R2: la casilla empieza sin marcar y dice qué se acepta', () => {
    abrir();

    expect(casilla()).not.toBeChecked();
    expect(casilla()).toHaveAccessibleName(/register\.acceptTermsPrefix.*register\.termsLink.*register\.acceptTermsSuffix/);
  });

  it('R2: sin marcarla no se envía y sale un error asociado a la casilla', async () => {
    const { container } = abrir();
    const enviar = rellenar(container);

    enviar();

    expect(await screen.findByText('register.acceptTermsRequired')).toBeInTheDocument();
    expect(registrar).not.toHaveBeenCalled();
    expect(casilla()).toHaveAttribute('aria-invalid', 'true');
    expect(casilla()).toHaveAccessibleDescription('register.acceptTermsRequired');
  });

  it('R2: marcada, se envía y el error desaparece', async () => {
    const { container } = abrir();
    const enviar = rellenar(container);
    enviar();
    await screen.findByText('register.acceptTermsRequired');

    fireEvent.click(casilla());

    expect(screen.queryByText('register.acceptTermsRequired')).toBeNull();
    expect(casilla()).not.toHaveAttribute('aria-invalid', 'true');
    enviar();
    await waitFor(() => expect(registrar).toHaveBeenCalledTimes(1));
    // F1: el backend exige `accept_terms: true`
    expect(registrar.mock.calls[0][0]).toMatchObject({ acceptTerms: true });
  });

  it('R3: la privacidad se informa fuera de la casilla, no se acepta', () => {
    abrir();

    const privacidad = screen.getByRole('link', { name: 'register.privacyLink' });
    expect(casilla()).not.toHaveAccessibleName(/privacy/i);
    expect(privacidad.closest('label')).toBeNull();
    expect(privacidad.parentElement).toHaveTextContent('register.privacyNoticePrefix');
  });

  // R4 (revisión): el botón de Google de esta página también ENTRA con una
  // cuenta que ya existe, así que no puede pedir la casilla de crear cuenta. Los
  // usuarios nuevos de Google la aceptan en /auth/complete-profile
  it('R4: Google no depende de la casilla', () => {
    abrir();

    fireEvent.click(screen.getByRole('button', { name: 'google.signUpWithGoogle' }));

    expect(urlDeGoogle).toHaveBeenCalledWith('login');
    expect(screen.queryByText('register.acceptTermsRequired')).toBeNull();
    expect(casilla()).not.toHaveAttribute('aria-invalid', 'true');
  });
});
