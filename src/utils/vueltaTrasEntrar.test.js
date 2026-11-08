import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  guardaLaVueltaTrasEntrar,
  leeLaVueltaTrasEntrar,
  olvidaLaVueltaTrasEntrar,
  redirigeAlLogin,
  vueltaTrasEntrar,
} from './vueltaTrasEntrar';
import { noAvisesDeCierres, seCierraLaSesionAPeticion } from './avisoDeCierreForzado';

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
 *   V8 cerrar sesión la olvida
 *   V9 guardar sustituye: desde una página que no vale, la anterior se borra
 *   V10 redirigeAlLogin guarda y se va; sin guardar, la olvida y se va
 *   V2 también la gasta cuando gana state.from
 *   V11 entrar acaba el silencio de cerrar sesión: el siguiente cierre forzado guarda (probador, 8 nov)
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

  it('V8: cerrar sesión la olvida', () => {
    en('/competitions/7');
    guardaLaVueltaTrasEntrar();

    olvidaLaVueltaTrasEntrar();

    expect(leeLaVueltaTrasEntrar()).toBeNull();
  });

  it('V9: guardar sustituye: desde una página que no vale, la anterior se borra', () => {
    en('/competitions/9');
    guardaLaVueltaTrasEntrar();
    en('/');

    guardaLaVueltaTrasEntrar();

    expect(leeLaVueltaTrasEntrar()).toBeNull();
  });

  it.each([
    ['guardando', true, '/competitions/7'],
    ['sin guardar', false, null],
  ])('V10: redirigeAlLogin %s', (_caso, guardar, esperado) => {
    sessionStorage.setItem('vuelta_tras_entrar', '/competitions/1');
    en('/competitions/7');

    redirigeAlLogin({ guardar });

    expect(sessionStorage.getItem('vuelta_tras_entrar')).toBe(esperado);
    expect(globalThis.location.href).toBe('/login');
  });

  // El último: el silencio de cerrar sesión dura 30 s en memoria del módulo
  it('V7: mientras se cierra la sesión a petición, no se guarda', () => {
    en('/competitions/7');
    noAvisesDeCierres();

    guardaLaVueltaTrasEntrar();

    expect(sessionStorage.getItem('vuelta_tras_entrar')).toBeNull();
  });

  it('V11: entrar acaba el silencio de cerrar sesión: el siguiente cierre forzado guarda', () => {
    en('/competitions/7');
    noAvisesDeCierres();

    vueltaTrasEntrar(undefined);
    guardaLaVueltaTrasEntrar();

    expect(seCierraLaSesionAPeticion()).toBe(false);
    expect(sessionStorage.getItem('vuelta_tras_entrar')).toBe('/competitions/7');
  });
});

