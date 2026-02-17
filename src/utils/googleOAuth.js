/* global crypto */
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
