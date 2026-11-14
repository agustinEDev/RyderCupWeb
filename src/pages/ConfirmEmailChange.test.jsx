import { describe, it, expect, vi, afterEach } from 'vitest';
import { StrictMode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router';

/**
 * La página del enlace que confirma un correo nuevo (RyderCupAm #749). Va dentro de
 * la sesión (ProtectedRoute): aquí ya hay sesión.
 *
 *   #   El backend responde              | Se ve
 *   ----|----------------------------------|---------------------------------------
 *   P1  200 con el usuario               | confirmEmailChange.done con el correo nuevo
 *   P2  400 EMAIL_CHANGE_EXPIRED         | confirmEmailChange.expired
 *   P3  400 EMAIL_CHANGE_INVALID         | confirmEmailChange.invalid
 *   P4  409 EMAIL_ALREADY_IN_USE         | confirmEmailChange.inUse
 *   P5  sin token en el enlace           | confirmEmailChange.invalid, sin llamar
 *   P6  confirmado                       | la sesión se recarga (el correo de la cabecera)
 *   P7  caducado u ocupado               | también se recarga: el backend lo anuló
 *   P8  StrictMode                       | se confirma UNA vez (el token se gasta)
 *   P9  el token                         | fuera de la barra de direcciones
 *   P10 un fallo de red o del servidor    | confirmEmailChange.failed y «Reintentar»,
 *                                        |   que vuelve a probar con el mismo token
 * Durante un cierre de sesión (tabla del 8 nov 2026, punto 3c):
 *   E1  falla porque la sesión se cierra  | sigue «Confirmando…», sin «Reintentar» ni
 *                                        |   recargar la sesión: la redirección llega ya
 *   E2  un 401 sin cierre en marcha       | confirmEmailChange.failed, como P10
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (clave, opciones) =>
      opciones?.email ? `${clave}:${opciones.email}` : clave,
    i18n: { language: 'es' },
  }),
}));
const refetch = vi.fn();
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ refetch }) }));
vi.mock('../components/layout/HeaderAuth', () => ({ default: () => null }));
vi.mock('../composition', () => ({
  confirmEmailChangeUseCase: { execute: vi.fn() },
}));
const cierre = vi.hoisted(() => ({ enMarcha: vi.fn(() => false) }));
vi.mock('../utils/cierreDeEstaCarga', () => ({
  seEstaCerrandoLaSesion: cierre.enMarcha,
}));
const secretos = vi.hoisted(() => ({ olvida: vi.fn() }));
vi.mock('../utils/stripSecretsFromAddressBar', () => ({
  stripSecretsFromAddressBar: vi.fn(),
  readStrippedSecret: () => null,
  forgetStrippedSecret: secretos.olvida,
}));

const { confirmEmailChangeUseCase } = await import('../composition');
const { default: ConfirmEmailChange } = await import('./ConfirmEmailChange');

// La barra que ve el router: `state.from` sale de aquí si la sesión cae sin recargar
const Barra = () => <output data-testid="barra">{useLocation().search}</output>;

const abrir = (query, { estricto = false } = {}) => {
  const arbol = (
    <MemoryRouter initialEntries={[`/confirm-email-change${query}`]}>
      <Routes>
        <Route
          path="/confirm-email-change"
          element={
            <>
              <ConfirmEmailChange />
              <Barra />
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  );
  return render(estricto ? <StrictMode>{arbol}</StrictMode> : arbol);
};

const rechazo = (status, errorCode) =>
  Object.assign(new Error('rechazado'), { status, errorCode });

describe('ConfirmEmailChange', () => {
  afterEach(() => vi.clearAllMocks());

  it('P1/P6: confirmado: el correo nuevo, y la sesión se recarga', async () => {
    confirmEmailChangeUseCase.execute.mockResolvedValue({
      email: 'ana@trabajo.com',
    });
    abrir('?token=tok-1');
    expect(
      await screen.findByText('confirmEmailChange.done:ana@trabajo.com'),
    ).toBeInTheDocument();
    expect(confirmEmailChangeUseCase.execute).toHaveBeenCalledWith('tok-1');
    expect(refetch).toHaveBeenCalled();
  });

  it.each([
    ['P2', 400, 'EMAIL_CHANGE_EXPIRED', 'confirmEmailChange.expired'],
    ['P3', 400, 'EMAIL_CHANGE_INVALID', 'confirmEmailChange.invalid'],
    ['P4', 409, 'EMAIL_ALREADY_IN_USE', 'confirmEmailChange.inUse'],
  ])('%s: %s %s', async (_n, status, codigo, texto) => {
    confirmEmailChangeUseCase.execute.mockRejectedValue(
      rechazo(status, codigo),
    );
    abrir('?token=tok-1');
    expect(await screen.findByText(texto)).toBeInTheDocument();
  });

  it.each([
    ['caducado', 400, 'EMAIL_CHANGE_EXPIRED'],
    ['ocupado', 409, 'EMAIL_ALREADY_IN_USE'],
  ])(
    'P7: %s también recarga la sesión (ya no queda pendiente)',
    async (_n, status, codigo) => {
      confirmEmailChangeUseCase.execute.mockRejectedValue(
        rechazo(status, codigo),
      );
      abrir('?token=tok-1');
      expect(await screen.findByRole('alert')).toBeInTheDocument();
      expect(refetch).toHaveBeenCalled();
    },
  );

  it('P8: en StrictMode se confirma una sola vez', async () => {
    confirmEmailChangeUseCase.execute.mockResolvedValue({
      email: 'ana@trabajo.com',
    });
    abrir('?token=tok-1', { estricto: true });
    await screen.findByText('confirmEmailChange.done:ana@trabajo.com');
    expect(confirmEmailChangeUseCase.execute).toHaveBeenCalledTimes(1);
  });

  it('P6b: si recargar la sesión falla, sigue diciendo que está hecho', async () => {
    confirmEmailChangeUseCase.execute.mockResolvedValue({
      email: 'ana@trabajo.com',
    });
    refetch.mockRejectedValueOnce(new Error('sin red'));
    abrir('?token=tok-1');
    expect(
      await screen.findByText('confirmEmailChange.done:ana@trabajo.com'),
    ).toBeInTheDocument();
  });

  it('P9: el token sale de la barra de direcciones', async () => {
    const quita = await import('../utils/stripSecretsFromAddressBar');
    confirmEmailChangeUseCase.execute.mockResolvedValue({
      email: 'ana@trabajo.com',
    });
    abrir('?token=tok-1');
    await screen.findByText('confirmEmailChange.done:ana@trabajo.com');
    expect(quita.stripSecretsFromAddressBar).toHaveBeenCalled();
  });

  it.each([
    [
      'sin red',
      Object.assign(new Error('Failed to fetch'), { status: undefined }),
    ],
    ['500', Object.assign(new Error('Error del servidor'), { status: 500 })],
  ])(
    'P10: %s: no dice que el enlace no vale, y deja reintentar',
    async (_n, fallo) => {
      confirmEmailChangeUseCase.execute.mockRejectedValueOnce(fallo);
      confirmEmailChangeUseCase.execute.mockResolvedValueOnce({
        email: 'ana@trabajo.com',
      });
      abrir('?token=tok-1');
      expect(
        await screen.findByText('confirmEmailChange.failed'),
      ).toBeInTheDocument();
      expect(screen.queryByText('confirmEmailChange.invalid')).toBeNull();

      fireEvent.click(
        screen.getByRole('button', { name: 'confirmEmailChange.retry' }),
      );

      expect(
        await screen.findByText('confirmEmailChange.done:ana@trabajo.com'),
      ).toBeInTheDocument();
      expect(confirmEmailChangeUseCase.execute).toHaveBeenCalledTimes(2);
    },
  );

  it('P5: sin token no se llama al backend', async () => {
    abrir('');
    expect(
      await screen.findByText('confirmEmailChange.invalid'),
    ).toBeInTheDocument();
    expect(confirmEmailChangeUseCase.execute).not.toHaveBeenCalled();
  });

  it.each([
    ['401', 401, undefined],
    ['403 de CSRF', 403, 'CSRF_VALIDATION_FAILED'],
  ])(
    'E1: con la sesión cerrándose (%s), sigue «Confirmando…»',
    async (_n, status, codigo) => {
      cierre.enMarcha.mockReturnValue(true);
      confirmEmailChangeUseCase.execute.mockRejectedValue(
        rechazo(status, codigo),
      );
      abrir('?token=tok-1');

      await vi.waitFor(() =>
        expect(confirmEmailChangeUseCase.execute).toHaveBeenCalled(),
      );
      await new Promise((r) => setTimeout(r, 0));

      expect(
        screen.getByText('confirmEmailChange.confirming'),
      ).toBeInTheDocument();
      expect(screen.queryByText('confirmEmailChange.failed')).toBeNull();
      expect(
        screen.queryByRole('button', { name: 'confirmEmailChange.retry' }),
      ).toBeNull();
      expect(refetch).not.toHaveBeenCalled();
      cierre.enMarcha.mockReturnValue(false);
    },
  );

  it('E2: un 401 sin cierre en marcha enseña el fallo con «Reintentar»', async () => {
    cierre.enMarcha.mockReturnValue(false);
    confirmEmailChangeUseCase.execute.mockRejectedValue(rechazo(401));
    abrir('?token=tok-1');

    expect(
      await screen.findByText('confirmEmailChange.failed'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'confirmEmailChange.retry' }),
    ).toBeInTheDocument();
  });

  // Usado el token, se olvida del historial (revisión, 8 nov 2026): si luego la sesión
  // se cierra, la página guardada no lo repite y no sale «enlace no válido» con el
  // correo ya cambiado. Un fallo de red lo conserva: «Reintentar» lo necesita
  it.each([
    [
      'confirmado',
      () =>
        confirmEmailChangeUseCase.execute.mockResolvedValue({ email: 'a@b.c' }),
      'confirmEmailChange.done:a@b.c',
    ],
    [
      'caducado',
      () =>
        confirmEmailChangeUseCase.execute.mockRejectedValue(
          rechazo(400, 'EMAIL_CHANGE_EXPIRED'),
        ),
      'confirmEmailChange.expired',
    ],
    [
      'no vale',
      () =>
        confirmEmailChangeUseCase.execute.mockRejectedValue(
          rechazo(400, 'EMAIL_CHANGE_INVALID'),
        ),
      'confirmEmailChange.invalid',
    ],
    [
      'ocupado',
      () =>
        confirmEmailChangeUseCase.execute.mockRejectedValue(
          rechazo(409, 'EMAIL_ALREADY_IN_USE'),
        ),
      'confirmEmailChange.inUse',
    ],
  ])(
    'con respuesta final (%s), olvida el token',
    async (_n, prepara, texto) => {
      cierre.enMarcha.mockReturnValue(false);
      prepara();
      abrir('?token=tok-1');

      expect(await screen.findByText(texto)).toBeInTheDocument();
      expect(secretos.olvida).toHaveBeenCalledWith('token');
    },
  );

  it('con un fallo de red, conserva el token para reintentar', async () => {
    cierre.enMarcha.mockReturnValue(false);
    confirmEmailChangeUseCase.execute.mockRejectedValue(
      new TypeError('Failed to fetch'),
    );
    abrir('?token=tok-1');

    expect(
      await screen.findByText('confirmEmailChange.failed'),
    ).toBeInTheDocument();
    expect(secretos.olvida).not.toHaveBeenCalled();
  });

  // Y la copia del router (revisiones, 8 nov 2026): `stripSecretsFromAddressBar` va por
  // `history.replaceState` y el router seguía con `?token=` gastado; si la sesión caía sin
  // recargar, el login volvía a él y decía «Este enlace no vale»
  it('con respuesta final, el router tampoco guarda el token', async () => {
    cierre.enMarcha.mockReturnValue(false);
    confirmEmailChangeUseCase.execute.mockResolvedValue({ email: 'a@b.c' });
    abrir('?token=tok-1');

    expect(
      await screen.findByText('confirmEmailChange.done:a@b.c'),
    ).toBeInTheDocument();
    await vi.waitFor(() =>
      expect(screen.getByTestId('barra').textContent).toBe(''),
    );
    expect(confirmEmailChangeUseCase.execute).toHaveBeenCalledTimes(1);
  });

  it('con un fallo de red, el router conserva el token para reintentar', async () => {
    cierre.enMarcha.mockReturnValue(false);
    confirmEmailChangeUseCase.execute.mockRejectedValue(
      new TypeError('Failed to fetch'),
    );
    abrir('?token=tok-1');

    expect(
      await screen.findByText('confirmEmailChange.failed'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('barra').textContent).toBe('?token=tok-1');
  });
});
