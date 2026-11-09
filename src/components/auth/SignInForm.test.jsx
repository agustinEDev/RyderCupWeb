import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

/**
 * El formulario salio de `Login.jsx` para que lo comparta la pantalla de
 * arranque de la aplicacion instalada (FE #465). Lo que se prueba aqui es lo
 * que NO se puede duplicar sin que diverja: la validacion, el limite de
 * intentos y el borrado de la contrasena cuando el acceso falla.
 *
 * `Login.jsx` no tenia ninguna prueba, asi que estas son la red del refactor.
 */
// jsdom no trae `localStorage` en este proyecto: cada suite pone el suyo, igual
// que AuthContext.test.jsx
const almacenLocal = (() => {
  let datos = {};
  return {
    getItem: (clave) => datos[clave] || null,
    setItem: (clave, valor) => {
      datos[clave] = String(valor);
    },
    removeItem: (clave) => {
      delete datos[clave];
    },
    clear: () => {
      datos = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: almacenLocal });

const navegar = vi.fn();
const ejecutarLogin = vi.fn();
const ponerUsuario = vi.fn();
const errorToast = vi.fn();

import { noAvisesDeCierres, seCierraLaSesionAPeticion, vuelvenLosAvisosDeCierre } from '../../utils/avisoDeCierreForzado';
vi.mock('react-router', async () => {
  const real = await vi.importActual('react-router');
  return { ...real, useNavigate: () => navegar };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (clave) => clave, i18n: { language: 'es' } }),
}));

vi.mock('../../composition', () => ({
  loginUseCase: { execute: (...args) => ejecutarLogin(...args) },
}));

vi.mock('../../hooks/useAuthContext', () => ({
  useAuthContext: () => ({ setUser: ponerUsuario, updateCsrfToken: vi.fn() }),
}));

vi.mock('../../utils/toast', () => ({
  default: { error: (...a) => errorToast(...a), success: vi.fn(), info: vi.fn() },
}));

vi.mock('../ui/GoogleSignInButton', () => ({ default: () => <div>google</div> }));

const lanzarRefresco = vi.fn();
vi.mock('../../services/refrescoDeHandicap', () => ({
  APUNTE_REFRESCAR: 'refrescar_handicap',
  lanzaElRefrescoDeHandicap: (...args) => lanzarRefresco(...args),
}));

const SignInForm = (await import('./SignInForm')).default;

const pintar = () => render(<MemoryRouter><SignInForm /></MemoryRouter>);
const campoCorreo = () => screen.getByLabelText('login.emailLabel');
const campoContrasena = () => screen.getByPlaceholderText('login.passwordPlaceholder');
const escribir = (campo, valor) => fireEvent.change(campo, { target: { value: valor } });
// Se envia el formulario directamente y no con un clic en el boton: con un
// `<input type="email">`, la validacion nativa de jsdom aborta el envio antes de
// que React reciba el `submit`, y entonces la prueba mide jsdom, no el
// componente —comprobado: borrando `validateEmail` del componente seguia verde—
const enviar = () =>
  fireEvent.submit(screen.getByRole('button', { name: 'login.signInButton' }).closest('form'));

describe('SignInForm', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('no llama al backend con un correo que no vale', async () => {
    pintar();

    escribir(campoCorreo(), 'esto-no-es-un-correo');
    escribir(campoContrasena(), 'secreta');
    enviar();

    // El mock de i18n devuelve la clave, que es justo lo que se quiere comprobar:
    // el mensaje ya no es un literal en ingles sino una cadena traducible
    await waitFor(() => expect(screen.getByText('validation.emailInvalid')).toBeInTheDocument());
    expect(ejecutarLogin).not.toHaveBeenCalled();
  });

  it('no llama al backend sin contrasena', async () => {
    pintar();

    escribir(campoCorreo(), 'alguien@ejemplo.com');
    enviar();

    await waitFor(() => expect(screen.getByText('validation.passwordRequired')).toBeInTheDocument());
    expect(ejecutarLogin).not.toHaveBeenCalled();
  });

  it('entra y lleva al panel', async () => {
    ejecutarLogin.mockResolvedValue({
      user: { firstName: 'Agustin', emailVerified: true },
      csrfToken: 'tok',
      needsHandicap: false,
    });
    pintar();

    escribir(campoCorreo(), 'alguien@ejemplo.com');
    escribir(campoContrasena(), 'secreta');
    enviar();

    await waitFor(() => expect(ponerUsuario).toHaveBeenCalled());
    expect(navegar).toHaveBeenCalledWith('/dashboard', { replace: true });
  });

  it('C5: entrar acaba el silencio de un cierre de sesión anterior (8 nov)', async () => {
    noAvisesDeCierres();
    ejecutarLogin.mockResolvedValue({
      user: { firstName: 'Agustin', emailVerified: true },
      csrfToken: 'tok',
      needsHandicap: false,
    });
    pintar();

    escribir(campoCorreo(), 'alguien@ejemplo.com');
    escribir(campoContrasena(), 'secreta');
    enviar();

    await waitFor(() => expect(navegar).toHaveBeenCalled());
    expect(seCierraLaSesionAPeticion()).toBe(false);
  });

  it('entrar con éxito olvida el aviso de un cierre forzado que quedara guardado', async () => {
    const { guardaElAvisoDelCierre, tomaElAvisoDelCierre } = await import('../../utils/avisoTrasElCierre');
    guardaElAvisoDelCierre('revocation');
    ejecutarLogin.mockResolvedValue({
      user: { firstName: 'Agustin', emailVerified: true },
      csrfToken: 'tok',
      needsHandicap: false,
    });
    pintar();

    escribir(campoCorreo(), 'alguien@ejemplo.com');
    escribir(campoContrasena(), 'secreta');
    enviar();

    await waitFor(() => expect(navegar).toHaveBeenCalled());
    expect(tomaElAvisoDelCierre()).toBeNull();
  });

  it('un acceso fallido no olvida el aviso guardado', async () => {
    const { guardaElAvisoDelCierre, tomaElAvisoDelCierre } = await import('../../utils/avisoTrasElCierre');
    guardaElAvisoDelCierre('revocation');
    ejecutarLogin.mockRejectedValue(Object.assign(new Error('Credenciales'), { status: 401 }));
    pintar();

    escribir(campoCorreo(), 'alguien@ejemplo.com');
    escribir(campoContrasena(), 'secreta');
    enviar();

    await waitFor(() => expect(ejecutarLogin).toHaveBeenCalled());
    expect(tomaElAvisoDelCierre()).toBe('revocation');
  });

  it('C5: un acceso fallido no acaba el silencio', async () => {
    noAvisesDeCierres();
    ejecutarLogin.mockRejectedValue(Object.assign(new Error('Credenciales'), { status: 401 }));
    pintar();

    escribir(campoCorreo(), 'alguien@ejemplo.com');
    escribir(campoContrasena(), 'secreta');
    enviar();

    await waitFor(() => expect(ejecutarLogin).toHaveBeenCalled());
    expect(seCierraLaSesionAPeticion()).toBe(true);
    vuelvenLosAvisosDeCierre();
  });

  it('tras una redirección dura, vuelve a la página guardada (probador de la release)', async () => {
    sessionStorage.setItem('vuelta_tras_entrar', '/confirm-email-change?token=abc');
    ejecutarLogin.mockResolvedValue({
      user: { firstName: 'Agustin', emailVerified: true },
      csrfToken: 'tok',
      needsHandicap: false,
    });
    pintar();

    escribir(campoCorreo(), 'alguien@ejemplo.com');
    escribir(campoContrasena(), 'secreta');
    enviar();

    await waitFor(() => expect(ponerUsuario).toHaveBeenCalled());
    expect(navegar).toHaveBeenCalledWith('/confirm-email-change?token=abc', { replace: true });
    expect(sessionStorage.getItem('vuelta_tras_entrar')).toBeNull();
  });

  it.each([
    ['la misma cuenta vuelve a la página', 'u-1', '/competitions/7'],
    ['otra cuenta va al panel', 'u-2', '/dashboard'],
  ])('3b: la página guardada por la cuenta u-1: %s', async (_caso, quien, destino) => {
    sessionStorage.setItem('vuelta_tras_entrar', '/competitions/7');
    sessionStorage.setItem('vuelta_tras_entrar_cuenta', 'u-1');
    ejecutarLogin.mockResolvedValue({
      user: { id: quien, firstName: 'Agustin', emailVerified: true },
      csrfToken: 'tok',
      needsHandicap: false,
    });
    pintar();

    escribir(campoCorreo(), 'alguien@ejemplo.com');
    escribir(campoContrasena(), 'secreta');
    enviar();

    await waitFor(() => expect(ponerUsuario).toHaveBeenCalled());
    expect(navegar).toHaveBeenCalledWith(destino, { replace: true });
    expect(sessionStorage.getItem('vuelta_tras_entrar_cuenta')).toBeNull();
    vuelvenLosAvisosDeCierre();
  });

  it('deja el boton utilizable tras entrar, sin depender de que la pantalla se desmonte', async () => {
    // El camino de exito no puede dar por hecho que `navigate` desmonte el
    // formulario: en una pantalla que siguiera en pie, el boton se quedaria
    // desactivado girando para siempre
    ejecutarLogin.mockResolvedValue({
      user: { firstName: 'Agustin', emailVerified: true },
      csrfToken: 'tok',
      needsHandicap: false,
    });
    pintar();

    escribir(campoCorreo(), 'alguien@ejemplo.com');
    escribir(campoContrasena(), 'secreta');
    enviar();

    await waitFor(() => expect(navegar).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'login.signInButton' })).toBeEnabled()
    );
  });

  it('borra la contrasena cuando el acceso falla', async () => {
    ejecutarLogin.mockRejectedValue(new Error('Invalid credentials'));
    pintar();

    escribir(campoCorreo(), 'alguien@ejemplo.com');
    escribir(campoContrasena(), 'secreta');
    enviar();

    // OWASP A07: la contrasena no se queda en el campo tras un fallo
    await waitFor(() => expect(campoContrasena()).toHaveValue(''));
    expect(campoCorreo()).toHaveValue('alguien@ejemplo.com');
  });

  it('B1: con la red bloqueada (423) dice qué hacer, traducido (BE #732)', async () => {
    const bloqueo = new Error('Too many failed attempts from this network');
    bloqueo.code = 'LOGIN_LOCKED';
    ejecutarLogin.mockRejectedValue(bloqueo);
    pintar();

    escribir(campoCorreo(), 'alguien@ejemplo.com');
    escribir(campoContrasena(), 'secreta');
    enviar();

    await waitFor(() => expect(errorToast).toHaveBeenCalled());
    expect(errorToast).toHaveBeenCalledWith(
      'login.lockedFromThisNetwork',
      expect.objectContaining({ duration: 10000 })
    );
  });

  it('B2: una cuenta desactivada lo dice traducido, como Google (RyderCupAm #750)', async () => {
    const desactivada = Object.assign(
      new Error('This account has been deactivated. Contact an administrator.'),
      { status: 403, errorCode: 'ACCOUNT_DEACTIVATED' }
    );
    ejecutarLogin.mockRejectedValue(desactivada);
    pintar();

    escribir(campoCorreo(), 'alguien@ejemplo.com');
    escribir(campoContrasena(), 'secreta');
    enviar();

    await waitFor(() => expect(errorToast).toHaveBeenCalled());
    expect(errorToast).toHaveBeenCalledWith('google.accountDeactivated', expect.any(Object));
  });

  it('corta al sexto intento sin llamar al backend', async () => {
    window.localStorage.setItem(
      'ratelimit_login',
      JSON.stringify({ attempts: 5, resetTime: Date.now() + 300000 })
    );
    pintar();

    escribir(campoCorreo(), 'alguien@ejemplo.com');
    escribir(campoContrasena(), 'secreta');
    enviar();

    await waitFor(() => expect(errorToast).toHaveBeenCalled());
    expect(ejecutarLogin).not.toHaveBeenCalled();
  });

  it('S1: al entrar lanza el refresco del hándicap y NO lo espera (FE #677)', async () => {
    // El login ya no consulta la RFEG ni trae `needs_handicap` (RyderCupAM#340).
    // Una RFEG que no contesta no puede retener la entrada: la promesa que
    // devuelve el refresco no se resuelve nunca y aun así se navega. Un apunte
    // viejo de `needs_handicap` abriría el modal con información de otro día
    window.localStorage.setItem('needs_handicap', 'true');
    lanzarRefresco.mockReturnValue(new Promise(() => {}));
    ejecutarLogin.mockResolvedValue({
      user: { firstName: 'Agustin', emailVerified: true, handicap: 12.4 },
      csrfToken: 'tok',
    });
    pintar();

    escribir(campoCorreo(), 'alguien@ejemplo.com');
    escribir(campoContrasena(), 'secreta');
    enviar();

    await waitFor(() => expect(navegar).toHaveBeenCalled());
    expect(lanzarRefresco).toHaveBeenCalledWith({ handicapDeAntes: 12.4 });
    expect(window.localStorage.getItem('refrescar_handicap')).toBe('true');
    expect(window.localStorage.getItem('needs_handicap')).toBeNull();
  });

  // QA (FE #865-12): con el formulario rellenado por el gestor de contraseñas,
  // el primer «Iniciar Sesión» a veces no hacía nada. El gestor puede rellenar
  // sin que React se entere: se lee lo que hay en el formulario al enviar
  describe('relleno sin avisar a React', () => {
    // Pone el valor en el campo sin el evento que escucha React
    const rellenaSinAvisar = (campo, valor) =>
      Object.getOwnPropertyDescriptor(globalThis.HTMLInputElement.prototype, 'value').set.call(campo, valor);

    it('R1: entra con lo que hay en el formulario', async () => {
      ejecutarLogin.mockResolvedValue({ user: { firstName: 'Ana', emailVerified: true }, csrfToken: 't' });
      pintar();

      rellenaSinAvisar(campoCorreo(), 'ana@example.com');
      rellenaSinAvisar(campoContrasena(), 'secreta');
      enviar();

      await waitFor(() => expect(ejecutarLogin).toHaveBeenCalledWith('ana@example.com', 'secreta'));
      expect(screen.queryByText('validation.passwordRequired')).not.toBeInTheDocument();
    });

    it('R2: y valida eso mismo: un correo que no vale no se manda', async () => {
      pintar();

      rellenaSinAvisar(campoCorreo(), 'esto-no-es-un-correo');
      rellenaSinAvisar(campoContrasena(), 'secreta');
      enviar();

      await waitFor(() => expect(screen.getByText('validation.emailInvalid')).toBeInTheDocument());
      expect(ejecutarLogin).not.toHaveBeenCalled();
    });

    it('R3: al fallar se borra la contraseña también del campo', async () => {
      ejecutarLogin.mockRejectedValue(new Error('Credenciales incorrectas'));
      pintar();

      rellenaSinAvisar(campoCorreo(), 'ana@example.com');
      rellenaSinAvisar(campoContrasena(), 'secreta');
      enviar();

      await waitFor(() => expect(errorToast).toHaveBeenCalled());
      expect(campoContrasena()).toHaveValue('');
      expect(campoCorreo()).toHaveValue('ana@example.com');
    });
  });
});

/**
 * La contraseña mala, en el idioma de la app (antes salía «Incorrect email or
 * password» fijo, en inglés, desde el repositorio).
 *
 * | Caso                                     | Aviso                                |
 * |------------------------------------------|--------------------------------------|
 * | 401: correo o contraseña mal             | `login.error` (es y en), 5000 ms     |
 * | 423: bloqueada esta red                  | `login.lockedFromThisNetwork`, igual |
 * | sin conexión (su mensaje ya traducido)   | su mensaje, igual                    |
 */
describe('SignInForm · contraseña mala, traducida', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const fallaCon = async (error) => {
    ejecutarLogin.mockRejectedValue(error);
    pintar();
    escribir(campoCorreo(), 'alguien@ejemplo.com');
    escribir(campoContrasena(), 'secreta');
    enviar();
    await waitFor(() => expect(errorToast).toHaveBeenCalled());
  };

  it('401: dice «credenciales inválidas» con la clave traducida, no un texto en inglés', async () => {
    await fallaCon(Object.assign(new Error('Incorrect email or password'), { code: 'INVALID_CREDENTIALS' }));

    expect(errorToast).toHaveBeenCalledWith('login.error', { duration: 5000 });
  });

  it('la clave existe en español y en inglés, cada una en su idioma', async () => {
    const es = (await import('../../i18n/locales/es/auth.json')).default;
    const en = (await import('../../i18n/locales/en/auth.json')).default;

    expect(es.login.error).toBe('Credenciales inválidas. Por favor, inténtalo de nuevo.');
    expect(en.login.error).toBe('Invalid credentials. Please try again.');
  });

  it('sin conexión sigue con su propio mensaje', async () => {
    await fallaCon(Object.assign(new TypeError('Sin conexión'), { sinConexion: true }));

    expect(errorToast).toHaveBeenCalledWith('Sin conexión', { duration: 5000 });
  });
});
