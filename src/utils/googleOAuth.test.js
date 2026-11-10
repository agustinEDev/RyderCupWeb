/* global URL */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildGoogleOAuthUrl, verifyOAuthState, recogeElVerificadorDeGoogle } from './googleOAuth';

describe('buildGoogleOAuthUrl', () => {
  const originalEnv = { ...import.meta.env };

  beforeEach(() => {
    import.meta.env.VITE_GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com';
    import.meta.env.VITE_GOOGLE_REDIRECT_URI = 'http://localhost:5173/auth/google/callback';
    sessionStorage.clear();
  });

  afterEach(() => {
    // Restore original env
    Object.keys(import.meta.env).forEach(key => {
      if (key.startsWith('VITE_GOOGLE_')) {
        if (originalEnv[key] !== undefined) {
          import.meta.env[key] = originalEnv[key];
        } else {
          delete import.meta.env[key];
        }
      }
    });
    sessionStorage.clear();
  });

  it('should build a valid Google OAuth URL with default login flow', async () => {
    const url = await buildGoogleOAuthUrl();
    const parsed = new URL(url);

    expect(parsed.origin).toBe('https://accounts.google.com');
    expect(parsed.pathname).toBe('/o/oauth2/v2/auth');
    expect(parsed.searchParams.get('client_id')).toBe('test-client-id.apps.googleusercontent.com');
    expect(parsed.searchParams.get('redirect_uri')).toBe('http://localhost:5173/auth/google/callback');
    expect(parsed.searchParams.get('response_type')).toBe('code');
    expect(parsed.searchParams.get('scope')).toBe('openid email profile');
    // Sin refresh token de Google (no se usa) y sin forzar el consentimiento cada vez
    expect(parsed.searchParams.has('access_type')).toBe(false);
    expect(parsed.searchParams.get('prompt')).toBe('select_account');
  });

  it('should include flow and nonce in state parameter', async () => {
    const url = await buildGoogleOAuthUrl('login');
    const parsed = new URL(url);
    const state = parsed.searchParams.get('state');

    expect(state).toMatch(/^login:[a-f0-9]{32}$/);
  });

  it('should set state with link flow', async () => {
    const url = await buildGoogleOAuthUrl('link');
    const parsed = new URL(url);
    const state = parsed.searchParams.get('state');

    expect(state).toMatch(/^link:[a-f0-9]{32}$/);
  });

  it('should store nonce in sessionStorage', async () => {
    const url = await buildGoogleOAuthUrl('login');
    const parsed = new URL(url);
    const state = parsed.searchParams.get('state');
    const nonce = state.split(':')[1];

    expect(sessionStorage.getItem('google_oauth_state_token')).toBe(nonce);
  });

  it('should generate different nonces on each call', async () => {
    const url1 = await buildGoogleOAuthUrl();
    const state1 = new URL(url1).searchParams.get('state').split(':')[1];

    const url2 = await buildGoogleOAuthUrl();
    const state2 = new URL(url2).searchParams.get('state').split(':')[1];

    expect(state1).not.toBe(state2);
  });

  it('should throw if VITE_GOOGLE_CLIENT_ID is not set', async () => {
    delete import.meta.env.VITE_GOOGLE_CLIENT_ID;

    await expect(buildGoogleOAuthUrl()).rejects.toThrow('VITE_GOOGLE_CLIENT_ID environment variable is not configured');
  });

  it('should throw if VITE_GOOGLE_REDIRECT_URI is not set', async () => {
    delete import.meta.env.VITE_GOOGLE_REDIRECT_URI;

    await expect(buildGoogleOAuthUrl()).rejects.toThrow('VITE_GOOGLE_REDIRECT_URI environment variable is not configured');
  });
});

describe('verifyOAuthState', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should return valid true when nonce matches', () => {
    sessionStorage.setItem('google_oauth_state_token', 'abc123');
    const result = verifyOAuthState('login:abc123');

    expect(result.flow).toBe('login');
    expect(result.valid).toBe(true);
  });

  it('should return valid false when nonce does not match', () => {
    sessionStorage.setItem('google_oauth_state_token', 'abc123');
    const result = verifyOAuthState('login:wrong_nonce');

    expect(result.flow).toBe('login');
    expect(result.valid).toBe(false);
  });

  it('should return valid false when no stored nonce', () => {
    const result = verifyOAuthState('login:abc123');

    expect(result.flow).toBe('login');
    expect(result.valid).toBe(false);
  });

  it('should clear stored nonce after verification', () => {
    sessionStorage.setItem('google_oauth_state_token', 'abc123');
    verifyOAuthState('login:abc123');

    expect(sessionStorage.getItem('google_oauth_state_token')).toBeNull();
  });

  it('should parse link flow correctly', () => {
    sessionStorage.setItem('google_oauth_state_token', 'nonce456');
    const result = verifyOAuthState('link:nonce456');

    expect(result.flow).toBe('link');
    expect(result.valid).toBe(true);
  });

  it('should handle null state', () => {
    const result = verifyOAuthState(null);

    expect(result.flow).toBe('login');
    expect(result.valid).toBe(false);
  });

  it('should handle legacy state without nonce', () => {
    const result = verifyOAuthState('login');

    expect(result.flow).toBe('login');
    expect(result.valid).toBe(false);
  });
});

describe('la vuelta tras Google (RyderCupAm #753)', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('V1: guarda la página de confirmar el correo, con su token, y la devuelve una vez', async () => {
    const { guardaLaVueltaDeGoogle, recogeLaVueltaDeGoogle } = await import('./googleOAuth');

    guardaLaVueltaDeGoogle({ pathname: '/confirm-email-change', search: '?token=abc' });

    expect(recogeLaVueltaDeGoogle()).toBe('/confirm-email-change?token=abc');
    expect(recogeLaVueltaDeGoogle()).toBeNull();
  });

  it.each([
    ['otra página', { pathname: '/admin/users' }],
    ['un prefijo engañoso', { pathname: '/confirm-email-changes' }],
    ['sin ruta', undefined],
  ])('V2: %s no se guarda', async (_caso, from) => {
    const { guardaLaVueltaDeGoogle, recogeLaVueltaDeGoogle } = await import('./googleOAuth');

    guardaLaVueltaDeGoogle(from);

    // Ni siquiera queda guardada a la espera
    expect(sessionStorage.getItem('google_oauth_vuelta')).toBeNull();
    expect(recogeLaVueltaDeGoogle()).toBeNull();
  });

  it('V3: lo escrito a mano en el almacenamiento no vale si no es una página permitida', async () => {
    const { recogeLaVueltaDeGoogle } = await import('./googleOAuth');
    sessionStorage.setItem('google_oauth_vuelta', 'https://evil.example');

    expect(recogeLaVueltaDeGoogle()).toBeNull();
  });
});

describe('la vuelta de Google con su cuenta (FE #1064, R7)', () => {
  beforeEach(() => sessionStorage.clear());

  it('guarda y devuelve la cuenta de la página de la que venía, una vez', async () => {
    const { guardaLaVueltaDeGoogle, recogeLaVueltaDeGoogleConSuCuenta } = await import('./googleOAuth');

    guardaLaVueltaDeGoogle({ pathname: '/confirm-email-change', search: '?token=abc', cuenta: 'u-1' });

    expect(recogeLaVueltaDeGoogleConSuCuenta()).toEqual({
      ruta: '/confirm-email-change?token=abc',
      cuenta: 'u-1',
    });
    expect(recogeLaVueltaDeGoogleConSuCuenta()).toBeNull();
  });

  it('sin cuenta apuntada, la vuelta sin cuenta (vale para cualquiera)', async () => {
    const { guardaLaVueltaDeGoogle, recogeLaVueltaDeGoogleConSuCuenta } = await import('./googleOAuth');

    guardaLaVueltaDeGoogle({ pathname: '/confirm-email-change', search: '?token=abc' });

    expect(recogeLaVueltaDeGoogleConSuCuenta()).toEqual({
      ruta: '/confirm-email-change?token=abc',
      cuenta: null,
    });
  });

  it('guardar otra vuelta sin cuenta no deja la cuenta de antes', async () => {
    const { guardaLaVueltaDeGoogle, recogeLaVueltaDeGoogleConSuCuenta } = await import('./googleOAuth');

    guardaLaVueltaDeGoogle({ pathname: '/confirm-email-change', search: '?token=a', cuenta: 'u-1' });
    guardaLaVueltaDeGoogle({ pathname: '/confirm-email-change', search: '?token=b' });

    expect(recogeLaVueltaDeGoogleConSuCuenta()).toEqual({
      ruta: '/confirm-email-change?token=b',
      cuenta: null,
    });
  });

  it('una página no permitida no guarda nada, tampoco la cuenta', async () => {
    const { guardaLaVueltaDeGoogle, recogeLaVueltaDeGoogleConSuCuenta } = await import('./googleOAuth');

    guardaLaVueltaDeGoogle({ pathname: '/competitions/7', cuenta: 'u-1' });

    // Antes de recogerla, que también la borra
    expect(sessionStorage.getItem('google_oauth_vuelta_cuenta')).toBeNull();
    expect(recogeLaVueltaDeGoogleConSuCuenta()).toBeNull();
  });
});

describe('la vuelta de Google ante un almacenamiento que falla (revisión, FE #1064)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('escribe la cuenta antes que la ruta: si la cuenta no cabe, no queda ruta sin cuenta', async () => {
    const guardado = {};
    vi.stubGlobal('sessionStorage', {
      getItem: (k) => guardado[k] ?? null,
      removeItem: (k) => delete guardado[k],
      setItem: (k, v) => {
        if (k === 'google_oauth_vuelta_cuenta') throw new Error('QuotaExceededError');
        guardado[k] = v;
      },
    });
    const { guardaLaVueltaDeGoogle } = await import('./googleOAuth');

    guardaLaVueltaDeGoogle({ pathname: '/confirm-email-change', search: '?token=a', cuenta: 'u-1' });

    expect(guardado.google_oauth_vuelta).toBeUndefined();
  });

  it('si no puede leer la cuenta, descarta la vuelta en vez de dejarla para cualquiera', async () => {
    const guardado = { google_oauth_vuelta: '/confirm-email-change?token=a', google_oauth_vuelta_cuenta: 'u-1' };
    vi.stubGlobal('sessionStorage', {
      getItem: (k) => {
        if (k === 'google_oauth_vuelta_cuenta') throw new Error('SecurityError');
        return guardado[k] ?? null;
      },
      removeItem: (k) => delete guardado[k],
      setItem: (k, v) => (guardado[k] = v),
    });
    const { recogeLaVueltaDeGoogleConSuCuenta } = await import('./googleOAuth');

    expect(recogeLaVueltaDeGoogleConSuCuenta()).toBeNull();
  });
});



/**
 * PKCE (RFC 7636, fase 3): el código de Google solo lo puede canjear quien empezó la ida.
 *
 *   #   caso                                   | se espera
 *   ----|----------------------------------------|-----------------------------------------
 *   P1  empezar                                | verifier de 43-128 [A-Za-z0-9-._~] en sessionStorage
 *   P2  el reto que va a Google                | base64url(SHA-256(verifier)), sin relleno, S256
 *   P3  dos idas                               | verifiers distintos
 *   P4  recoger a la vuelta                    | lo devuelve y lo borra (una sola vez)
 *   P5  vuelta sin verifier                    | null
 *   P6  verifier con forma imposible           | null, y también se borra
 *   P7  sin la configuración, no se apunta nada| ni state ni verifier
 */
describe('buildGoogleOAuthUrl · PKCE', () => {
  const VERIFIER_KEY = 'google_oauth_code_verifier';
  const FORMA = /^[A-Za-z0-9\-._~]{43,128}$/;

  beforeEach(() => {
    import.meta.env.VITE_GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com';
    import.meta.env.VITE_GOOGLE_REDIRECT_URI = 'http://localhost:5173/auth/google/callback';
    sessionStorage.clear();
  });

  afterEach(() => sessionStorage.clear());

  const sha256Base64Url = async (texto) => {
    const hash = await globalThis.crypto.subtle.digest('SHA-256', new globalThis.TextEncoder().encode(texto));
    return globalThis.btoa(String.fromCodePoint(...new Uint8Array(hash)))
      .replaceAll('+', '-')
      .replaceAll('/', '_')
      .replace(/=+$/, '');
  };

  it('P1: guarda un verifier aleatorio con la forma del RFC 7636', async () => {
    await buildGoogleOAuthUrl('login');

    expect(sessionStorage.getItem(VERIFIER_KEY)).toMatch(FORMA);
  });

  it('P2: manda a Google el reto S256 de ese verifier', async () => {
    const url = new URL(await buildGoogleOAuthUrl('link'));
    const verifier = sessionStorage.getItem(VERIFIER_KEY);

    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('code_challenge')).toBe(await sha256Base64Url(verifier));
    // Nunca el verifier en la URL
    expect(url.toString()).not.toContain(verifier);
  });

  it('P2b: el reto de un verifier conocido es el del RFC 7636 (apéndice B)', async () => {
    // El ejemplo del propio RFC: así se comprueba la codificación sin depender del código
    expect(await sha256Base64Url('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe(
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM'
    );
  });

  it('P3: cada ida tiene su verifier', async () => {
    await buildGoogleOAuthUrl();
    const primero = sessionStorage.getItem(VERIFIER_KEY);
    await buildGoogleOAuthUrl();

    expect(sessionStorage.getItem(VERIFIER_KEY)).not.toBe(primero);
  });

  it('P4: a la vuelta se recoge una sola vez', async () => {
    await buildGoogleOAuthUrl();
    const guardado = sessionStorage.getItem(VERIFIER_KEY);

    expect(recogeElVerificadorDeGoogle()).toBe(guardado);
    expect(sessionStorage.getItem(VERIFIER_KEY)).toBeNull();
    expect(recogeElVerificadorDeGoogle()).toBeNull();
  });

  it('P5: sin verifier guardado (otra pestaña) devuelve null', () => {
    expect(recogeElVerificadorDeGoogle()).toBeNull();
  });

  it.each([
    ['corto', 'a'.repeat(42)],
    ['largo', 'a'.repeat(129)],
    ['con caracteres fuera del RFC', `${'a'.repeat(42)}+`],
  ])('P6: un verifier %s no vale y se borra igual', (_caso, valor) => {
    sessionStorage.setItem(VERIFIER_KEY, valor);

    expect(recogeElVerificadorDeGoogle()).toBeNull();
    expect(sessionStorage.getItem(VERIFIER_KEY)).toBeNull();
  });

  it('P7: sin configuración no deja nada apuntado', async () => {
    delete import.meta.env.VITE_GOOGLE_CLIENT_ID;

    await expect(buildGoogleOAuthUrl()).rejects.toThrow();
    expect(sessionStorage.getItem(VERIFIER_KEY)).toBeNull();
    expect(sessionStorage.getItem('google_oauth_state_token')).toBeNull();
  });
});
