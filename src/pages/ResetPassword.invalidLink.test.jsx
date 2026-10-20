import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router';

/**
 * FE #775: un enlace de restablecimiento caducado o inválido enseñaba el
 * formulario de contraseña nueva. La API responde a ese token con 200 y
 * { valid: false }, y el caso de uso daba por bueno cualquier 200. El usuario
 * solo se enteraba al enviar la contraseña.
 *
 * FE #785: y al revés, sin cobertura, con un 429 o con un 5xx al comprobarlo
 * decía «enlace no válido, pide otro», y el enlace estaba bien. Lo que no es
 * una respuesta de la API no dice nada del enlace: se ofrece reintentar.
 *
 * Se monta la página con el caso de uso REAL y solo el repositorio simulado,
 * que contesta como la API: así se prueba la cadena entera.
 *
 *   #   la API contesta               | la página
 *   ----|------------------------------|----------------------------------------
 *   L1  200 { valid: false, message }  | «enlace no válido», su texto traducido y pedir otro
 *   L2  200 { valid: true }            | el formulario (lo que ya hacía)
 *   R1  200 { valid: false }           | como L1, y sin «Reintentar»
 *   R2  sin conexión (TypeError)       | «no se ha podido comprobar: sin conexión» + Reintentar; no pide otro
 *   R3  429                            | «demasiados intentos, espera un poco» + Reintentar; no pide otro
 *   R4  500                            | «no se ha podido comprobar» + Reintentar
 *   R4b un error sin status            | igual que R4
 *   R6  404 / 422 / 400 (otro 4xx)     | «enlace no válido» y pedir otro: reintentar no lo arregla
 *   R6d 408                            | como R4: se agotó el tiempo, el enlace puede estar bien
 *   R5  Reintentar y ahora valid:true  | el MISMO token (del historial), «validando» y el formulario
 *   R5b Reintentar y ahora un 429      | el aviso del 429
 *   R5c Reintentar y ahora valid:false | «enlace no válido» y pedir otro
 */
const repositorio = vi.hoisted(() => ({ validateResetToken: vi.fn(), resetPassword: vi.fn() }));

// `t` estable, como la de verdad: una nueva en cada render volvía a lanzar la
// validación del token (depende de `t`) y descuadraba las llamadas
const { tEstable } = vi.hoisted(() => ({ tEstable: (clave) => clave }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: tEstable, i18n: { language: 'es' } }),
}));
vi.mock('../utils/toast', () => ({ default: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));
vi.mock('../composition', async () => {
  const { default: ValidateResetTokenUseCase } = await import(
    '../application/use_cases/user/ValidateResetTokenUseCase'
  );
  return {
    validateResetTokenUseCase: new ValidateResetTokenUseCase({ authRepository: repositorio }),
    resetPasswordUseCase: { execute: vi.fn() },
  };
});

const { default: ResetPassword } = await import('./ResetPassword');

const abrir = (token) => {
  window.history.replaceState(null, '', `/reset-password/${token}`);
  render(
    <BrowserRouter>
      <Routes>
        <Route path="/reset-password/:token" element={<ResetPassword />} />
      </Routes>
    </BrowserRouter>
  );
};

// La recarga: la barra ya limpia y el token solo en el estado del historial
const abrirSoloConElHistorial = (token) => {
  window.history.replaceState({ secretosDeLaUrl: { token } }, '', '/reset-password');
  render(
    <BrowserRouter>
      <Routes>
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    </BrowserRouter>
  );
};

const sinConexion = () => new TypeError('common:sinConexion.mensaje');
const conEstado = (status, mensaje) => Object.assign(new Error(mensaje), { status });

const noDiceQueElEnlaceEsteMal = () => {
  expect(screen.queryByText('resetPassword.invalidTokenTitle')).toBeNull();
  expect(screen.queryByText('resetPassword.tokenInvalidMessage')).toBeNull();
  expect(screen.queryByText('resetPassword.requestNewLink')).toBeNull();
  expect(document.querySelector('input[type="password"]')).toBeNull();
};

describe('ResetPassword · enlace caducado o inválido (FE #775)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, '', '/');
  });

  it('L1: valid:false enseña el aviso y no el formulario', async () => {
    repositorio.validateResetToken.mockResolvedValue({
      valid: false,
      message: 'Token de reseteo inválido o expirado. Solicita un nuevo enlace.',
    });
    abrir('a'.repeat(48));

    expect(await screen.findByText('resetPassword.invalidTokenTitle')).toBeInTheDocument();
    // El texto propio y traducido, no el del backend (que viene en español)
    expect(screen.getByText('resetPassword.tokenInvalidMessage')).toBeInTheDocument();
    expect(
      screen.queryByText('Token de reseteo inválido o expirado. Solicita un nuevo enlace.')
    ).toBeNull();
    expect(screen.getByText('resetPassword.requestNewLink')).toBeInTheDocument();
    expect(document.querySelector('input[type="password"]')).toBeNull();
  });

  it('L2: valid:true enseña el formulario', async () => {
    repositorio.validateResetToken.mockResolvedValue({ valid: true, message: 'ok' });
    abrir('b'.repeat(48));

    await vi.waitFor(() => expect(document.querySelector('input[type="password"]')).not.toBeNull());
    expect(screen.queryByText('resetPassword.invalidTokenTitle')).toBeNull();
  });
});

describe('ResetPassword · no se ha podido comprobar el enlace (FE #785)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, '', '/');
  });

  it('R1: valid:false sigue siendo «enlace no válido», sin Reintentar', async () => {
    repositorio.validateResetToken.mockResolvedValue({ valid: false });
    abrir('a'.repeat(48));

    expect(await screen.findByText('resetPassword.invalidTokenTitle')).toBeInTheDocument();
    expect(screen.getByText('resetPassword.requestNewLink')).toBeInTheDocument();
    expect(screen.queryByText('resetPassword.retry')).toBeNull();
    expect(screen.queryByText('resetPassword.checkFailedTitle')).toBeNull();
  });

  it('R2: sin conexión dice que no se ha podido comprobar y ofrece reintentar', async () => {
    repositorio.validateResetToken.mockRejectedValue(sinConexion());
    abrir('a'.repeat(48));

    expect(await screen.findByText('resetPassword.checkFailedTitle')).toBeInTheDocument();
    expect(screen.getByText('resetPassword.checkNoConnection')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'resetPassword.retry' })).toBeInTheDocument();
    expect(screen.queryByText('resetPassword.checkServerError')).toBeNull();
    noDiceQueElEnlaceEsteMal();
  });

  it('R3: un 429 pide esperar un poco y reintentar, sin pedir otro correo', async () => {
    repositorio.validateResetToken.mockRejectedValue(conEstado(429, 'common:demasiadasPeticiones'));
    abrir('a'.repeat(48));

    expect(await screen.findByText('resetPassword.checkTooManyRequests')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'resetPassword.retry' })).toBeInTheDocument();
    // El aviso de los 60 minutos es el del envío, no el de la comprobación
    expect(screen.queryByText('resetPassword.rateLimitError')).toBeNull();
    expect(screen.queryByText('resetPassword.checkServerError')).toBeNull();
    noDiceQueElEnlaceEsteMal();
  });

  it('R4: un 5xx dice que no se ha podido comprobar y ofrece reintentar', async () => {
    repositorio.validateResetToken.mockRejectedValue(conEstado(500, 'Internal Server Error'));
    abrir('a'.repeat(48));

    expect(await screen.findByText('resetPassword.checkServerError')).toBeInTheDocument();
    expect(screen.getByText('resetPassword.checkFailedTitle')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'resetPassword.retry' })).toBeInTheDocument();
    expect(screen.queryByText('Internal Server Error')).toBeNull();
    noDiceQueElEnlaceEsteMal();
  });

  it('R4b: un error sin status es un fallo al comprobar, no un enlace malo', async () => {
    repositorio.validateResetToken.mockRejectedValue(new Error('algo'));
    abrir('a'.repeat(48));

    expect(await screen.findByText('resetPassword.checkServerError')).toBeInTheDocument();
    expect(screen.queryByText('resetPassword.checkNoConnection')).toBeNull();
    noDiceQueElEnlaceEsteMal();
  });

  // Revision del 20 oct: un 4xx que no es 429 no se arregla reintentando, y
  // ofrecerlo dejaba al usuario en un bucle sin salida
  it.each([
    [404, 'Not Found'],
    [422, 'Unprocessable Entity'],
    [400, 'Bad Request'],
  ])('R6: un %i es «enlace no válido» y pide otro, sin Reintentar', async (status, mensaje) => {
    repositorio.validateResetToken.mockRejectedValue(conEstado(status, mensaje));
    abrir('a'.repeat(48));

    expect(await screen.findByText('resetPassword.invalidTokenTitle')).toBeInTheDocument();
    expect(screen.getByText('resetPassword.tokenInvalidMessage')).toBeInTheDocument();
    expect(screen.getByText('resetPassword.requestNewLink')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'resetPassword.retry' })).toBeNull();
    expect(screen.queryByText('resetPassword.checkFailedTitle')).toBeNull();
    expect(screen.queryByText(mensaje)).toBeNull();
  });

  it('R6c: sin conexión manda aunque el error traiga un 4xx', async () => {
    // Lo que contesta la caché o el service worker sin red no es la API
    const onLine = vi.spyOn(globalThis.navigator, 'onLine', 'get').mockReturnValue(false);
    try {
      repositorio.validateResetToken.mockRejectedValue(conEstado(404, 'Not Found'));
      abrir('a'.repeat(48));

      expect(await screen.findByText('resetPassword.checkNoConnection')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'resetPassword.retry' })).toBeInTheDocument();
      noDiceQueElEnlaceEsteMal();
    } finally {
      onLine.mockRestore();
    }
  });

  it('R6b: un 503 sigue siendo «no se ha podido comprobar»', async () => {
    repositorio.validateResetToken.mockRejectedValue(conEstado(503, 'Service Unavailable'));
    abrir('a'.repeat(48));

    expect(await screen.findByText('resetPassword.checkServerError')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'resetPassword.retry' })).toBeInTheDocument();
    noDiceQueElEnlaceEsteMal();
  });

  // Revisión del 21 oct: un 408 es que no dio tiempo a contestar, no un enlace malo
  it('R6d: un 408 es «no se ha podido comprobar» y ofrece reintentar', async () => {
    repositorio.validateResetToken.mockRejectedValue(conEstado(408, 'Request Timeout'));
    abrir('a'.repeat(48));

    expect(await screen.findByText('resetPassword.checkServerError')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'resetPassword.retry' })).toBeInTheDocument();
    expect(screen.queryByText('Request Timeout')).toBeNull();
    noDiceQueElEnlaceEsteMal();
  });

  it('R5: Reintentar comprueba el mismo token del historial y, si vale, enseña el formulario', async () => {
    const token = 'd'.repeat(48);
    let responder;
    repositorio.validateResetToken
      .mockRejectedValueOnce(sinConexion())
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            responder = resolve;
          })
      );
    abrirSoloConElHistorial(token);

    fireEvent.click(await screen.findByRole('button', { name: 'resetPassword.retry' }));

    // Mientras comprueba, la espera de siempre
    expect(await screen.findByText('resetPassword.validatingToken')).toBeInTheDocument();
    await vi.waitFor(() => expect(repositorio.validateResetToken).toHaveBeenCalledTimes(2));
    expect(repositorio.validateResetToken).toHaveBeenNthCalledWith(1, token);
    expect(repositorio.validateResetToken).toHaveBeenNthCalledWith(2, token);

    responder({ valid: true, message: 'ok' });
    await vi.waitFor(() => expect(document.querySelector('input[type="password"]')).not.toBeNull());
    expect(screen.queryByText('resetPassword.checkFailedTitle')).toBeNull();
  });

  it('R5b: si al reintentar llega un 429, enseña el aviso del 429', async () => {
    repositorio.validateResetToken
      .mockRejectedValueOnce(conEstado(500, 'Internal Server Error'))
      .mockRejectedValueOnce(conEstado(429, 'common:demasiadasPeticiones'));
    abrir('e'.repeat(48));

    fireEvent.click(await screen.findByRole('button', { name: 'resetPassword.retry' }));

    expect(await screen.findByText('resetPassword.checkTooManyRequests')).toBeInTheDocument();
    expect(screen.queryByText('resetPassword.checkServerError')).toBeNull();
    expect(repositorio.validateResetToken).toHaveBeenCalledTimes(2);
    expect(repositorio.validateResetToken).toHaveBeenLastCalledWith('e'.repeat(48));
  });

  it('R5c: si al reintentar la API dice valid:false, es «enlace no válido»', async () => {
    repositorio.validateResetToken
      .mockRejectedValueOnce(sinConexion())
      .mockResolvedValueOnce({ valid: false });
    abrir('f'.repeat(48));

    fireEvent.click(await screen.findByRole('button', { name: 'resetPassword.retry' }));

    expect(await screen.findByText('resetPassword.invalidTokenTitle')).toBeInTheDocument();
    expect(screen.getByText('resetPassword.requestNewLink')).toBeInTheDocument();
    expect(screen.queryByText('resetPassword.checkFailedTitle')).toBeNull();
  });
});
