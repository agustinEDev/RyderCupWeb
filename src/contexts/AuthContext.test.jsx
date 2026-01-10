/**
 * Tests for AuthContext
 * v1.13.0: CSRF Protection
 */

import { useEffect } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider } from './AuthContext';
import { useAuthContext } from '../hooks/useAuthContext';
import { getCsrfToken, setCsrfTokenGlobal } from './csrfTokenSync';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    setCsrfTokenGlobal(null); // Clear global token
  });

  describe('useAuthContext', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAuthContext());
      }).toThrow('useAuthContext must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });

    it('should provide initial state with null user and csrfToken', () => {
      const { result } = renderHook(() => useAuthContext(), {
        wrapper: AuthProvider,
      });

      expect(result.current.user).toBeNull();
      expect(result.current.csrfToken).toBeNull();
      expect(result.current.isInitialized).toBe(true);
    });

    it('should restore user from localStorage on mount', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      localStorage.setItem('user', JSON.stringify(mockUser));

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      expect(result.current.user).toEqual(mockUser);
    });

    it('should handle corrupted localStorage data gracefully', () => {
      localStorage.setItem('user', 'invalid-json{');

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: AuthProvider,
      });

      expect(result.current.user).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();

      consoleSpy.mockRestore();
    });
  });

  describe('setUser', () => {
    it('should update user state and localStorage', () => {
      const { result } = renderHook(() => useAuthContext(), {
        wrapper: AuthProvider,
      });

      const mockUser = {
        id: '456',
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
      };

      act(() => {
        result.current.setUser(mockUser);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(JSON.parse(localStorage.getItem('user'))).toEqual(mockUser);
    });

    it('should clear user when set to null', () => {
      const { result } = renderHook(() => useAuthContext(), {
        wrapper: AuthProvider,
      });

      const mockUser = { id: '789', email: 'test@test.com' };

      act(() => {
        result.current.setUser(mockUser);
      });

      expect(result.current.user).toEqual(mockUser);

      act(() => {
        result.current.setUser(null);
      });

      expect(result.current.user).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });
  });

  describe('updateCsrfToken', () => {
    it('should update csrfToken state', () => {
      const { result } = renderHook(() => useAuthContext(), {
        wrapper: AuthProvider,
      });

      const mockToken = 'csrf-token-123-abc';

      act(() => {
        result.current.updateCsrfToken(mockToken);
      });

      expect(result.current.csrfToken).toBe(mockToken);
    });

    it('should NOT store csrfToken in localStorage (security)', () => {
      const { result } = renderHook(() => useAuthContext(), {
        wrapper: AuthProvider,
      });

      act(() => {
        result.current.updateCsrfToken('secret-csrf-token');
      });

      expect(localStorage.getItem('csrf_token')).toBeNull();
      expect(localStorage.getItem('csrfToken')).toBeNull();
    });
  });

  describe('clearAuth', () => {
    it('should clear all auth state', () => {
      const { result } = renderHook(() => useAuthContext(), {
        wrapper: AuthProvider,
      });

      const mockUser = { id: '999', email: 'clear@test.com' };
      const mockToken = 'csrf-to-clear';

      act(() => {
        result.current.setUser(mockUser);
        result.current.updateCsrfToken(mockToken);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.csrfToken).toBe(mockToken);

      act(() => {
        result.current.clearAuth();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.csrfToken).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });

    it('should clear legacy access_token from localStorage', () => {
      localStorage.setItem('access_token', 'legacy-token-123');

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: AuthProvider,
      });

      act(() => {
        result.current.clearAuth();
      });

      expect(localStorage.getItem('access_token')).toBeNull();
    });
  });

  describe('getCsrfToken and setCsrfTokenGlobal', () => {
    it('should return null initially', () => {
      expect(getCsrfToken()).toBeNull();
    });

    it('should set and get csrf token globally', () => {
      const token = 'global-csrf-123';

      setCsrfTokenGlobal(token);

      expect(getCsrfToken()).toBe(token);
    });

    it('should update global token when context updates', async () => {
      const { result } = renderHook(() => useAuthContext(), {
        wrapper: ({ children }) => (
          <AuthProvider>
            {/* Simulate the sync wrapper */}
            <TokenSyncComponent>{children}</TokenSyncComponent>
          </AuthProvider>
        ),
      });

      const token = 'synced-token-456';

      act(() => {
        result.current.updateCsrfToken(token);
      });

      // Wait for effect to run
      await waitFor(() => {
        expect(getCsrfToken()).toBe(token);
      });
    });
  });
});

// Helper component to simulate CsrfTokenSyncWrapper
function TokenSyncComponent({ children }) {
  const { csrfToken } = useAuthContext();

  // Sync to global on change
  useEffect(() => {
    setCsrfTokenGlobal(csrfToken);
  }, [csrfToken]);

  return children;
}
