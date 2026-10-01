import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router';

/**
 * FE #776: la página de verificar el correo tenía todos sus textos en inglés
 * fijo, fuera de t(), y en el error enseñaba el mensaje del backend, que viene
 * siempre en español.
 *
 *   #   estado                       | se ve
 *   ----|-----------------------------|------------------------------------------
 *   E1  verificando                  | verifyEmail.verifyingTitle / verifyingBody
 *   E2  verificado                   | verifyEmail.successTitle / successMessage
 *   E3  enlace sin token             | verifyEmail.invalidTitle / invalidMessage
 *   E4  la verificación falla        | verifyEmail.errorTitle y sus dos botones
 *   E5  el backend da su mensaje     | el texto propio, no el del backend
 *   E6  en ningún estado             | ni un texto fijo en inglés (sinIngles(), en cada test)
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (clave) => clave, i18n: { language: 'es' } }),
}));
vi.mock('../composition', () => ({ verifyEmailUseCase: { execute: vi.fn() } }));

const { verifyEmailUseCase } = await import('../composition');
const { default: VerifyEmail } = await import('./VerifyEmail');

const INGLES = [
  'Verifying your email',
  'Please wait while we verify',
  'Email Verified',
  'Redirecting to dashboard',
  'Go to Dashboard Now',
  'Verification Failed',
  'Go to Login',
  'Go to Home',
  'Invalid Link',
  'Back to Home',
  'Verification token is missing',
  'Failed to verify email',
  'has been verified successfully',
];
const sinIngles = () => {
  for (const texto of INGLES) expect(document.body.textContent).not.toContain(texto);
};

const abrir = (url = '/verify-email?token=abc123') => {
  window.history.replaceState(null, '', url);
  render(
    <BrowserRouter>
      <Routes>
        <Route path="/verify-email" element={<VerifyEmail />} />
      </Routes>
    </BrowserRouter>
  );
};

describe('VerifyEmail · textos traducidos (FE #776)', () => {
  afterEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, '', '/');
  });

  it('E1: mientras verifica', () => {
    verifyEmailUseCase.execute.mockReturnValue(new Promise(() => {}));
    abrir();
    expect(screen.getByText('verifyEmail.verifyingTitle')).toBeInTheDocument();
    expect(screen.getByText('verifyEmail.verifyingBody')).toBeInTheDocument();
    sinIngles();
  });

  it('E2: verificado', async () => {
    verifyEmailUseCase.execute.mockResolvedValue({});
    abrir();
    expect(await screen.findByText('verifyEmail.successTitle', {}, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.getByText('verifyEmail.successMessage')).toBeInTheDocument();
    expect(screen.getByText('verifyEmail.redirecting')).toBeInTheDocument();
    expect(screen.getByText('verifyEmail.goToDashboard')).toBeInTheDocument();
    sinIngles();
  });

  it('E3: sin token en el enlace', async () => {
    abrir('/verify-email');
    expect(await screen.findByText('verifyEmail.invalidTitle')).toBeInTheDocument();
    expect(screen.getByText('verifyEmail.invalidMessage')).toBeInTheDocument();
    sinIngles();
  });

  it('E4 y E5: la verificación falla y el mensaje es el propio', async () => {
    verifyEmailUseCase.execute.mockRejectedValue(new Error('Token de verificación inválido'));
    abrir();
    expect(await screen.findByText('verifyEmail.errorTitle', {}, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.getByText('verifyEmail.errorMessage')).toBeInTheDocument();
    expect(screen.getByText('verifyEmail.goToLogin')).toBeInTheDocument();
    expect(screen.getByText('verifyEmail.goToHome')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('Token de verificación inválido');
    sinIngles();
  });
});
