/**
 * Device Revocation Monitor Hook
 *
 * Makes sure a revoked device finds out, even when the user only reads screens.
 * The backend checks the token's device on every request (FE #1046 / BE #737):
 * if it was revoked, any request gets a 401 «Dispositivo revocado», which the
 * token refresh interceptor turns into handleDeviceRevocationLogout(). This hook
 * only makes sure such a request happens. It does NOT read the device list to
 * decide: a list without the current device was a lost cookie, not a revocation.
 *
 * Detection triggers:
 * 1. Page navigation (React Router location change)
 * 2. Tab becomes active (user switches back from another app)
 * 3. Fallback polling every 5 minutes (for edge cases)
 *
 * On revocation, the interceptor calls handleDeviceRevocationLogout(), which:
 * - Clears localStorage and Sentry context
 * - Shows translated toast message
 * - Redirects to /login
 *
 * @see src/utils/deviceRevocationLogout.js
 */

import { useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router';
import { apiRequest } from '../services/api';

const FALLBACK_INTERVAL = 5 * 60 * 1000; // 5 minutes
const THROTTLE_INTERVAL = 5 * 1000; // 5 seconds (prevent spam)

/**
 * Hook to monitor device revocation status
 * @param {Object} options - Configuration options
 * @param {boolean} options.enabled - Whether monitoring is enabled (default: true)
 * @returns {Object} - Object with checkDeviceStatus function for manual checks
 */
export const useDeviceRevocationMonitor = ({ enabled = true } = {}) => {
  const location = useLocation();
  // Initialize to 0 to allow first check to run immediately
  const lastCheckRef = useRef(0);
  const fallbackTimerRef = useRef(null);

  /**
   * Make an authenticated request so the backend can say the device was revoked
   * - Calls GET /api/v1/users/me/devices; its 401 is handled by the interceptor
   *
   * Throttling: Max 1 check every 5 seconds
   */
  const checkDeviceStatus = useCallback(async () => {
    if (!enabled) {
      return;
    }

    // Throttle: Don't check if already checked in last 5 seconds
    const now = Date.now();
    const timeSinceLastCheck = now - lastCheckRef.current;

    if (timeSinceLastCheck < THROTTLE_INTERVAL) {
      return;
    }

    try {
      lastCheckRef.current = now;

      const response = await apiRequest('/api/v1/users/me/devices');

      // Validate API response shape before processing
      if (!response || !Array.isArray(response.devices)) {
        // Malformed response - log for debugging but don't logout. Solo la
        // forma: Sentry recoge la consola como migas, y la respuesta trae los
        // dispositivos del usuario (25 oct 2026)
        console.warn('[DeviceMonitor] Malformed API response:', {
          type: response === null ? 'null' : typeof response,
          keys: response && typeof response === 'object' ? Object.keys(response) : [],
        });
        return;
      }

      // Que la lista no traiga el actual YA NO es una revocación (FE #1046): pasaba
      // al perderse la cookie del dispositivo y echaba con un «revocado» falso. La
      // revocación de verdad llega como 401 «Dispositivo revocado» del backend, que
      // comprueba el dispositivo del token en cada petición, y la trata el
      // interceptor. Esta llamada periódica basta para que llegue
    } catch {
      // If 401, the token refresh interceptor will handle it
      // If refresh token was also revoked, isDeviceRevoked() will detect it
      // For other errors, silently fail (don't interrupt user experience)
    }
  }, [enabled]);

  // ============================================
  // 1️⃣ NAVIGATION TRIGGER
  // ============================================
  // Check when user navigates to another page
  useEffect(() => {
    if (!enabled) return;

    checkDeviceStatus();
  }, [location.pathname, checkDeviceStatus, enabled]);

  // ============================================
  // 2️⃣ TAB VISIBILITY TRIGGER
  // ============================================
  // Check when tab becomes active (user was in another app/tab)
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkDeviceStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkDeviceStatus, enabled]);

  // ============================================
  // 3️⃣ FALLBACK POLLING
  // ============================================
  // Check every 5 minutes as fallback (for edge cases)
  // Example: User is reading a long article without navigating or switching tabs
  useEffect(() => {
    if (!enabled) {
      // Clear timer if monitoring is disabled
      if (fallbackTimerRef.current) {
        clearInterval(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
      return;
    }

    fallbackTimerRef.current = setInterval(() => {
      checkDeviceStatus();
    }, FALLBACK_INTERVAL);

    // Cleanup on unmount
    return () => {
      if (fallbackTimerRef.current) {
        clearInterval(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };
  }, [checkDeviceStatus, enabled]);

  // Return checkDeviceStatus for manual checks (optional)
  return {
    checkDeviceStatus,
  };
};

export default useDeviceRevocationMonitor;
