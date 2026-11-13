import { StrictMode } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

/**
 * El código de Google se canjea UNA vez (A07): el servidor rechaza el segundo
 * canje y, si llegara, la pantalla enseñaría un error con la sesión ya abierta.
 *
 *   #      caso                                               | qué pasa
 *   -------|----------------------------------------------------|-------------------------------
 *   T3-14  dentro de <StrictMode>: al montar                   | un canje, navega, sin error
 *   T3-15  esperando el canje, cambia el idioma o se repinta   | no hay un segundo canje
 */
const traduccion = vi.hoisted(() => ({ actual: null }));
const crearTraduccion = (idioma) => ({
  t: (clave) => `${idioma}:${clave}`,
  i18n: { language: idioma },
});
vi.mock('react-i18next', () => ({
  useTranslation: () => traduccion.actual,
}));
vi.mock('../utils/toast', () => ({
  default: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));
vi.mock('../hooks/useAuthContext', () => ({
  useAuthContext: () => ({ setUser: vi.fn(), updateCsrfToken: vi.fn() }),
}));
vi.mock('../composition', () => ({
  googleLoginUseCase: { execute: vi.fn() },
  linkGoogleAccountUseCase: { execute: vi.fn() },
}));
const estado = vi.hoisted(() => ({ verificadores: 0 }));
vi.mock('../utils/googleOAuth', () => ({
  verifyOAuthState: () => ({ flow: 'login', valid: true }),
  recogeLaVueltaDeGoogleConSuCuenta: () => null,
  recogeElVerificadorDeGoogle: () => {
    estado.verificadores += 1;
    // Como el de verdad: se lee y se borra, así que el segundo no lo encuentra
    return estado.verificadores === 1 ? 'v'.repeat(43) : null;
  },
}));

const { googleLoginUseCase } = await import('../composition');
const { default: GoogleCallback } = await import('./GoogleCallback');

const arbol = () => (
  <StrictMode>
    <MemoryRouter initialEntries={['/auth/google/callback?code=abc&state=ok']}>
      <Routes>
        <Route path="/auth/google/callback" element={<GoogleCallback />} />
        <Route path="/dashboard" element={<p>panel</p>} />
      </Routes>
    </MemoryRouter>
  </StrictMode>
);

describe('GoogleCallback · el código se canjea una vez', () => {
  afterEach(() => {
    vi.clearAllMocks();
    estado.verificadores = 0;
  });

  it('T3-14: en StrictMode canjea una vez, navega y no enseña ningún error', async () => {
    traduccion.actual = crearTraduccion('es');
    googleLoginUseCase.execute.mockResolvedValue({
      user: { id: 'u-1', firstName: 'Ana' },
      csrfToken: 't',
      isNewUser: false,
    });

    render(arbol());

    expect(await screen.findByText('panel')).toBeInTheDocument();
    expect(googleLoginUseCase.execute).toHaveBeenCalledTimes(1);
    expect(googleLoginUseCase.execute).toHaveBeenCalledWith(
      'abc',
      'v'.repeat(43),
    );
    expect(estado.verificadores).toBe(1);
    expect(screen.queryByText(/google\./)).not.toBeInTheDocument();
  });

  it('T3-15: esperando el canje, cambiar de idioma o repintar no canjea otra vez', async () => {
    traduccion.actual = crearTraduccion('es');
    let responder;
    googleLoginUseCase.execute.mockReturnValue(
      new Promise((r) => {
        responder = r;
      }),
    );

    const { rerender } = render(arbol());
    await act(async () => {});
    expect(googleLoginUseCase.execute).toHaveBeenCalledTimes(1);

    traduccion.actual = crearTraduccion('en');
    rerender(arbol());
    rerender(arbol());
    await act(async () => {});

    expect(googleLoginUseCase.execute).toHaveBeenCalledTimes(1);
    expect(estado.verificadores).toBe(1);

    await act(async () => {
      responder({
        user: { id: 'u-1', firstName: 'Ana' },
        csrfToken: 't',
        isNewUser: false,
      });
    });
    expect(await screen.findByText('panel')).toBeInTheDocument();
    expect(googleLoginUseCase.execute).toHaveBeenCalledTimes(1);
  });
});
