/**
 * Tests for api.js
 * v1.13.0: CSRF Protection
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { apiRequest } from './api';
import * as AuthContext from '../contexts/AuthContext';
import * as TokenRefreshInterceptor from '../utils/tokenRefreshInterceptor';

// Mock modules
vi.mock('../contexts/AuthContext', () => ({
  getCsrfToken: vi.fn(),
}));

vi.mock('../utils/tokenRefreshInterceptor', () => ({
  fetchWithTokenRefresh: vi.fn(),
}));

describe('apiRequest - CSRF Protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset global fetch mock
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('X-CSRF-Token header', () => {
    it('should include X-CSRF-Token header in POST requests', async () => {
      const mockCsrfToken = 'csrf-token-abc-123';
      AuthContext.getCsrfToken.mockReturnValue(mockCsrfToken);

      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      };

      TokenRefreshInterceptor.fetchWithTokenRefresh.mockResolvedValue(mockResponse);

      await apiRequest('/api/v1/test', {
        method: 'POST',
        body: JSON.stringify({ test: 'data' }),
      });

      expect(TokenRefreshInterceptor.fetchWithTokenRefresh).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-CSRF-Token': mockCsrfToken,
          }),
        })
      );
    });

    it('should include X-CSRF-Token header in PUT requests', async () => {
      const mockCsrfToken = 'csrf-token-put-456';
      AuthContext.getCsrfToken.mockReturnValue(mockCsrfToken);

      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      };

      TokenRefreshInterceptor.fetchWithTokenRefresh.mockResolvedValue(mockResponse);

      await apiRequest('/api/v1/test/123', {
        method: 'PUT',
        body: JSON.stringify({ updated: true }),
      });

      expect(TokenRefreshInterceptor.fetchWithTokenRefresh).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-CSRF-Token': mockCsrfToken,
          }),
        })
      );
    });

    it('should include X-CSRF-Token header in PATCH requests', async () => {
      const mockCsrfToken = 'csrf-token-patch-789';
      AuthContext.getCsrfToken.mockReturnValue(mockCsrfToken);

      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      };

      TokenRefreshInterceptor.fetchWithTokenRefresh.mockResolvedValue(mockResponse);

      await apiRequest('/api/v1/test/123', {
        method: 'PATCH',
        body: JSON.stringify({ patched: true }),
      });

      expect(TokenRefreshInterceptor.fetchWithTokenRefresh).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-CSRF-Token': mockCsrfToken,
          }),
        })
      );
    });

    it('should include X-CSRF-Token header in DELETE requests', async () => {
      const mockCsrfToken = 'csrf-token-delete-xyz';
      AuthContext.getCsrfToken.mockReturnValue(mockCsrfToken);

      const mockResponse = {
        ok: true,
        status: 204,
      };

      TokenRefreshInterceptor.fetchWithTokenRefresh.mockResolvedValue(mockResponse);

      await apiRequest('/api/v1/test/123', {
        method: 'DELETE',
      });

      expect(TokenRefreshInterceptor.fetchWithTokenRefresh).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-CSRF-Token': mockCsrfToken,
          }),
        })
      );
    });

    it('should NOT include X-CSRF-Token header in GET requests', async () => {
      AuthContext.getCsrfToken.mockReturnValue('should-not-be-included');

      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      };

      TokenRefreshInterceptor.fetchWithTokenRefresh.mockResolvedValue(mockResponse);

      await apiRequest('/api/v1/test', {
        method: 'GET',
      });

      const callArgs = TokenRefreshInterceptor.fetchWithTokenRefresh.mock.calls[0][1];
      expect(callArgs.headers['X-CSRF-Token']).toBeUndefined();
    });

    it('should handle case-insensitive method names', async () => {
      const mockCsrfToken = 'csrf-token-lowercase';
      AuthContext.getCsrfToken.mockReturnValue(mockCsrfToken);

      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      };

      TokenRefreshInterceptor.fetchWithTokenRefresh.mockResolvedValue(mockResponse);

      await apiRequest('/api/v1/test', {
        method: 'post', // lowercase
        body: JSON.stringify({ test: true }),
      });

      expect(TokenRefreshInterceptor.fetchWithTokenRefresh).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-CSRF-Token': mockCsrfToken,
          }),
        })
      );
    });

    it('should warn when CSRF token is missing for POST request', async () => {
      AuthContext.getCsrfToken.mockReturnValue(null);

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      };

      TokenRefreshInterceptor.fetchWithTokenRefresh.mockResolvedValue(mockResponse);

      await apiRequest('/api/v1/test', {
        method: 'POST',
        body: JSON.stringify({ test: true }),
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('CSRF token missing for POST')
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('HTTP 403 CSRF Validation Failed', () => {
    beforeEach(() => {
      // Mock window.location.href
      delete window.location;
      window.location = { href: '' };

      // Mock localStorage
      global.localStorage = {
        removeItem: vi.fn(),
      };
    });

    it('should handle CSRF validation failure (403 with error_code)', async () => {
      AuthContext.getCsrfToken.mockReturnValue('invalid-token');

      const mockResponse = {
        ok: false,
        status: 403,
        json: async () => ({
          detail: 'CSRF token missing or invalid',
          error_code: 'CSRF_VALIDATION_FAILED',
        }),
      };

      TokenRefreshInterceptor.fetchWithTokenRefresh.mockResolvedValue(mockResponse);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(
        apiRequest('/api/v1/test', {
          method: 'POST',
          body: JSON.stringify({ test: true }),
        })
      ).rejects.toThrow('CSRF validation failed. Please log in again.');

      // Should clear user from localStorage
      expect(localStorage.removeItem).toHaveBeenCalledWith('user');

      // Should redirect to login
      expect(window.location.href).toBe('/login');

      consoleErrorSpy.mockRestore();
    });

    it('should NOT handle regular 403 errors as CSRF errors', async () => {
      AuthContext.getCsrfToken.mockReturnValue('valid-token');

      const mockResponse = {
        ok: false,
        status: 403,
        json: async () => ({
          detail: 'Permission denied',
          error_code: 'PERMISSION_DENIED',
        }),
      };

      TokenRefreshInterceptor.fetchWithTokenRefresh.mockResolvedValue(mockResponse);

      await expect(
        apiRequest('/api/v1/test', {
          method: 'POST',
          body: JSON.stringify({ test: true }),
        })
      ).rejects.toThrow('Permission denied');

      // Should NOT redirect to login for non-CSRF 403 errors
      expect(window.location.href).not.toBe('/login');
    });
  });

  describe('credentials: include', () => {
    it('should always include credentials for httpOnly cookies', async () => {
      AuthContext.getCsrfToken.mockReturnValue('token-123');

      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      };

      TokenRefreshInterceptor.fetchWithTokenRefresh.mockResolvedValue(mockResponse);

      await apiRequest('/api/v1/test', {
        method: 'POST',
        body: JSON.stringify({ test: true }),
      });

      expect(TokenRefreshInterceptor.fetchWithTokenRefresh).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          credentials: 'include',
        })
      );
    });
  });

  describe('Response handling', () => {
    it('should return null for 204 No Content responses', async () => {
      AuthContext.getCsrfToken.mockReturnValue('token-123');

      const mockResponse = {
        ok: true,
        status: 204,
      };

      TokenRefreshInterceptor.fetchWithTokenRefresh.mockResolvedValue(mockResponse);

      const result = await apiRequest('/api/v1/test/123', {
        method: 'DELETE',
      });

      expect(result).toBeNull();
    });

    it('should parse JSON for successful responses', async () => {
      AuthContext.getCsrfToken.mockReturnValue('token-123');

      const mockData = { id: '123', name: 'Test' };
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => mockData,
      };

      TokenRefreshInterceptor.fetchWithTokenRefresh.mockResolvedValue(mockResponse);

      const result = await apiRequest('/api/v1/test', {
        method: 'GET',
      });

      expect(result).toEqual(mockData);
    });
  });
});
