import { useEffect, useRef, useCallback } from 'react';
import { refreshAccessToken, getLastRefreshAt } from '../utils/tokenRefreshInterceptor';

/**
 * Vida util de la cookie del access token: 15 minutos.
 *
 * La fuente de verdad es `COOKIE_MAX_AGE = 900` en RyderCupAm
 * (`src/shared/infrastructure/security/cookie_handler.py`), NO la variable
 * `ACCESS_TOKEN_EXPIRE_MINUTES`: esa vale 15 por defecto pero los despliegues
 * la ponen a 60, y aun asi el navegador tira la cookie a los 15 minutos. Si se
 * sube este valor siguiendo la variable de entorno, el refresco proactivo deja
 * de dispararse a tiempo.
 */
export const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;

/** Margen con el que se refresca antes de que expire el token. */
export const REFRESH_BEFORE_MS = 1 * 60 * 1000;

/**
 * Momento del que parte el hook al montarse.
 *
 * Si ya ha habido un refresco en esta carga, se usa ese instante. Si no, la
 * edad del token es desconocida (la cookie es httpOnly), asi que se supone lo
 * peor -que esta a punto de expirar- en vez de darlo por recien emitido. Se
 * deja `refreshBefore` de margen para no lanzar la peticion en pleno arranque:
 * la primera comprobacion cae un minuto despues de cargar. A partir de ahi la
 * referencia es real, porque el refresco reactivo por 401 tambien se anota.
 */
const initialLastRefresh = (tokenTTL, refreshBefore) =>
  getLastRefreshAt() ?? Date.now() - tokenTTL + refreshBefore * 2;

/**
 * Hook for proactive token refresh based on user activity
 *
 * Problem solved:
 * - Access token expires every 15 minutes (see ACCESS_TOKEN_TTL_MS)
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
 * @param {number} options.tokenTTL - Token time-to-live in ms (default: ACCESS_TOKEN_TTL_MS)
 * @param {number} options.refreshBefore - Time before expiry to trigger refresh in ms (default: REFRESH_BEFORE_MS)
 * @param {boolean} options.enabled - Whether the hook is active (default: true)
 *
 * @example
 * useProactiveTokenRefresh({ enabled: isAuthenticated });
 */
const useProactiveTokenRefresh = ({
  tokenTTL = ACCESS_TOKEN_TTL_MS,
  refreshBefore = REFRESH_BEFORE_MS,
  enabled = true
} = {}) => {
  // Track when the token was last refreshed
  const lastRefreshRef = useRef(initialLastRefresh(tokenTTL, refreshBefore));

  // Track if a refresh is in progress
  const isRefreshingRef = useRef(false);

  // Track the refresh timer
  const refreshTimerRef = useRef(null);

  // Debounce timer for activity detection
  const activityDebounceRef = useRef(null);

  /**
   * Ultimo refresco conocido, teniendo en cuenta los que hace el camino
   * reactivo (un 401 dentro de `fetchWithTokenRefresh`) despues de montar: solo
   * pueden dejar el token MAS fresco de lo que cree el hook, es decir provocar
   * un refresco antes de tiempo. Releerlo aqui lo evita.
   */
  const syncLastRefresh = useCallback(() => {
    const recorded = getLastRefreshAt();
    if (recorded !== null && recorded > lastRefreshRef.current) {
      lastRefreshRef.current = recorded;
    }
    return lastRefreshRef.current;
  }, []);

  /**
   * Attempt to refresh the token proactively
   */
  const doProactiveRefresh = useCallback(async () => {
    if (!enabled || isRefreshingRef.current) {
      return;
    }

    const now = Date.now();
    const timeSinceLastRefresh = now - syncLastRefresh();
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
  }, [enabled, tokenTTL, refreshBefore, syncLastRefresh]);

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
    const timeSinceLastRefresh = now - syncLastRefresh();
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

  }, [enabled, tokenTTL, refreshBefore, doProactiveRefresh, syncLastRefresh]);

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
