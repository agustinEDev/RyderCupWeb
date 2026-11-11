import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  guardaLaVueltaTrasEntrar,
  leeLaVueltaTrasEntrar,
  olvidaLaVueltaTrasEntrar,
  anotaLaCuentaDeEstaPestana,
  olvidaLaCuentaDeEstaPestana,
  estadoParaElLogin,
  olvidaLaUltimaCuenta,
  ultimaCuentaDeEstaPestana,
  redirigeAlLogin,
  vueltaTrasEntrar,
} from './vueltaTrasEntrar';
import { noAvisesDeCierres, seCierraLaSesionAPeticion, vuelvenLosAvisosDeCierre } from './avisoDeCierreForzado';
import { captureError } from './sentryHelpers';
import { guardaLaAnotacionEnCurso } from './anotacionEnCurso';
import { olvidaElAvisoDeLaVuelta } from './avisoDeVueltaALaAnotacion';

vi.mock('./sentryHelpers', async (importOriginal) => ({ ...(await importOriginal()), captureError: vi.fn() }));

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

describe('ultimaCuentaDeEstaPestana · el usuario guardado', () => {
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

  it('sin anotar nada, lee el id del usuario guardado', () => {
    almacen.user = JSON.stringify({ id: 'u-9', firstName: 'Ana' });
    expect(ultimaCuentaDeEstaPestana()).toBe('u-9');
  });

  it.each([
    ['sin usuario', undefined],
    ['un usuario sin id', JSON.stringify({ firstName: 'Ana' })],
    ['un JSON roto', '{no'],
    ['un null guardado', 'null'],
  ])('con %s, ninguna (null)', (_caso, valor) => {
    if (valor !== undefined) almacen.user = valor;
    expect(ultimaCuentaDeEstaPestana()).toBeNull();
  });

  it('sin almacenamiento, ninguna (null)', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('SecurityError');
      },
    });
    expect(ultimaCuentaDeEstaPestana()).toBeNull();
  });

  it('anotada, gana aunque otra pestaña ya borrara el usuario guardado', () => {
    anotaLaCuentaDeEstaPestana('u-1');
    expect(ultimaCuentaDeEstaPestana()).toBe('u-1');
  });

  it('anotada, gana aunque en otra pestaña entrara otra cuenta', () => {
    anotaLaCuentaDeEstaPestana('u-1');
    almacen.user = JSON.stringify({ id: 'u-2' });
    expect(ultimaCuentaDeEstaPestana()).toBe('u-1');
  });

  it('un id numérico se anota como texto', () => {
    anotaLaCuentaDeEstaPestana(42);
    expect(ultimaCuentaDeEstaPestana()).toBe('42');
  });
});

/**
 * Sin la regla B (Agustín, 8 nov 2026, tras la batería de FE #1064): «si la pestaña sabe
 * que no hay nadie dentro, no se guarda» no distinguía «salió en esta pestaña» de «nunca
 * hubo nadie», y un enlace abierto sin sesión (el de confirmar el correo, en otro
 * navegador o tras cerrar sesión) se perdía al entrar. Ahora el cierre guarda la página
 * con la ÚLTIMA cuenta de la pestaña: si la hubo, solo para ella; si no, para cualquiera.
 */
describe('el cierre guarda la página con la última cuenta de la pestaña', () => {
  beforeEach(() => {
    sessionStorage.clear();
    olvidaLaCuentaDeEstaPestana();
  });
  afterEach(() => {
    olvidaLaCuentaDeEstaPestana();
    vi.unstubAllGlobals();
  });

  it('tras caerse la sesión en esta pestaña, la guarda solo para quien estaba', () => {
    anotaLaCuentaDeEstaPestana('u-1');
    anotaLaCuentaDeEstaPestana(null);
    en('/competitions/7');

    redirigeAlLogin({ cuenta: ultimaCuentaDeEstaPestana() });

    expect(sessionStorage.getItem('vuelta_tras_entrar')).toBe('/competitions/7');
    expect(sessionStorage.getItem('vuelta_tras_entrar_cuenta')).toBe('u-1');
    expect(vueltaTrasEntrar(undefined, { cuenta: 'u-2' })).toBe('/dashboard');
  });

  it('si nunca hubo nadie, la guarda para quien entre (el enlace abierto sin sesión)', () => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn(), removeItem: vi.fn() });
    // Lo que hace AuthContext al arrancar sin usuario guardado
    anotaLaCuentaDeEstaPestana(null);
    en('/confirm-email-change', '?token=abc');

    redirigeAlLogin({ cuenta: ultimaCuentaDeEstaPestana() });

    expect(sessionStorage.getItem('vuelta_tras_entrar')).toBe('/confirm-email-change?token=abc');
    expect(sessionStorage.getItem('vuelta_tras_entrar_cuenta')).toBeNull();
    expect(vueltaTrasEntrar(undefined, { cuenta: 'u-2' })).toBe('/confirm-email-change?token=abc');
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

describe('estadoParaElLogin (R1: la única forma de ir al login con la página de la que venía)', () => {
  beforeEach(() => olvidaLaCuentaDeEstaPestana());
  afterEach(() => olvidaLaCuentaDeEstaPestana());

  it('lleva la página y la última cuenta de la pestaña', () => {
    anotaLaCuentaDeEstaPestana('u-1');
    anotaLaCuentaDeEstaPestana(null);

    expect(estadoParaElLogin({ pathname: '/competitions/7', search: '?a=1', hash: '' })).toEqual({
      from: { pathname: '/competitions/7', search: '?a=1', hash: '', cuenta: 'u-1' },
    });
  });

  it('sin cuenta en la pestaña, la página sin cuenta', () => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn(), removeItem: vi.fn() });

    expect(estadoParaElLogin({ pathname: '/stats' }).from.cuenta).toBeNull();
    vi.unstubAllGlobals();
  });
});

/**
 * Los tres estados de la pestaña (code-review, 9 nov 2026): «no se sabe» (nada anotado: se
 * mira el usuario guardado), «aquí no hay nadie» (arrancó sin usuario, o se cerró sesión a
 * propósito) y «estuvo tal cuenta» (se conserva aunque la sesión caiga).
 */
describe('los tres estados de la última cuenta de la pestaña', () => {
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

  it('arrancó sin usuario: nadie, aunque luego otra pestaña guarde el suyo', () => {
    anotaLaCuentaDeEstaPestana(null);
    almacen.user = JSON.stringify({ id: 'u-otra' });

    expect(ultimaCuentaDeEstaPestana()).toBeNull();
  });

  it('estuvo una cuenta y la sesión cae: se conserva', () => {
    anotaLaCuentaDeEstaPestana('u-1');
    anotaLaCuentaDeEstaPestana(null);

    expect(ultimaCuentaDeEstaPestana()).toBe('u-1');
  });

  it('se cerró sesión a propósito: nadie, aunque otra pestaña guarde el suyo', () => {
    anotaLaCuentaDeEstaPestana('u-1');
    olvidaLaUltimaCuenta();
    almacen.user = JSON.stringify({ id: 'u-otra' });

    expect(ultimaCuentaDeEstaPestana()).toBeNull();
  });

  it('tras cerrar sesión, entra otra cuenta: esa es la última', () => {
    anotaLaCuentaDeEstaPestana('u-1');
    olvidaLaUltimaCuenta();
    anotaLaCuentaDeEstaPestana('u-2');

    expect(ultimaCuentaDeEstaPestana()).toBe('u-2');
  });
});


/**
 * La vuelta a la anotación en curso cuando no hay otra a dónde volver (11 nov 2026): iOS
 * cerró la app anotando y al abrirla arranca de cero.
 *
 *   B1 sin página de la que venía ni guardada: la anotación en curso de esa cuenta
 *   B3 de otra cuenta: al panel
 *   B7 la página de la que venía (un enlace) o la guardada mandan sobre la anotación
 *   D1 al arrancar, un aviso informativo a Sentry sin ids; en otra entrada (el login), no
 *   D2 uno por carga
 */
describe('la vuelta a la anotación en curso', () => {
  const ID = '0b5a6c1e-2d3f-4a5b-8c7d-9e0f1a2b3c4d';
  const CUENTA = 'u-anota';
  const ANOTACION = `/quick-matches/${ID}/scoring`;
  const memoria = () => {
    const datos = new Map();
    return {
      getItem: (k) => (datos.has(k) ? datos.get(k) : null),
      setItem: (k, v) => datos.set(k, String(v)),
      removeItem: (k) => datos.delete(k),
      clear: () => datos.clear(),
    };
  };

  beforeEach(() => {
    vi.stubGlobal('localStorage', memoria());
    sessionStorage.clear();
    olvidaLaCuentaDeEstaPestana();
    guardaLaAnotacionEnCurso({ cuenta: CUENTA, pathname: ANOTACION, search: '', pestana: 'input', hoyo: 12, mapa: true });
    olvidaElAvisoDeLaVuelta();
    vi.mocked(captureError).mockClear();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('B1: sin otra página a la que volver, vuelve a la anotación de esa cuenta', () => {
    expect(vueltaTrasEntrar(undefined, { cuenta: CUENTA })).toBe(ANOTACION);
  });

  it('B3: con otra cuenta, al panel', () => {
    expect(vueltaTrasEntrar(undefined, { cuenta: 'u-otra' })).toBe('/dashboard');
  });

  it('B7: la página de la que venía (un enlace) manda sobre la anotación', () => {
    expect(vueltaTrasEntrar({ pathname: '/friends', search: '', hash: '' }, { cuenta: CUENTA })).toBe('/friends');
  });

  it('B7: la página guardada en la pestaña manda sobre la anotación', () => {
    en('/profile');
    guardaLaVueltaTrasEntrar({ cuenta: CUENTA });

    expect(vueltaTrasEntrar(undefined, { cuenta: CUENTA })).toBe('/profile');
  });

  it('D1: al arrancar avisa a Sentry, sin ids: tipo, pestaña, mapa y minutos', () => {
    const aviso = vi.mocked(captureError);

    vueltaTrasEntrar(undefined, { cuenta: CUENTA, arranque: true });

    expect(aviso).toHaveBeenCalledTimes(1);
    const [titulo, contexto] = aviso.mock.calls[0];
    expect(titulo).toBe('Vuelta a la anotación tras arranque en frío');
    expect(contexto.level).toBe('info');
    expect(contexto.tags).toEqual({
      'anotacion.tipo': 'rapida',
      'anotacion.pestana': 'input',
      'anotacion.mapa': 'si',
      'anotacion.minutos': expect.stringMatching(/^\d+$/),
    });
    expect(JSON.stringify(aviso.mock.calls[0])).not.toContain(ID);
  });

  it('D1: entrando con el formulario (no al arrancar) no avisa', () => {
    const aviso = vi.mocked(captureError);

    vueltaTrasEntrar(undefined, { cuenta: CUENTA });

    expect(aviso).not.toHaveBeenCalled();
  });

  it('D2: como mucho un aviso por carga', () => {
    const aviso = vi.mocked(captureError);

    vueltaTrasEntrar(undefined, { cuenta: CUENTA, arranque: true });
    vueltaTrasEntrar(undefined, { cuenta: CUENTA, arranque: true });

    expect(aviso).toHaveBeenCalledTimes(1);
  });
});
