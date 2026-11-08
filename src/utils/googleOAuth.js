/* global crypto */
// deepcode ignore HardcodedNonCryptoSecret: This is a sessionStorage key name, not a secret value. The actual secret is the cryptographically random nonce generated via crypto.getRandomValues().
const OAUTH_STATE_KEY = 'google_oauth_state_token';

/**
 * Generate a cryptographically secure random nonce.
 * @returns {string} A 32-character hex string.
 */
function generateNonce() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

// La página a la que volver tras entrar con Google (RyderCupAm #753): sin esto, el
// enlace de confirmar el cambio de correo abierto sin sesión se perdía, porque la vuelta
// de Google va al panel. Solo esas páginas: cualquier otra ruta sería una redirección
// abierta guardada a la espera
const VUELTA_KEY = 'google_oauth_vuelta';
const VUELTAS_PERMITIDAS = ['/confirm-email-change'];

const esVueltaPermitida = (ruta) =>
  typeof ruta === 'string' &&
  VUELTAS_PERMITIDAS.some((base) => ruta === base || ruta.startsWith(`${base}?`));

/**
 * Guarda a dónde volver tras Google, si es una página permitida. Va en sessionStorage:
 * dura lo que la ida y vuelta, en esa pestaña.
 * @param {{pathname?: string, search?: string}|undefined} from La ruta de la que vino
 */
export function guardaLaVueltaDeGoogle(from) {
  const ruta = from?.pathname ? `${from.pathname}${from.search || ''}` : null;
  try {
    if (esVueltaPermitida(ruta)) sessionStorage.setItem(VUELTA_KEY, ruta);
    else sessionStorage.removeItem(VUELTA_KEY);
  } catch {
    // Sin almacenamiento, se vuelve al panel como siempre
  }
}

/**
 * La vuelta guardada, una sola vez: se borra al leerla. Null si no hay o no vale.
 * @returns {string|null}
 */
export function recogeLaVueltaDeGoogle() {
  let ruta = null;
  try {
    ruta = sessionStorage.getItem(VUELTA_KEY);
    sessionStorage.removeItem(VUELTA_KEY);
  } catch {
    return null;
  }
  return esVueltaPermitida(ruta) ? ruta : null;
}

/**
 * Build Google OAuth 2.0 authorization URL with CSRF-safe state.
 * @param {'login'|'link'} flow - The OAuth flow type. 'login' for sign-in/register, 'link' for account linking.
 * @returns {string} The full Google OAuth authorization URL.
 */
export function buildGoogleOAuthUrl(flow = 'login') {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI;

  if (!clientId) {
    throw new Error('VITE_GOOGLE_CLIENT_ID environment variable is not configured');
  }
  if (!redirectUri) {
    throw new Error('VITE_GOOGLE_REDIRECT_URI environment variable is not configured');
  }

  const nonce = generateNonce();
  sessionStorage.setItem(OAUTH_STATE_KEY, nonce);

  const state = `${flow}:${nonce}`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Parse and verify the OAuth state parameter against stored nonce.
 * @param {string} state - The state parameter from the OAuth callback.
 * @returns {{ flow: string, valid: boolean }} The parsed flow and whether the nonce is valid.
 */
export function verifyOAuthState(state) {
  if (!state) {
    return { flow: 'login', valid: false };
  }

  const separatorIndex = state.indexOf(':');
  if (separatorIndex === -1) {
    // Legacy state without nonce (just flow name) — treat as invalid
    return { flow: state, valid: false };
  }

  const flow = state.substring(0, separatorIndex);
  const nonce = state.substring(separatorIndex + 1);

  const storedNonce = sessionStorage.getItem(OAUTH_STATE_KEY);
  sessionStorage.removeItem(OAUTH_STATE_KEY);

  return {
    flow,
    valid: Boolean(storedNonce && storedNonce === nonce),
  };
}
