/**
 * Build Google OAuth 2.0 authorization URL.
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

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
    state: flow,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}
