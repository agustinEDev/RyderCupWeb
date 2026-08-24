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
});
