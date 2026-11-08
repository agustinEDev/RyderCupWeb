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
 *   G5  Google no verificó el correo   | google.emailNotVerified (RyderCupAm: ni alta ni vínculo)
 *   G6  la cuenta está desactivada     | google.accountDeactivated, no invitar a reintentar
 *   G7  vincular sin el correo verificado | google.linkNeedsVerifiedEmail (RyderCupAm #749)
 */
import { noAvisesDeCierres, seCierraLaSesionAPeticion } from '../utils/avisoDeCierreForzado';
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (clave) => clave, i18n: { language: 'es' } }),
}));
vi.mock('../utils/toast', () => ({ default: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));
vi.mock('../hooks/useAuthContext', () => ({ useAuthContext: () => ({ setUser: vi.fn(), updateCsrfToken: vi.fn() }) }));
vi.mock('../composition', () => ({
  googleLoginUseCase: { execute: vi.fn() },
  linkGoogleAccountUseCase: { execute: vi.fn() },
}));
const estado = vi.hoisted(() => ({ valid: true, flow: 'login', vuelta: null, recogidas: 0 }));
vi.mock('../utils/googleOAuth', () => ({
  verifyOAuthState: () => ({ flow: estado.flow, valid: estado.valid }),
  recogeLaVueltaDeGoogle: () => {
    estado.recogidas += 1;
    return estado.vuelta;
  },
}));

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

  it.each([
    ['cancela en Google', '?error=access_denied&state=x', true],
    ['el state no cuadra', '?code=abc&state=otro', false],
    ['sin code', '?state=x', true],
  ])('G1b: %s: la página guardada se olvida (probador, 8 nov)', async (_caso, query, valido) => {
    estado.valid = valido;
    sessionStorage.setItem('vuelta_tras_entrar', '/competitions/7');

    abrir(query);

    expect(await screen.findByText('google.errorTitle')).toBeInTheDocument();
    expect(sessionStorage.getItem('vuelta_tras_entrar')).toBeNull();
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

  it('G5: Google no ha verificado el correo: dice qué hacer', async () => {
    googleLoginUseCase.execute.mockRejectedValue(
      Object.assign(new Error('Your Google account email is not verified.'), {
        status: 400,
        errorCode: 'GOOGLE_EMAIL_NOT_VERIFIED',
      })
    );
    abrir('?code=abc&state=ok');
    expect(await screen.findByText('google.emailNotVerified')).toBeInTheDocument();
    expect(screen.queryByText('google.genericError')).toBeNull();
  });

  it('G7: vincular sin el correo verificado: dice que lo verifique', async () => {
    estado.flow = 'link';
    linkGoogleAccountUseCase.execute.mockRejectedValue(
      Object.assign(new Error('Verify your email before linking a Google account.'), {
        status: 403,
        errorCode: 'GOOGLE_LINK_NEEDS_VERIFIED_EMAIL',
      })
    );
    abrir('?code=abc&state=ok');
    expect(await screen.findByText('google.linkNeedsVerifiedEmail')).toBeInTheDocument();
    expect(screen.queryByText('google.linkError')).toBeNull();
  });

  it('G8: vincular sin haber confirmado la contraseña: dice que la confirme (RyderCupAm #753)', async () => {
    estado.flow = 'link';
    linkGoogleAccountUseCase.execute.mockRejectedValue(
      Object.assign(new Error('Verify your email before linking a Google account.'), {
        status: 403,
        errorCode: 'REAUTHENTICATION_REQUIRED',
      })
    );
    abrir('?code=abc&state=ok');
    expect(await screen.findByText('google.reauthRequired')).toBeInTheDocument();
    expect(screen.queryByText('google.linkError')).toBeNull();
  });

  it('G6: la cuenta está desactivada: lo dice, sin invitar a reintentar', async () => {
    googleLoginUseCase.execute.mockRejectedValue(
      Object.assign(new Error('This account has been deactivated.'), {
        status: 403,
        errorCode: 'ACCOUNT_DEACTIVATED',
      })
    );
    abrir('?code=abc&state=ok');
    expect(await screen.findByText('google.accountDeactivated')).toBeInTheDocument();
    expect(screen.queryByText('google.genericError')).toBeNull();
  });
});

/**
 * La casilla de los Términos vive en `/auth/complete-profile` (M1): solo la ven
 * los usuarios NUEVOS. Quien ya tenía cuenta sigue entrando directo al panel.
 */
describe('GoogleCallback · a dónde va cada usuario (M1)', () => {
  afterEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, '', '/');
  });

  const abrirConRutas = () => {
    window.history.replaceState(null, '', '/auth/google/callback?code=abc&state=ok');
    render(
      <BrowserRouter>
        <Routes>
          <Route path="/auth/google/callback" element={<GoogleCallback />} />
          <Route path="/auth/complete-profile" element={<p>completar perfil</p>} />
          <Route path="/dashboard" element={<p>panel</p>} />
          <Route path="/confirm-email-change" element={<p>confirmar el correo</p>} />
          <Route path="/competitions/7" element={<p>la competición</p>} />
        </Routes>
      </BrowserRouter>
    );
  };

  it('un usuario que ya existía va al panel, sin pasar por la casilla', async () => {
    googleLoginUseCase.execute.mockResolvedValue({ user: { firstName: 'Ana' }, csrfToken: 't', isNewUser: false });

    abrirConRutas();

    expect(await screen.findByText('panel')).toBeInTheDocument();
    expect(screen.queryByText('completar perfil')).toBeNull();
  });

  it('con la vuelta guardada, vuelve a confirmar el cambio de correo (RyderCupAm #753)', async () => {
    estado.vuelta = '/confirm-email-change?token=abc';
    googleLoginUseCase.execute.mockResolvedValue({ user: { firstName: 'Ana' }, csrfToken: 't', isNewUser: false });

    abrirConRutas();

    expect(await screen.findByText('confirmar el correo')).toBeInTheDocument();
    estado.vuelta = null;
  });

  it('sin vuelta de Google, usa la página guardada por una redirección dura y la gasta', async () => {
    sessionStorage.setItem('vuelta_tras_entrar', '/competitions/7');
    googleLoginUseCase.execute.mockResolvedValue({ user: { firstName: 'Ana' }, csrfToken: 't', isNewUser: false });

    abrirConRutas();

    expect(await screen.findByText('la competición')).toBeInTheDocument();
    expect(sessionStorage.getItem('vuelta_tras_entrar')).toBeNull();
  });

  it('un alta nueva olvida la página guardada', async () => {
    sessionStorage.setItem('vuelta_tras_entrar', '/competitions/7');
    googleLoginUseCase.execute.mockResolvedValue({ user: { firstName: 'Ana' }, csrfToken: 't', isNewUser: true });

    abrirConRutas();

    expect(await screen.findByText('completar perfil')).toBeInTheDocument();
    expect(sessionStorage.getItem('vuelta_tras_entrar')).toBeNull();
  });

  it('un alta nueva acaba el silencio de un cierre de sesión anterior (revisión, 8 nov)', async () => {
    noAvisesDeCierres();
    googleLoginUseCase.execute.mockResolvedValue({ user: { firstName: 'Ana' }, csrfToken: 't', isNewUser: true });

    abrirConRutas();

    expect(await screen.findByText('completar perfil')).toBeInTheDocument();
    expect(seCierraLaSesionAPeticion()).toBe(false);
  });

  it('un usuario nuevo va a completar el perfil, donde acepta los Términos', async () => {
    estado.recogidas = 0;
    googleLoginUseCase.execute.mockResolvedValue({ user: { firstName: 'Ana' }, csrfToken: 't', isNewUser: true });

    abrirConRutas();

    expect(await screen.findByText('completar perfil')).toBeInTheDocument();
    // La vuelta guardada (con el token del enlace) no se queda en el almacenamiento
    expect(estado.recogidas).toBe(1);
  });
});
