import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router';

/**
 * PKCE a la vuelta de Google (fase 3, aprobado por Agustín):
 *
 *   #   vuelve con                          | se espera
 *   ----|-------------------------------------|---------------------------------------------
 *   K1  login con verifier                  | canje con (código, verifier)
 *   K2  vincular con verifier               | vínculo con (código, verifier)
 *   K3  sin verifier (otra pestaña, vacío)  | google.missingVerifier y NO se llama al backend
 *   K4  sin verifier al vincular            | lo mismo, con el título de vincular
 *   K5  state que no cuadra / Google error  | el verifier se recoge (y borra) igual
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
const estado = vi.hoisted(() => ({ valid: true, flow: 'login', verifier: null, recogidos: 0 }));
vi.mock('../utils/googleOAuth', () => ({
  verifyOAuthState: () => ({ flow: estado.flow, valid: estado.valid }),
  recogeLaVueltaDeGoogle: () => null,
  recogeLaVueltaDeGoogleConSuCuenta: () => null,
  recogeElVerificadorDeGoogle: () => {
    estado.recogidos += 1;
    return estado.verifier;
  },
}));

const { googleLoginUseCase, linkGoogleAccountUseCase } = await import('../composition');
const { default: GoogleCallback } = await import('./GoogleCallback');

const VERIFIER = 'v'.repeat(43);

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

describe('GoogleCallback · PKCE (fase 3)', () => {
  afterEach(() => {
    vi.clearAllMocks();
    Object.assign(estado, { valid: true, flow: 'login', verifier: null, recogidos: 0 });
    window.history.replaceState(null, '', '/');
  });

  it('K1: al entrar canjea el código con el verifier', async () => {
    estado.verifier = VERIFIER;
    googleLoginUseCase.execute.mockReturnValue(new Promise(() => {}));

    abrir('?code=abc&state=ok');

    await waitFor(() => expect(googleLoginUseCase.execute).toHaveBeenCalledWith('abc', VERIFIER));
  });

  it('K2: al vincular manda el verifier', async () => {
    estado.verifier = VERIFIER;
    estado.flow = 'link';
    linkGoogleAccountUseCase.execute.mockReturnValue(new Promise(() => {}));

    abrir('?code=abc&state=ok');

    await waitFor(() => expect(linkGoogleAccountUseCase.execute).toHaveBeenCalledWith('abc', VERIFIER));
  });

  it('K3: sin verifier dice que se vuelva a intentar y no llama al backend', async () => {
    abrir('?code=abc&state=ok');

    expect(await screen.findByText('google.missingVerifier')).toBeInTheDocument();
    expect(screen.getByText('google.errorTitle')).toBeInTheDocument();
    expect(googleLoginUseCase.execute).not.toHaveBeenCalled();
    expect(linkGoogleAccountUseCase.execute).not.toHaveBeenCalled();
  });

  it('K4: sin verifier al vincular, igual, con el título de vincular', async () => {
    estado.flow = 'link';
    abrir('?code=abc&state=ok');

    expect(await screen.findByText('google.missingVerifier')).toBeInTheDocument();
    expect(screen.getByText('google.linkErrorTitle')).toBeInTheDocument();
    expect(linkGoogleAccountUseCase.execute).not.toHaveBeenCalled();
  });

  it.each([
    ['el state no cuadra', '?code=abc&state=otro', false],
    ['Google devuelve un error', '?error=access_denied&state=ok', true],
    ['falta el código', '?state=ok', true],
  ])('K5: %s: el verifier se recoge (y se borra) igual', async (_caso, query, valido) => {
    estado.valid = valido;
    estado.verifier = VERIFIER;

    abrir(query);

    expect(await screen.findByText('google.errorTitle')).toBeInTheDocument();
    expect(estado.recogidos).toBe(1);
    expect(googleLoginUseCase.execute).not.toHaveBeenCalled();
  });
});
