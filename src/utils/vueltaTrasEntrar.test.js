import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { guardaLaVueltaTrasEntrar, leeLaVueltaTrasEntrar, vueltaTrasEntrar } from './vueltaTrasEntrar';

/**
 * La vuelta tras una redirección dura a /login (probador de la release, 8 nov 2026).
 *
 *   V1 desde el enlace de confirmar, con su token: se guarda y se vuelve allí
 *   V2 con `state.from` (redirección suave), manda ese
 *   V3 se gasta: la segunda vez, al panel
 *   V4 desde /login o /register: no se guarda
 *   V5 lo escrito a mano que no es propio: no vale
 */
const en = (pathname, search = '') =>
  vi.stubGlobal('location', { ...globalThis.location, pathname, search, hash: '', origin: 'http://localhost:3000' });

describe('la vuelta tras una redirección dura', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it('V1: desde el enlace de confirmar, vuelve allí con su token', () => {
    en('/confirm-email-change', '?token=abc');
    guardaLaVueltaTrasEntrar();
    en('/login');

    expect(vueltaTrasEntrar(undefined)).toBe('/confirm-email-change?token=abc');
  });

  it('V2: con state.from, manda ese', () => {
    en('/competitions/7');
    guardaLaVueltaTrasEntrar();

    expect(vueltaTrasEntrar({ pathname: '/profile/edit' })).toBe('/profile/edit');
  });

  it('V3: se gasta', () => {
    en('/competitions/7');
    guardaLaVueltaTrasEntrar();

    vueltaTrasEntrar(undefined);

    expect(vueltaTrasEntrar(undefined)).toBe('/dashboard');
    expect(leeLaVueltaTrasEntrar()).toBeNull();
  });

  it.each([['/login'], ['/register']])('V4: desde %s no se guarda', (ruta) => {
    en(ruta);

    guardaLaVueltaTrasEntrar();

    expect(sessionStorage.getItem('vuelta_tras_entrar')).toBeNull();
  });

  it.each([['https://evil.example'], ['//evil.example'], ['/\\evil.example']])(
    'V5: %s escrito a mano no vale',
    (ruta) => {
      sessionStorage.setItem('vuelta_tras_entrar', ruta);

      expect(leeLaVueltaTrasEntrar()).toBeNull();
      expect(vueltaTrasEntrar(undefined)).toBe('/dashboard');
    }
  );
});
