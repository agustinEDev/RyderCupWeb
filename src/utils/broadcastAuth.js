/**
 * Broadcast Channel Utility for Multi-Tab Authentication Synchronization
 *
 * Provides functionality to synchronize authentication state across multiple browser tabs/windows
 * using the native Broadcast Channel API.
 *
 * Use Cases:
 * - When user logs out in one tab, all other tabs logout automatically
 * - When user logs in in one tab, all other tabs receive the event (optional, for future)
 *
 * Browser Compatibility: ~96% (Chrome 54+, Firefox 38+, Edge 79+, Safari 15.4+)
 *
 * @module broadcastAuth
 */

const CHANNEL_NAME = 'rydercup-auth';
const EVENTS = {
  LOGOUT: 'LOGOUT',
  LOGIN: 'LOGIN', // Para uso futuro
};

/**
 * Singleton instance of BroadcastChannel
 * @type {BroadcastChannel|null}
 */
let authChannel = null;

/**
 * Flag to track if browser supports Broadcast Channel API
 * @type {boolean}
 */
const isBroadcastSupported = typeof BroadcastChannel !== 'undefined';

/**
 * Initialize the Broadcast Channel for auth events
 * Creates a singleton instance to avoid multiple channels
 *
 * @returns {BroadcastChannel|null} The broadcast channel instance or null if not supported
 */
const initBroadcastChannel = () => {
  if (!isBroadcastSupported) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ [BroadcastAuth] BroadcastChannel API not supported in this browser. Multi-tab logout will not work.');
    }
    return null;
  }

  // Si ya existe, no crear uno nuevo (singleton pattern)
  if (authChannel) {
    return authChannel;
  }

  try {
    authChannel = new BroadcastChannel(CHANNEL_NAME);

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ [BroadcastAuth] Broadcast channel initialized:', CHANNEL_NAME);
    }

    return authChannel;
  } catch (error) {
    console.error('❌ [BroadcastAuth] Error initializing broadcast channel:', error);
    return null;
  }
};

/**
 * Broadcast a logout event to all other tabs
 * This should be called when the user explicitly logs out in one tab
 *
 * @example
 * // In HeaderAuth.jsx handleLogout():
 * import { broadcastLogout } from '../utils/broadcastAuth';
 *
 * const handleLogout = async () => {
 *   broadcastLogout(); // Notify other tabs
 *   // ... rest of logout logic
 * };
 */
export const broadcastLogout = () => {
  const channel = initBroadcastChannel();

  if (!channel) {
    // Si no hay soporte, no hacer nada (silent fail)
    return;
  }

  try {
    channel.postMessage({
      type: EVENTS.LOGOUT,
      timestamp: Date.now(),
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('📡 [BroadcastAuth] Logout event broadcasted to other tabs');
    }
  } catch (error) {
    console.error('❌ [BroadcastAuth] Error broadcasting logout:', error);
  }
};

/**
 * Broadcast a login event to all other tabs (optional, for future use)
 * This could be used to notify other tabs when a user logs in
 *
 * @param {Object} userData - User data to share (optional)
 *
 * @example
 * // In Login.jsx after successful login:
 * import { broadcastLogin } from '../utils/broadcastAuth';
 *
 * const handleLogin = async () => {
 *   // ... login logic
 *   broadcastLogin({ email: user.email }); // Notify other tabs
 * };
 */
export const broadcastLogin = (userData = null) => {
  const channel = initBroadcastChannel();

  if (!channel) {
    return;
  }

  try {
    channel.postMessage({
      type: EVENTS.LOGIN,
      timestamp: Date.now(),
      data: userData,
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('📡 [BroadcastAuth] Login event broadcasted to other tabs');
    }
  } catch (error) {
    console.error('❌ [BroadcastAuth] Error broadcasting login:', error);
  }
};

/**
 * Listen for authentication events from other tabs
 * Sets up a message listener on the broadcast channel
 *
 * @param {Function} callback - Callback function to handle auth events
 *   Receives: { type: 'LOGOUT' | 'LOGIN', timestamp: number, data?: any }
 * @returns {Function} Cleanup function to remove the listener
 *
 * @example
 * // In App.jsx:
 * import { onAuthEvent } from './utils/broadcastAuth';
 *
 * useEffect(() => {
 *   const cleanup = onAuthEvent((event) => {
 *     if (event.type === 'LOGOUT') {
 *       // Execute logout in this tab
 *       handleLocalLogout();
 *     }
 *   });
 *
 *   return cleanup; // Cleanup on unmount
 * }, []);
 */
export const onAuthEvent = (callback) => {
  const channel = initBroadcastChannel();

  if (!channel) {
    // Si no hay soporte, retornar función vacía para evitar errores
    return () => {};
  }

  if (typeof callback !== 'function') {
    console.error('❌ [BroadcastAuth] onAuthEvent requires a callback function');
    return () => {};
  }

  /**
   * Handler interno que envuelve el callback del usuario
   * @param {MessageEvent} event - Evento del broadcast channel
   */
  const messageHandler = (event) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('📨 [BroadcastAuth] Received event from other tab:', event.data);
    }

    // Validar que el mensaje tiene la estructura correcta
    if (event.data && event.data.type) {
      callback(event.data);
    }
  };

  // Agregar listener
  channel.addEventListener('message', messageHandler);

  if (process.env.NODE_ENV === 'development') {
    console.log('👂 [BroadcastAuth] Listening for auth events from other tabs');
  }

  // Retornar función de limpieza
  return () => {
    if (channel) {
      channel.removeEventListener('message', messageHandler);

      if (process.env.NODE_ENV === 'development') {
        console.log('🔇 [BroadcastAuth] Stopped listening for auth events');
      }
    }
  };
};

/**
 * Close the broadcast channel and cleanup resources
 * Should be called when the application is unmounting or user is logging out
 *
 * Note: In most cases you don't need to call this manually, as the browser
 * automatically closes the channel when the tab/window is closed.
 *
 * @example
 * // Optional cleanup on app unmount
 * import { closeBroadcastChannel } from './utils/broadcastAuth';
 *
 * useEffect(() => {
 *   return () => {
 *     closeBroadcastChannel();
 *   };
 * }, []);
 */
export const closeBroadcastChannel = () => {
  if (authChannel) {
    try {
      authChannel.close();
      authChannel = null;

      if (process.env.NODE_ENV === 'development') {
        console.log('🔌 [BroadcastAuth] Broadcast channel closed');
      }
    } catch (error) {
      console.error('❌ [BroadcastAuth] Error closing broadcast channel:', error);
    }
  }
};

/**
 * Check if Broadcast Channel API is supported in current browser
 *
 * @returns {boolean} True if supported, false otherwise
 *
 * @example
 * import { isBroadcastChannelSupported } from './utils/broadcastAuth';
 *
 * if (isBroadcastChannelSupported()) {
 *   console.log('Multi-tab sync is available');
 * } else {
 *   console.log('Multi-tab sync not available in this browser');
 * }
 */
export const isBroadcastChannelSupported = () => {
  return isBroadcastSupported;
};

// Exportar constantes de eventos para uso externo
export { EVENTS };
