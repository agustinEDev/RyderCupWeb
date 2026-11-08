/* global URL */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildGoogleOAuthUrl, verifyOAuthState } from './googleOAuth';

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

  it('should build a valid Google OAuth URL with default login flow', () => {
    const url = buildGoogleOAuthUrl();
    const parsed = new URL(url);

    expect(parsed.origin).toBe('https://accounts.google.com');
    expect(parsed.pathname).toBe('/o/oauth2/v2/auth');
    expect(parsed.searchParams.get('client_id')).toBe('test-client-id.apps.googleusercontent.com');
    expect(parsed.searchParams.get('redirect_uri')).toBe('http://localhost:5173/auth/google/callback');
    expect(parsed.searchParams.get('response_type')).toBe('code');
    expect(parsed.searchParams.get('scope')).toBe('openid email profile');
    expect(parsed.searchParams.get('access_type')).toBe('offline');
    expect(parsed.searchParams.get('prompt')).toBe('consent');
  });

  it('should include flow and nonce in state parameter', () => {
    const url = buildGoogleOAuthUrl('login');
    const parsed = new URL(url);
    const state = parsed.searchParams.get('state');

    expect(state).toMatch(/^login:[a-f0-9]{32}$/);
  });

  it('should set state with link flow', () => {
    const url = buildGoogleOAuthUrl('link');
    const parsed = new URL(url);
    const state = parsed.searchParams.get('state');

    expect(state).toMatch(/^link:[a-f0-9]{32}$/);
  });

  it('should store nonce in sessionStorage', () => {
    const url = buildGoogleOAuthUrl('login');
    const parsed = new URL(url);
    const state = parsed.searchParams.get('state');
    const nonce = state.split(':')[1];

    expect(sessionStorage.getItem('google_oauth_state_token')).toBe(nonce);
  });

  it('should generate different nonces on each call', () => {
    const url1 = buildGoogleOAuthUrl();
    const state1 = new URL(url1).searchParams.get('state').split(':')[1];

    const url2 = buildGoogleOAuthUrl();
    const state2 = new URL(url2).searchParams.get('state').split(':')[1];

    expect(state1).not.toBe(state2);
  });

  it('should throw if VITE_GOOGLE_CLIENT_ID is not set', () => {
    delete import.meta.env.VITE_GOOGLE_CLIENT_ID;

    expect(() => buildGoogleOAuthUrl()).toThrow('VITE_GOOGLE_CLIENT_ID environment variable is not configured');
  });

  it('should throw if VITE_GOOGLE_REDIRECT_URI is not set', () => {
    delete import.meta.env.VITE_GOOGLE_REDIRECT_URI;

    expect(() => buildGoogleOAuthUrl()).toThrow('VITE_GOOGLE_REDIRECT_URI environment variable is not configured');
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

