/* global URL */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildGoogleOAuthUrl } from './googleOAuth';

describe('buildGoogleOAuthUrl', () => {
  const originalEnv = { ...import.meta.env };

  beforeEach(() => {
    import.meta.env.VITE_GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com';
    import.meta.env.VITE_GOOGLE_REDIRECT_URI = 'http://localhost:5173/auth/google/callback';
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
    expect(parsed.searchParams.get('state')).toBe('login');
  });

  it('should set state=login for login flow', () => {
    const url = buildGoogleOAuthUrl('login');
    const parsed = new URL(url);
    expect(parsed.searchParams.get('state')).toBe('login');
  });

  it('should set state=link for link flow', () => {
    const url = buildGoogleOAuthUrl('link');
    const parsed = new URL(url);
    expect(parsed.searchParams.get('state')).toBe('link');
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
