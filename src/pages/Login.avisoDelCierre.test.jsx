import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StrictMode } from 'react';
import { render, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

/**
 * El aviso de un cierre forzado se enseña al llegar a /login (la página de
 * partida se recarga a los 500 ms y no daba tiempo a leerlo).
 *
 * | Caso                                       | Aviso                                    |
 * |--------------------------------------------|------------------------------------------|
 * | llega tras un dispositivo revocado         | 🔒 su texto, 8000 ms, una vez            |
 * | llega tras una sesión caducada             | ⏱️                                        |
 * | llega tras un refresco rechazado           | ℹ️                                        |
 * | se recarga /login después                  | nada                                     |
 * | llega sin cierre (o desde otra pestaña)    | nada                                     |
 * | con StrictMode (el efecto corre dos veces) | una vez                                  |
 */
const toast = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock('../utils/toast', () => ({ default: toast }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k, o) => `${o?.ns ?? ''}:${k}`, i18n: { language: 'es' } }),
}));
vi.mock('../hooks/useRedirectIfAuthenticated', () => ({ useRedirectIfAuthenticated: () => false }));
vi.mock('../components/auth/SignInForm', () => ({ default: () => <form /> }));

const Login = (await import('./Login')).default;
const { guardaElAvisoDelCierre } = await import('../utils/avisoTrasElCierre');

const abreElLogin = (envoltorio = ({ children }) => children) => {
  const Envoltorio = envoltorio;
  return render(
    <Envoltorio>
      <MemoryRouter initialEntries={['/login']}>
        <Login />
      </MemoryRouter>
    </Envoltorio>
  );
};

describe('Login · el aviso del cierre forzado', () => {
  beforeEach(() => {
    cleanup();
    globalThis.sessionStorage.clear();
    toast.error.mockClear();
  });

  it.each([
    ['revocation', 'auth:errors.deviceRevoked', '🔒'],
    ['expiration', 'auth:errors.sessionExpired', '⏱️'],
    ['ended', 'auth:errors.sessionEnded', 'ℹ️'],
  ])('tras %s, lo enseña al llegar, una vez', (motivo, texto, icono) => {
    guardaElAvisoDelCierre(motivo);

    abreElLogin();

    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith(texto, { duration: 8000, icon: icono, delCierre: true });
  });

  it('al recargar /login después, no se repite', () => {
    guardaElAvisoDelCierre('revocation');
    abreElLogin();
    cleanup();

    abreElLogin();

    expect(toast.error).toHaveBeenCalledTimes(1);
  });

  it('sin cierre (u otra pestaña, que tiene su sessionStorage), nada', () => {
    abreElLogin();

    expect(toast.error).not.toHaveBeenCalled();
  });

  it('con StrictMode, una sola vez', () => {
    guardaElAvisoDelCierre('revocation');

    abreElLogin(StrictMode);

    expect(toast.error).toHaveBeenCalledTimes(1);
  });
});
