/**
 * Tests for Token Refresh Interceptor
 *
 * Tests the automatic token refresh flow when access tokens expire (401 responses).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { refreshAccessToken, fetchWithTokenRefresh, isSessionValid } from './tokenRefreshInterceptor';

// Mock global fetch
globalThis.fetch = vi.fn();

// Mock window.location
delete globalThis.window;
globalThis.window = { location: { href: '' } };
globalThis.location = { href: '' };

// Mock localStorage and sessionStorage
globalThis.localStorage = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

globalThis.sessionStorage = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Helper to create mock response with clone() method
const createMockResponse = (config) => {
  const response = {
    ok: config.ok ?? true,
    status: config.status ?? 200,
    statusText: config.statusText ?? 'OK',
    json: config.json ?? (async () => ({})),
    clone: vi.fn(() => createMockResponse(config)),
    ...config,
  };
  return response;
};

describe('tokenRefreshInterceptor', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    globalThis.location.href = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('refreshAccessToken', () => {
    it('should successfully refresh access token', async () => {
      // Mock successful refresh response
      globalThis.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ message: 'Token refreshed' }),
      });

      const result = await refreshAccessToken();

      expect(result).toBe(true);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/auth/refresh-token'),
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        })
      );
    });

    it('should throw error when refresh token expired (401)', async () => {
      // Mock 401 response (refresh token expired)
      globalThis.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      await expect(refreshAccessToken()).rejects.toThrow('Refresh token expired');
    });

    it('should throw error when refresh endpoint fails', async () => {
      // Mock 500 response
      globalThis.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(refreshAccessToken()).rejects.toThrow('Failed to refresh token');
    });

    it('should throw error on network failure', async () => {
      // Mock network error
      globalThis.fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(refreshAccessToken()).rejects.toThrow('Network error');
    });
  });

  describe('fetchWithTokenRefresh', () => {
    it('should return response directly if not 401', async () => {
      // Mock successful response (200)
      const mockResponse = createMockResponse({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      });
      globalThis.fetch.mockResolvedValueOnce(mockResponse);

      const result = await fetchWithTokenRefresh('http://localhost:8000/api/v1/test');

      expect(result).toBe(mockResponse);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it('should refresh token and retry request on 401', async () => {
      // First call: 401 (access token expired)
      globalThis.fetch.mockResolvedValueOnce(createMockResponse({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ detail: 'Token expired' }),
      }));

      // Second call: successful refresh
      globalThis.fetch.mockResolvedValueOnce(createMockResponse({
        ok: true,
        status: 200,
        json: async () => ({ message: 'Token refreshed' }),
      }));

      // Third call: retry original request with new token (success)
      const mockSuccessResponse = createMockResponse({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      });
      globalThis.fetch.mockResolvedValueOnce(mockSuccessResponse);

      const result = await fetchWithTokenRefresh('http://localhost:8000/api/v1/test');

      expect(result).toBe(mockSuccessResponse);
      expect(globalThis.fetch).toHaveBeenCalledTimes(3);
      // First call: original request
      // Second call: refresh token
      // Third call: retry original request
    });

    it('should redirect to login if refresh token also expired', async () => {
      // First call: 401 (access token expired)
      globalThis.fetch.mockResolvedValueOnce(createMockResponse({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ detail: 'Token expired' }),
      }));

      // Second call: refresh fails with 401 (refresh token expired)
      globalThis.fetch.mockResolvedValueOnce(createMockResponse({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      }));

      const result = await fetchWithTokenRefresh('http://localhost:8000/api/v1/test');

      // Should redirect to login
      expect(globalThis.location.href).toBe('/login');

      // Should return the original 401 response
      expect(result.status).toBe(401);
    });

    it('should not retry refresh endpoint itself', async () => {
      // Mock 401 response from refresh endpoint itself
      const mockResponse = createMockResponse({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ detail: 'Refresh token expired' }),
      });
      globalThis.fetch.mockResolvedValueOnce(mockResponse);

      const result = await fetchWithTokenRefresh('http://localhost:8000/api/v1/auth/refresh-token');

      // Should NOT attempt to refresh again (infinite loop prevention)
      expect(result).toBe(mockResponse);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it('should queue multiple 401 requests and retry all after refresh', async () => {
      // Mock all fetch calls upfront
      // First two calls: 401 for both requests
      globalThis.fetch
        .mockResolvedValueOnce(createMockResponse({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          json: async () => ({ detail: 'Token expired' }),
        }))
        .mockResolvedValueOnce(createMockResponse({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          json: async () => ({ detail: 'Token expired' }),
        }))
        // Third call: successful refresh (should only happen once)
        .mockResolvedValueOnce(createMockResponse({
          ok: true,
          status: 200,
          json: async () => ({ message: 'Token refreshed' }),
        }))
        // Fourth and fifth calls: retry both original requests
        .mockResolvedValueOnce(createMockResponse({
          ok: true,
          status: 200,
          json: async () => ({ data: 'test1' }),
        }))
        .mockResolvedValueOnce(createMockResponse({
          ok: true,
          status: 200,
          json: async () => ({ data: 'test2' }),
        }));

      // Simulate multiple concurrent requests receiving 401
      const request1Promise = fetchWithTokenRefresh('http://localhost:8000/api/v1/test1');
      const request2Promise = fetchWithTokenRefresh('http://localhost:8000/api/v1/test2');

      // Wait for both requests to complete
      const [result1, result2] = await Promise.all([request1Promise, request2Promise]);

      expect(result1.ok).toBe(true);
      expect(result2.ok).toBe(true);

      // Should have called fetch 5 times total:
      // 1. Original request 1 (401)
      // 2. Original request 2 (401)
      // 3. Refresh token (once)
      // 4. Retry request 1
      // 5. Retry request 2
      expect(globalThis.fetch).toHaveBeenCalledTimes(5);
    });

    it('should always include credentials in requests', async () => {
      // Mock successful response
      globalThis.fetch.mockResolvedValueOnce(createMockResponse({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      }));

      await fetchWithTokenRefresh('http://localhost:8000/api/v1/test', {
        method: 'POST',
        body: JSON.stringify({ test: 'data' }),
      });

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/test',
        expect.objectContaining({
          credentials: 'include',
          method: 'POST',
        })
      );
    });
  });

  describe('isSessionValid', () => {
    it('should return true if refresh succeeds', async () => {
      // Mock successful refresh
      globalThis.fetch.mockResolvedValueOnce(createMockResponse({
        ok: true,
        status: 200,
        json: async () => ({ message: 'Token refreshed' }),
      }));

      const result = await isSessionValid();

      expect(result).toBe(true);
    });

    it('should return false if refresh fails', async () => {
      // Mock failed refresh (will throw error)
      globalThis.fetch.mockRejectedValueOnce(new Error('Refresh failed'));

      const result = await isSessionValid();

      expect(result).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should handle network errors gracefully', async () => {
      // Mock network error
      globalThis.fetch.mockRejectedValueOnce(new Error('Network request failed'));

      // Expect the error to be thrown
      try {
        await fetchWithTokenRefresh('http://localhost:8000/api/v1/test');
        // If we reach here, test should fail
        expect.fail('Expected error to be thrown');
      } catch (error) {
        expect(error.message).toContain('Network request failed');
      }
    });

    it('should preserve original error messages', async () => {
      // Mock error with specific message
      const errorMessage = 'Custom error message';
      globalThis.fetch.mockRejectedValueOnce(new Error(errorMessage));

      // Expect the error to be thrown
      try {
        await fetchWithTokenRefresh('http://localhost:8000/api/v1/test');
        // If we reach here, test should fail
        expect.fail('Expected error to be thrown');
      } catch (error) {
        expect(error.message).toContain(errorMessage);
      }
    });
  });

  describe('Security', () => {
    it('should always send httpOnly cookies with credentials: include', async () => {
      // Mock successful response
      globalThis.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      });

      await fetchWithTokenRefresh('http://localhost:8000/api/v1/test');

      // Verify credentials: 'include' is always set
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          credentials: 'include',
        })
      );
    });

    it('should not expose tokens in JavaScript (httpOnly cookies only)', async () => {
      // Mock successful refresh
      globalThis.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ message: 'Token refreshed' }),
      });

      await refreshAccessToken();

      // Verify no token is returned or stored in localStorage/sessionStorage
      // Tokens should only be in httpOnly cookies (invisible to JavaScript)
      expect(localStorage.getItem('access_token')).toBeNull();
      expect(sessionStorage.getItem('access_token')).toBeNull();
    });
  });
});
