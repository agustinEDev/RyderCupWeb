import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  guardaLaVueltaTrasEntrar,
  leeLaVueltaTrasEntrar,
  olvidaLaVueltaTrasEntrar,
  quienEstaDentro,
  redirigeAlLogin,
  vueltaTrasEntrar,
} from './vueltaTrasEntrar';
import { noAvisesDeCierres, seCierraLaSesionAPeticion, vuelvenLosAvisosDeCierre } from './avisoDeCierreForzado';

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
 *   V11 calcular a dónde volver no toca el silencio: lo acaba quien entra (C5, /code-review 8 nov)
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

  it('V11: calcular a dónde volver no toca el silencio: lo acaba quien entra de verdad', () => {
    en('/competitions/7');
    noAvisesDeCierres();

    vueltaTrasEntrar(undefined);

    expect(seCierraLaSesionAPeticion()).toBe(true);
    vuelvenLosAvisosDeCierre();
  });
});

/**
 * La página guardada va con la cuenta que estaba dentro (tabla aprobada por Agustín el
 * 8 nov 2026, punto 3b): en un móvil compartido, quien entra con OTRA cuenta en la misma
 * pestaña no aterriza en la página de la anterior.
 *
 *   VC1 se guarda con el id de quien estaba dentro
 *   VC2 entra la misma cuenta: vuelve a la página
 *   VC3 entra otra cuenta: al panel, y la guardada se borra
 *   VC4 guardada sin id (de antes de este cambio, o sin saber quién estaba): vale para
 *       cualquiera, como hasta ahora
 *   VC5 guardada con id y quien entra sin id conocido: al panel (no se puede decir que
 *       sea la misma)
 *   VC6 guardar sustituye también el id; olvidar se lleva los dos
 *   VC7 state.from gana siempre: el id solo frena la guardada
 */
describe('la página guardada, de la cuenta que estaba dentro', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it('VC1: redirigeAlLogin guarda la página con el id de la cuenta', () => {
    en('/competitions/7');

    redirigeAlLogin({ cuenta: 'u-1' });

    expect(sessionStorage.getItem('vuelta_tras_entrar')).toBe('/competitions/7');
    expect(sessionStorage.getItem('vuelta_tras_entrar_cuenta')).toBe('u-1');
  });

  it('VC2: entra la misma cuenta y vuelve a la página', () => {
    en('/competitions/7');
    guardaLaVueltaTrasEntrar({ cuenta: 'u-1' });
    en('/login');

    expect(vueltaTrasEntrar(undefined, { cuenta: 'u-1' })).toBe('/competitions/7');
  });

  it('VC3: entra otra cuenta, va al panel y la guardada se borra', () => {
    en('/competitions/7');
    guardaLaVueltaTrasEntrar({ cuenta: 'u-1' });
    en('/login');

    expect(vueltaTrasEntrar(undefined, { cuenta: 'u-2' })).toBe('/dashboard');
    expect(sessionStorage.getItem('vuelta_tras_entrar')).toBeNull();
    expect(sessionStorage.getItem('vuelta_tras_entrar_cuenta')).toBeNull();
    expect(vueltaTrasEntrar(undefined, { cuenta: 'u-1' })).toBe('/dashboard');
  });

  it('VC3: compara como texto (un id numérico guardado vuelve como texto)', () => {
    en('/competitions/7');
    guardaLaVueltaTrasEntrar({ cuenta: 42 });
    en('/login');

    expect(vueltaTrasEntrar(undefined, { cuenta: 42 })).toBe('/competitions/7');
  });

  it('VC4: una guardada sin id vale para cualquier cuenta', () => {
    sessionStorage.setItem('vuelta_tras_entrar', '/competitions/7');
    en('/login');

    expect(vueltaTrasEntrar(undefined, { cuenta: 'u-2' })).toBe('/competitions/7');
  });

  it('VC4: guardar sin saber quién estaba no deja id', () => {
    en('/competitions/7');

    redirigeAlLogin();

    expect(sessionStorage.getItem('vuelta_tras_entrar')).toBe('/competitions/7');
    expect(sessionStorage.getItem('vuelta_tras_entrar_cuenta')).toBeNull();
  });

  it('VC5: guardada con id y quien entra sin id conocido, al panel', () => {
    en('/competitions/7');
    guardaLaVueltaTrasEntrar({ cuenta: 'u-1' });
    en('/login');

    expect(vueltaTrasEntrar(undefined)).toBe('/dashboard');
  });

  it('VC6: guardar sin id tras una con id no deja el id de antes', () => {
    en('/competitions/7');
    guardaLaVueltaTrasEntrar({ cuenta: 'u-1' });
    en('/competitions/8');
    guardaLaVueltaTrasEntrar();
    en('/login');

    expect(sessionStorage.getItem('vuelta_tras_entrar_cuenta')).toBeNull();
    expect(vueltaTrasEntrar(undefined, { cuenta: 'u-2' })).toBe('/competitions/8');
  });

  it('VC6: guardar desde una página que no vale se lleva también el id', () => {
    en('/competitions/7');
    guardaLaVueltaTrasEntrar({ cuenta: 'u-1' });
    en('/login');

    guardaLaVueltaTrasEntrar({ cuenta: 'u-1' });

    expect(sessionStorage.getItem('vuelta_tras_entrar')).toBeNull();
    expect(sessionStorage.getItem('vuelta_tras_entrar_cuenta')).toBeNull();
  });

  it('VC6: olvidar se lleva la página y el id', () => {
    en('/competitions/7');
    guardaLaVueltaTrasEntrar({ cuenta: 'u-1' });

    olvidaLaVueltaTrasEntrar();

    expect(sessionStorage.getItem('vuelta_tras_entrar')).toBeNull();
    expect(sessionStorage.getItem('vuelta_tras_entrar_cuenta')).toBeNull();
  });

  it('VC6: salir sin guardar (revocar el propio) se lleva también el id', () => {
    en('/competitions/7');
    guardaLaVueltaTrasEntrar({ cuenta: 'u-1' });

    redirigeAlLogin({ guardar: false, cuenta: 'u-1' });

    expect(sessionStorage.getItem('vuelta_tras_entrar_cuenta')).toBeNull();
  });

  it('VC7: state.from gana aunque la guardada sea de otra cuenta, y la gasta', () => {
    en('/competitions/7');
    guardaLaVueltaTrasEntrar({ cuenta: 'u-1' });

    expect(vueltaTrasEntrar({ pathname: '/profile/edit' }, { cuenta: 'u-2' })).toBe('/profile/edit');
    expect(sessionStorage.getItem('vuelta_tras_entrar_cuenta')).toBeNull();
  });
});

describe('quienEstaDentro', () => {
  let almacen;
  beforeEach(() => {
    almacen = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((k) => almacen[k] ?? null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('lee el id del usuario guardado', () => {
    almacen.user = JSON.stringify({ id: 'u-9', firstName: 'Ana' });
    expect(quienEstaDentro()).toBe('u-9');
  });

  it.each([
    ['sin usuario', undefined],
    ['un usuario sin id', JSON.stringify({ firstName: 'Ana' })],
    ['un JSON roto', '{no'],
    ['un null guardado', 'null'],
  ])('con %s, no se sabe (null)', (_caso, valor) => {
    if (valor !== undefined) almacen.user = valor;
    expect(quienEstaDentro()).toBeNull();
  });

  it('sin almacenamiento, no se sabe (null)', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('SecurityError');
      },
    });
    expect(quienEstaDentro()).toBeNull();
  });
});
