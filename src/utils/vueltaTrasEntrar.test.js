import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  guardaLaVueltaTrasEntrar,
  leeLaVueltaTrasEntrar,
  olvidaLaVueltaTrasEntrar,
  anotaLaCuentaDeEstaPestana,
  olvidaLaCuentaDeEstaPestana,
  olvidaLaUltimaCuenta,
  ultimaCuentaDeEstaPestana,
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
    olvidaLaCuentaDeEstaPestana();
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

/**
 * La cuenta de ESTA pestaña, en memoria (revisión, 8 nov 2026): `localStorage` lo comparten
 * las pestañas. Con dos abiertas, el cierre de la primera borra el usuario y la segunda
 * guardaba su página sin cuenta, válida para cualquiera; y si en otra pestaña entró otra
 * cuenta, la etiquetaba con esa.
 */
describe('la cuenta de esta pestaña', () => {
  let almacen;
  beforeEach(() => {
    olvidaLaCuentaDeEstaPestana();
    almacen = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((k) => almacen[k] ?? null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });
  afterEach(() => {
    olvidaLaCuentaDeEstaPestana();
    vi.unstubAllGlobals();
  });

  it('anotada, gana aunque otra pestaña ya borrara el usuario guardado', () => {
    anotaLaCuentaDeEstaPestana('u-1');

    expect(quienEstaDentro()).toBe('u-1');
  });

  it('anotada, gana aunque en otra pestaña entrara otra cuenta', () => {
    anotaLaCuentaDeEstaPestana('u-1');
    almacen.user = JSON.stringify({ id: 'u-2' });

    expect(quienEstaDentro()).toBe('u-1');
  });

  it('anotada como nadie (salió en esta pestaña), no se sabe aunque haya usuario guardado', () => {
    anotaLaCuentaDeEstaPestana(null);
    almacen.user = JSON.stringify({ id: 'u-2' });

    expect(quienEstaDentro()).toBeNull();
  });

  it('un id numérico se anota como texto', () => {
    anotaLaCuentaDeEstaPestana(42);

    expect(quienEstaDentro()).toBe('42');
  });

  it('sin anotar, la del almacenamiento, como antes', () => {
    almacen.user = JSON.stringify({ id: 'u-3' });

    expect(quienEstaDentro()).toBe('u-3');
  });
});

/**
 * B (Agustín, 8 nov 2026): si la pestaña sabe que no hay nadie dentro (cerró la sesión),
 * un cierre forzado tardío no guarda la página: no hay a quién devolver, y sin cuenta
 * valdría para cualquiera.
 */
describe('sin nadie dentro de esta pestaña', () => {
  beforeEach(() => {
    sessionStorage.clear();
    olvidaLaCuentaDeEstaPestana();
  });
  afterEach(() => {
    olvidaLaCuentaDeEstaPestana();
    vi.unstubAllGlobals();
  });

  it('redirigeAlLogin no guarda la página y borra la que hubiera', () => {
    sessionStorage.setItem('vuelta_tras_entrar', '/competitions/1');
    anotaLaCuentaDeEstaPestana(null);
    en('/competitions/7');

    redirigeAlLogin();

    expect(sessionStorage.getItem('vuelta_tras_entrar')).toBeNull();
    expect(globalThis.location.href).toBe('/login');
  });

  it('con una cuenta anotada, sí la guarda', () => {
    anotaLaCuentaDeEstaPestana('u-1');
    en('/competitions/7');

    redirigeAlLogin({ cuenta: 'u-1' });

    expect(sessionStorage.getItem('vuelta_tras_entrar')).toBe('/competitions/7');
  });

  it('sin anotar nada (no se sabe), la guarda como hasta ahora', () => {
    en('/competitions/7');

    redirigeAlLogin();

    expect(sessionStorage.getItem('vuelta_tras_entrar')).toBe('/competitions/7');
  });
});

/**
 * T1-T2 (8 nov 2026): la página quitó el token de la barra y lo guardó en el historial;
 * si la sesión muere a mitad de confirmar el correo, la página guardada lo vuelve a
 * llevar. Sin él, al entrar salía «Este enlace no vale para tu cuenta».
 */
describe('el token que la página quitó de la barra', () => {
  beforeEach(() => {
    sessionStorage.clear();
    olvidaLaCuentaDeEstaPestana();
  });
  afterEach(() => {
    window.history.replaceState(null, '');
    vi.unstubAllGlobals();
  });

  it('T1: vuelve a la página guardada', () => {
    window.history.replaceState({ secretosDeLaUrl: { token: 'abc' } }, '');
    en('/confirm-email-change');

    guardaLaVueltaTrasEntrar({ cuenta: 'u-1' });

    expect(sessionStorage.getItem('vuelta_tras_entrar')).toBe('/confirm-email-change?token=abc');
  });

  it('T1: junto a lo que ya llevara la barra', () => {
    window.history.replaceState({ secretosDeLaUrl: { token: 'abc' } }, '');
    en('/confirm-email-change', '?origen=correo');

    guardaLaVueltaTrasEntrar();

    expect(sessionStorage.getItem('vuelta_tras_entrar')).toBe(
      '/confirm-email-change?origen=correo&token=abc'
    );
  });

  it('T2: si la barra ya lleva el token, no se duplica', () => {
    window.history.replaceState({ secretosDeLaUrl: { token: 'abc' } }, '');
    en('/confirm-email-change', '?token=abc');

    guardaLaVueltaTrasEntrar();

    expect(sessionStorage.getItem('vuelta_tras_entrar')).toBe('/confirm-email-change?token=abc');
  });

  it('T2: sin token guardado, la página como estaba', () => {
    window.history.replaceState({}, '');
    en('/competitions/7');

    guardaLaVueltaTrasEntrar();

    expect(sessionStorage.getItem('vuelta_tras_entrar')).toBe('/competitions/7');
  });

  it('T2: no reescribe el resto de la barra (%20, ?flag)', () => {
    window.history.replaceState({ secretosDeLaUrl: { token: 'abc' } }, '');
    en('/confirm-email-change', '?flag&x=a%20b');

    guardaLaVueltaTrasEntrar();

    expect(sessionStorage.getItem('vuelta_tras_entrar')).toBe(
      '/confirm-email-change?flag&x=a%20b&token=abc'
    );
  });

  it('T3: la página de confirmar sin token (ya usado) no se guarda, y borra la anterior', () => {
    sessionStorage.setItem('vuelta_tras_entrar', '/competitions/1');
    sessionStorage.setItem('vuelta_tras_entrar_cuenta', 'u-0');
    window.history.replaceState({ secretosDeLaUrl: {} }, '');
    en('/confirm-email-change');

    redirigeAlLogin({ cuenta: 'u-1' });

    expect(sessionStorage.getItem('vuelta_tras_entrar')).toBeNull();
    expect(sessionStorage.getItem('vuelta_tras_entrar_cuenta')).toBeNull();
  });

  it('T3: con el token en la barra, sí se guarda', () => {
    olvidaLaCuentaDeEstaPestana();
    window.history.replaceState(null, '');
    en('/confirm-email-change', '?token=abc');

    guardaLaVueltaTrasEntrar();

    expect(sessionStorage.getItem('vuelta_tras_entrar')).toBe('/confirm-email-change?token=abc');
  });

  it('T1: también con la barra final, como la reconoce el router', () => {
    window.history.replaceState({ secretosDeLaUrl: { token: 'abc' } }, '');
    en('/confirm-email-change/');

    guardaLaVueltaTrasEntrar();

    expect(sessionStorage.getItem('vuelta_tras_entrar')).toBe('/confirm-email-change/?token=abc');
  });

  it('T2: solo en la página de confirmar el correo', () => {
    window.history.replaceState({ secretosDeLaUrl: { token: 'abc' } }, '');
    en('/competitions/7');

    guardaLaVueltaTrasEntrar();

    expect(sessionStorage.getItem('vuelta_tras_entrar')).toBe('/competitions/7');
  });

  it('T2: solo el token: ni el code ni el state de Google', () => {
    window.history.replaceState({ secretosDeLaUrl: { code: 'c', state: 's' } }, '');
    en('/competitions/7');

    guardaLaVueltaTrasEntrar();

    expect(sessionStorage.getItem('vuelta_tras_entrar')).toBe('/competitions/7');
  });
});

/**
 * FE #1064 (tabla R1-R8, Agustín, 8 nov 2026): la página de la que venía (`state.from`) y la
 * vuelta de Google llevan la última cuenta que estuvo dentro de la pestaña; si entra otra,
 * a su panel.
 */
describe('la última cuenta de esta pestaña (R2, R3)', () => {
  let almacen;
  beforeEach(() => {
    olvidaLaCuentaDeEstaPestana();
    almacen = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((k) => almacen[k] ?? null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });
  afterEach(() => {
    olvidaLaCuentaDeEstaPestana();
    vi.unstubAllGlobals();
  });

  it('R2: no se borra cuando la sesión cae (la cuenta pasa a nadie)', () => {
    anotaLaCuentaDeEstaPestana('u-1');
    anotaLaCuentaDeEstaPestana(null);

    expect(ultimaCuentaDeEstaPestana()).toBe('u-1');
  });

  it('R2: la sustituye otra cuenta que entra', () => {
    anotaLaCuentaDeEstaPestana('u-1');
    anotaLaCuentaDeEstaPestana('u-2');

    expect(ultimaCuentaDeEstaPestana()).toBe('u-2');
  });

  it('R3: cerrar sesión a propósito la olvida', () => {
    anotaLaCuentaDeEstaPestana('u-1');

    olvidaLaUltimaCuenta();

    expect(ultimaCuentaDeEstaPestana()).toBeNull();
  });

  it('R2: sin nada anotado aún, la del usuario guardado', () => {
    almacen.user = JSON.stringify({ id: 'u-9' });

    expect(ultimaCuentaDeEstaPestana()).toBe('u-9');
  });

  it('R6: sin nada anotado ni guardado, ninguna', () => {
    expect(ultimaCuentaDeEstaPestana()).toBeNull();
  });
});

describe('la página de la que venía, con su cuenta (R4-R6)', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it('R4: entra la misma cuenta, vuelve a ella', () => {
    expect(vueltaTrasEntrar({ pathname: '/competitions/7', cuenta: 'u-1' }, { cuenta: 'u-1' })).toBe(
      '/competitions/7'
    );
  });

  it('R5: entra otra cuenta, a su panel', () => {
    expect(vueltaTrasEntrar({ pathname: '/competitions/7', cuenta: 'u-1' }, { cuenta: 'u-2' })).toBe(
      '/dashboard'
    );
  });

  it('R5: compara como texto', () => {
    expect(vueltaTrasEntrar({ pathname: '/competitions/7', cuenta: '42' }, { cuenta: 42 })).toBe(
      '/competitions/7'
    );
  });

  it('R5: con cuenta apuntada y quien entra sin cuenta conocida, al panel', () => {
    expect(vueltaTrasEntrar({ pathname: '/competitions/7', cuenta: 'u-1' })).toBe('/dashboard');
  });

  it('R6: sin cuenta apuntada, la página para cualquiera, como hasta ahora', () => {
    expect(vueltaTrasEntrar({ pathname: '/competitions/7' }, { cuenta: 'u-2' })).toBe('/competitions/7');
  });

  it('R5: la de otra cuenta tampoco cae en la guardada de esa otra cuenta', () => {
    en('/competitions/9');
    guardaLaVueltaTrasEntrar({ cuenta: 'u-1' });

    expect(vueltaTrasEntrar({ pathname: '/competitions/7', cuenta: 'u-1' }, { cuenta: 'u-2' })).toBe(
      '/dashboard'
    );
  });
});

