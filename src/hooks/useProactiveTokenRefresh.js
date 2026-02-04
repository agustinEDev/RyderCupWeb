import { useEffect, useRef, useCallback } from 'react';
import { refreshAccessToken } from '../utils/tokenRefreshInterceptor';

/**
 * Hook for proactive token refresh based on user activity
 *
 * Problem solved:
 * - Access token expires every 5 minutes (OWASP security)
 * - Token only refreshes on 401 response (reactive)
 * - If user is active (filling forms) but not making API calls, token expires silently
 * - When user finally makes a request, token is expired → potential logout
 *
 * Solution:
 * - Monitor user activity (keydown, mousemove, click, scroll, touch)
 * - If user is active AND token is close to expiring → refresh proactively
 * - User never sees "session expired" while actively using the app
 *
 * @param {Object} options - Configuration options
 * @param {number} options.tokenTTL - Token time-to-live in ms (default: 5 minutes)
 * @param {number} options.refreshBefore - Time before expiry to trigger refresh in ms (default: 1 minute)
 * @param {boolean} options.enabled - Whether the hook is active (default: true)
 *
 * @example
 * useProactiveTokenRefresh({
 *   tokenTTL: 5 * 60 * 1000,      // 5 minutes
 *   refreshBefore: 1 * 60 * 1000, // Refresh 1 minute before expiry
 *   enabled: isAuthenticated
 * });
 */
const useProactiveTokenRefresh = ({
  tokenTTL = 5 * 60 * 1000,        // 5 minutes (OWASP compliant)
  refreshBefore = 1 * 60 * 1000,   // Refresh 1 minute before expiry
  enabled = true
} = {}) => {
  // Track when the token was last refreshed
  const lastRefreshRef = useRef(Date.now());

  // Track if a refresh is in progress
  const isRefreshingRef = useRef(false);

  // Track the refresh timer
  const refreshTimerRef = useRef(null);

  // Debounce timer for activity detection
  const activityDebounceRef = useRef(null);

  /**
   * Attempt to refresh the token proactively
   */
  const doProactiveRefresh = useCallback(async () => {
    if (!enabled || isRefreshingRef.current) {
      return;
    }

    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshRef.current;
    const timeUntilExpiry = tokenTTL - timeSinceLastRefresh;

    // Only refresh if we're within the refresh window
    if (timeUntilExpiry > refreshBefore) {
      return;
    }

    console.log('🔄 [ProactiveRefresh] Token expiring soon, refreshing proactively...');

    isRefreshingRef.current = true;

    try {
      await refreshAccessToken();
      lastRefreshRef.current = Date.now();
      console.log('✅ [ProactiveRefresh] Token refreshed successfully');
    } catch (error) {
      // If refresh fails, let the normal 401 handling take over
      console.warn('⚠️ [ProactiveRefresh] Proactive refresh failed:', error.message);
    } finally {
      isRefreshingRef.current = false;
    }
  }, [enabled, tokenTTL, refreshBefore]);

  /**
   * Schedule a refresh check based on token TTL
   */
  const scheduleRefreshCheck = useCallback(() => {
    if (!enabled) return;

    // Clear any existing timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshRef.current;
    const timeUntilRefreshWindow = (tokenTTL - refreshBefore) - timeSinceLastRefresh;

    // If we're already in the refresh window, check now
    if (timeUntilRefreshWindow <= 0) {
      doProactiveRefresh();
      return;
    }

    // Schedule check for when we enter the refresh window
    refreshTimerRef.current = setTimeout(() => {
      doProactiveRefresh();
    }, timeUntilRefreshWindow);

  }, [enabled, tokenTTL, refreshBefore, doProactiveRefresh]);

  /**
   * Handle user activity - schedule refresh check with debouncing
   */
  const handleActivity = useCallback(() => {
    if (!enabled) return;

    // Debounce activity detection (500ms)
    if (activityDebounceRef.current) {
      clearTimeout(activityDebounceRef.current);
    }

    activityDebounceRef.current = setTimeout(() => {
      scheduleRefreshCheck();
    }, 500);
  }, [enabled, scheduleRefreshCheck]);

  /**
   * Reset the last refresh time (called when token is refreshed externally)
   */
  const resetRefreshTime = useCallback(() => {
    lastRefreshRef.current = Date.now();
    scheduleRefreshCheck();
  }, [scheduleRefreshCheck]);

  // Main effect: set up activity listeners
  useEffect(() => {
    if (!enabled) {
      // Clean up timers when disabled
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      if (activityDebounceRef.current) {
        clearTimeout(activityDebounceRef.current);
        activityDebounceRef.current = null;
      }
      return;
    }

    console.log('✅ [ProactiveRefresh] Hook enabled - monitoring activity for proactive token refresh');

    // Events that indicate user activity
    const events = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click',
      'focus'
    ];

    // Initialize: schedule first refresh check
    scheduleRefreshCheck();

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Also listen for visibility change (user returns to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // User returned to tab - check if refresh needed
        handleActivity();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      console.log('🧹 [ProactiveRefresh] Cleaning up listeners and timers');

      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      if (activityDebounceRef.current) {
        clearTimeout(activityDebounceRef.current);
      }
    };
  }, [enabled, handleActivity, scheduleRefreshCheck]);

  // Return utility function for external use
  return {
    resetRefreshTime
  };
};

export default useProactiveTokenRefresh;
