/**
 * Device Revocation Monitor Hook
 *
 * Monitors if the current device has been revoked from another browser/device.
 * Uses an event-driven approach with fallback polling for optimal performance.
 *
 * Detection triggers:
 * 1. Page navigation (React Router location change)
 * 2. Tab becomes active (user switches back from another app)
 * 3. Fallback polling every 5 minutes (for edge cases)
 *
 * When revocation is detected, calls handleDeviceRevocationLogout() which:
 * - Clears localStorage and Sentry context
 * - Shows translated toast message
 * - Redirects to /login
 *
 * @see src/utils/deviceRevocationLogout.js
 */

import { useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { handleDeviceRevocationLogout } from '../utils/deviceRevocationLogout';

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
  const lastCheckRef = useRef(Date.now());
  const fallbackTimerRef = useRef(null);

  /**
   * Check if current device is still active
   * - Calls GET /api/v1/users/me/devices
   * - Looks for device with is_current_device: true
   * - If not found, device was revoked → logout
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
      const devices = response?.devices || [];

      // Look for current device in the list
      const currentDevice = devices.find(d => d.is_current_device === true);

      if (!currentDevice) {
        // Device was revoked → logout immediately
        handleDeviceRevocationLogout();
      }
    } catch (error) {
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
