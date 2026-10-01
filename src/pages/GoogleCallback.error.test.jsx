import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router';

/**
 * FE #776: con un error de Google, la página ponía el mismo texto
 * (google.callbackError) de título y de párrafo. El título es ahora propio y
 * corto, y el detalle va una sola vez.
 *
 *   #   Google vuelve con              | se ve
 *   ----|-------------------------------|--------------------------------------
 *   G1  ?error=access_denied           | google.errorTitle + google.callbackError, una vez cada uno
 *   G2  un state que no cuadra         | lo mismo
 *   G3  falla la vinculación (500)     | google.linkErrorTitle + google.linkError (estaba vinculando)
 *   G4  falla el login con su mensaje  | google.genericError, no el texto del backend sin traducir
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (clave) => clave, i18n: { language: 'es' } }),
}));
vi.mock('../utils/toast', () => ({ default: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));
vi.mock('../hooks/useAuthContext', () => ({ useAuthContext: () => ({ setUser: vi.fn(), updateCsrfToken: vi.fn() }) }));
vi.mock('../composition', () => ({
  googleLoginUseCase: { execute: vi.fn() },
  linkGoogleAccountUseCase: { execute: vi.fn() },
}));
const estado = vi.hoisted(() => ({ valid: true, flow: 'login' }));
vi.mock('../utils/googleOAuth', () => ({ verifyOAuthState: () => ({ flow: estado.flow, valid: estado.valid }) }));

const { googleLoginUseCase, linkGoogleAccountUseCase } = await import('../composition');
const { default: GoogleCallback } = await import('./GoogleCallback');
const errorDelServidor = (mensaje) => Object.assign(new Error(mensaje), { status: 500 });

const abrir = (query) => {
  window.history.replaceState(null, '', `/auth/google/callback${query}`);
  render(
    <BrowserRouter>
      <Routes>
        <Route path="/auth/google/callback" element={<GoogleCallback />} />
      </Routes>
    </BrowserRouter>
  );
};

describe('GoogleCallback · el error sale una vez (FE #776)', () => {
  afterEach(() => {
    vi.clearAllMocks();
    estado.valid = true;
    estado.flow = 'login';
    window.history.replaceState(null, '', '/');
  });

  it('G1: Google devuelve un error', async () => {
    abrir('?error=access_denied&state=x');
    expect(await screen.findByText('google.errorTitle')).toBeInTheDocument();
    expect(screen.getAllByText('google.callbackError')).toHaveLength(1);
  });

  it('G2: el state no cuadra', async () => {
    estado.valid = false;
    abrir('?code=abc&state=otro');
    expect(await screen.findByText('google.errorTitle')).toBeInTheDocument();
    expect(screen.getAllByText('google.callbackError')).toHaveLength(1);
  });

  it('G3: falla la vinculación: título y texto de vincular', async () => {
    estado.flow = 'link';
    linkGoogleAccountUseCase.execute.mockRejectedValue(errorDelServidor('Internal server error'));
    abrir('?code=abc&state=ok');
    expect(await screen.findByText('google.linkErrorTitle')).toBeInTheDocument();
    expect(screen.getByText('google.linkError')).toBeInTheDocument();
    expect(screen.queryByText('google.errorTitle')).toBeNull();
  });

  it('G4: falla el login: el texto propio, no el del backend', async () => {
    googleLoginUseCase.execute.mockRejectedValue(errorDelServidor('Error interno del servidor'));
    abrir('?code=abc&state=ok');
    expect(await screen.findByText('google.genericError')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('Error interno del servidor');
  });
});
