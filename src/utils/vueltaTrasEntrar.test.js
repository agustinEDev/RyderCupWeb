import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  gastaLaVueltaTrasEntrar,
  guardaLaVueltaTrasEntrar,
  leeLaVueltaTrasEntrar,
  olvidaLaVueltaTrasEntrar,
  vueltaTrasEntrar,
} from './vueltaTrasEntrar';
import { noAvisesDeCierres } from './avisoDeCierreForzado';

/**
 * La vuelta tras una redirección dura a /login (probador de la release, 8 nov 2026).
 *
 *   V1 desde el enlace de confirmar, con su token: se guarda y se vuelve allí
 *   V2 con `state.from` (redirección suave), manda ese
 *   V3 se gasta: la segunda vez, al panel
 *   V4 desde /login o /register: no se guarda
 *   V5 lo escrito a mano que no es propio: no vale
 * Tras las revisiones:
 *   V6 desde una página pública (portada, /start, verificar, restablecer): no se guarda
 *   V7 mientras se cierra la sesión a petición: no se guarda
 *   V8 Google la gasta al leerla; cerrar sesión la olvida
 *   V2 también la gasta cuando gana state.from
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
    expect(leeLaVueltaTrasEntrar()).toBeNull();
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

  it.each([['/'], ['/start'], ['/verify-email'], ['/reset-password/tok']])('V6: desde %s no se guarda', (ruta) => {
    en(ruta, ruta === '/verify-email' ? '?token=abc' : '');

    guardaLaVueltaTrasEntrar();

    expect(sessionStorage.getItem('vuelta_tras_entrar')).toBeNull();
  });

  it('V8: Google la gasta al leerla, y cerrar sesión la olvida', () => {
    en('/confirm-email-change', '?token=abc');
    guardaLaVueltaTrasEntrar();

    expect(gastaLaVueltaTrasEntrar()).toEqual({ pathname: '/confirm-email-change', search: '?token=abc', hash: '' });
    expect(leeLaVueltaTrasEntrar()).toBeNull();

    en('/competitions/7');
    guardaLaVueltaTrasEntrar();
    olvidaLaVueltaTrasEntrar();
    expect(leeLaVueltaTrasEntrar()).toBeNull();
  });
  // El último: el silencio de cerrar sesión dura 30 s en memoria del módulo
  it('V7: mientras se cierra la sesión a petición, no se guarda', () => {
    en('/competitions/7');
    noAvisesDeCierres();

    guardaLaVueltaTrasEntrar();

    expect(sessionStorage.getItem('vuelta_tras_entrar')).toBeNull();
  });
});

