import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Lo que sale hacia Sentry del usuario de la sesión. Sentry es un tercero y
 * para depurar basta con el id: el correo, el nombre y el hándicap salían en
 * cada evento y, por el `console.log`, también en las migas (25 oct 2026).
 *
 *   #   caso                                   | esperado
 *   ----|---------------------------------------|----------------------------
 *   U1  con sesión                             | setUser({ id }) y nada más
 *   U2  setUserContext(null)                   | setUser(null)
 *   U3  usuario sin id                         | setUser(null)
 *   U4  al fijarlo, la consola                 | ni correo ni nombre
 *   U5  clearUserContext                       | setUser(null)
 */
const sentry = vi.hoisted(() => ({ setUser: vi.fn() }));
vi.mock('@sentry/react', () => ({ setUser: sentry.setUser }));

const { setUserContext, clearUserContext } = await import('./sentryHelpers');

const USUARIO = {
  id: 'u-1',
  email: 'ana@example.com',
  first_name: 'Ana',
  last_name: 'Pérez',
  country_code: 'ES',
  email_verified: true,
  handicap: 12.4,
};

describe('sentryHelpers · el usuario que ve Sentry', () => {
  beforeEach(() => {
    sentry.setUser.mockClear();
  });

  it('U1: con sesión manda solo el id', () => {
    setUserContext(USUARIO);
    expect(sentry.setUser).toHaveBeenCalledTimes(1);
    expect(sentry.setUser).toHaveBeenCalledWith({ id: 'u-1' });
  });

  it('U2: sin usuario lo limpia', () => {
    setUserContext(null);
    expect(sentry.setUser).toHaveBeenCalledWith(null);
  });

  it('U3: un usuario sin id lo limpia, nunca { id: undefined }', () => {
    setUserContext({ ...USUARIO, id: undefined });
    expect(sentry.setUser).toHaveBeenCalledWith(null);
  });

  it('U4: la consola no saca el correo ni el nombre (Sentry la recoge como migas)', () => {
    const espias = ['log', 'info', 'warn', 'error', 'debug'].map((m) =>
      vi.spyOn(console, m).mockImplementation(() => {})
    );
    setUserContext(USUARIO);
    const escrito = JSON.stringify(espias.flatMap((e) => e.mock.calls));
    expect(escrito).not.toContain('ana@example.com');
    expect(escrito).not.toContain('Ana');
    espias.forEach((e) => e.mockRestore());
  });

  it('U5: clearUserContext lo limpia', () => {
    clearUserContext();
    expect(sentry.setUser).toHaveBeenCalledWith(null);
  });
});

describe('sentryHelpers · al limpiar el usuario', () => {
  it('U8: no escribe nada en la consola (Sentry la recoge como migas)', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    clearUserContext();
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
