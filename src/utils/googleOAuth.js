/* global crypto, TextEncoder */
// deepcode ignore HardcodedNonCryptoSecret: This is a sessionStorage key name, not a secret value. The actual secret is the cryptographically random nonce generated via crypto.getRandomValues().
const OAUTH_STATE_KEY = 'google_oauth_state_token';

/**
 * Generate a cryptographically secure random nonce.
 * @returns {string} A 32-character hex string.
 */
function generateNonce() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

// La página a la que volver tras entrar con Google (RyderCupAm #753): sin esto, el
// enlace de confirmar el cambio de correo abierto sin sesión se perdía, porque la vuelta
// de Google va al panel. Solo esas páginas: cualquier otra ruta sería una redirección
// abierta guardada a la espera
const VUELTA_KEY = 'google_oauth_vuelta';
// La cuenta de la página de la que venía (FE #1064, R7): si entra otra, a su panel
const VUELTA_CUENTA_KEY = 'google_oauth_vuelta_cuenta';
const VUELTAS_PERMITIDAS = ['/confirm-email-change'];

const esVueltaPermitida = (ruta) =>
  typeof ruta === 'string' &&
  VUELTAS_PERMITIDAS.some(
    (base) => ruta === base || ruta.startsWith(`${base}?`),
  );

/**
 * Guarda a dónde volver tras Google, si es una página permitida. Va en sessionStorage:
 * dura lo que la ida y vuelta, en esa pestaña.
 * @param {{pathname?: string, search?: string}|undefined} from La ruta de la que vino
 */
export function guardaLaVueltaDeGoogle(from) {
  const ruta = from?.pathname ? `${from.pathname}${from.search || ''}` : null;
  try {
    // Guardar sustituye: ni la ruta ni la cuenta de antes se quedan
    sessionStorage.removeItem(VUELTA_CUENTA_KEY);
    if (!esVueltaPermitida(ruta)) {
      sessionStorage.removeItem(VUELTA_KEY);
      return;
    }
    sessionStorage.removeItem(VUELTA_KEY);
    // La cuenta antes que la ruta: si escribirla falla, no queda una ruta sin su cuenta
    // que valdría para cualquiera (revisión, FE #1064)
    if (from?.cuenta != null)
      sessionStorage.setItem(VUELTA_CUENTA_KEY, String(from.cuenta));
    sessionStorage.setItem(VUELTA_KEY, ruta);
  } catch {
    // Sin almacenamiento, se vuelve al panel como siempre
  }
}

/**
 * La vuelta guardada y la cuenta que la apuntó (o `null` si no apuntó ninguna), una sola
 * vez: se borran al leerlas. Null si no hay vuelta o no vale (FE #1064, R7).
 * @returns {{ruta: string, cuenta: string|null}|null}
 */
export function recogeLaVueltaDeGoogleConSuCuenta() {
  let cuenta;
  try {
    cuenta = sessionStorage.getItem(VUELTA_CUENTA_KEY);
    sessionStorage.removeItem(VUELTA_CUENTA_KEY);
  } catch {
    // Sin saber de quién era, la vuelta no vale para nadie: se descarta (revisión)
    recogeLaVueltaDeGoogle();
    return null;
  }
  const ruta = recogeLaVueltaDeGoogle();
  return ruta ? { ruta, cuenta } : null;
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

// PKCE (RFC 7636, fase 3): el código que devuelve Google solo lo canjea quien guarda
// este verifier, que nunca sale de la pestaña salvo en el canje. Un código robado (en
// el historial, en un Referer, en un log) no sirve sin él
// deepcode ignore HardcodedNonCryptoSecret: nombre de la clave, no un secreto
const VERIFIER_KEY = 'google_oauth_code_verifier';
const FORMA_DEL_VERIFIER = /^[A-Za-z0-9\-._~]{43,128}$/;

const enBase64Url = (bytes) =>
  btoa(String.fromCodePoint(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');

/**
 * 48 bytes aleatorios en base64url: 64 caracteres, todos del alfabeto del RFC 7636.
 * @returns {string}
 */
function generaElVerificador() {
  const bytes = new Uint8Array(48);
  crypto.getRandomValues(bytes);
  return enBase64Url(bytes);
}

/**
 * El reto S256: base64url(SHA-256(verifier)), sin relleno.
 * @param {string} verifier
 * @returns {Promise<string>}
 */
async function retoDelVerificador(verifier) {
  const hash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(verifier),
  );
  return enBase64Url(new Uint8Array(hash));
}

/**
 * El verifier de la ida a Google, una sola vez: se borra al leerlo, valga o no.
 * Null si no hay (la vuelta llegó a otra pestaña, o se vació el almacenamiento) o si
 * no tiene la forma del RFC 7636.
 * @returns {string|null}
 */
export function recogeElVerificadorDeGoogle() {
  let verifier = null;
  try {
    verifier = sessionStorage.getItem(VERIFIER_KEY);
    sessionStorage.removeItem(VERIFIER_KEY);
  } catch {
    return null;
  }
  return typeof verifier === 'string' && FORMA_DEL_VERIFIER.test(verifier)
    ? verifier
    : null;
}

/**
 * Build Google OAuth 2.0 authorization URL with CSRF-safe state and PKCE (S256).
 * @param {'login'|'link'} flow - The OAuth flow type. 'login' for sign-in/register, 'link' for account linking.
 * @returns {Promise<string>} The full Google OAuth authorization URL.
 */
export async function buildGoogleOAuthUrl(flow = 'login') {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI;

  if (!clientId) {
    throw new Error(
      'VITE_GOOGLE_CLIENT_ID environment variable is not configured',
    );
  }
  if (!redirectUri) {
    throw new Error(
      'VITE_GOOGLE_REDIRECT_URI environment variable is not configured',
    );
  }

  const verifier = generaElVerificador();
  const codeChallenge = await retoDelVerificador(verifier);
  const nonce = generateNonce();
  sessionStorage.setItem(OAUTH_STATE_KEY, nonce);
  sessionStorage.setItem(VERIFIER_KEY, verifier);

  const state = `${flow}:${nonce}`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    // Sin `access_type: 'offline'`: el backend no usa el refresh token de Google. Y
    // elegir cuenta en vez de forzar el consentimiento cada vez
    prompt: 'select_account',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
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
