/**
 * Broadcast Channel Utility for Multi-Tab Authentication Synchronization
 *
 * Provides functionality to synchronize authentication state across multiple browser tabs/windows
 * using the native Broadcast Channel API.
 *
 * Use Cases:
 * - When user logs out in one tab, all other tabs logout automatically
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
 * Quien sale avisa PRIMERO, antes de esperar al servidor: así las demás se
 * enteran aunque esta pestaña se cierre durante la espera. La que recibe el
 * aviso NO vuelve a avisar ni llama al backend, y sale recargando a `/login`
 * con la navegación pedida antes de limpiar (`useLogout`, opción
 * `desdeOtraPestana`): avisar de vuelta era un eco sin fin, y limpiar antes de
 * navegar la hacía volver a preguntar por la sesión (FE #865).
 *
 * @example
 * // Desde useLogout (no llamarlo a mano en cada pantalla, FE #531):
 * const { logout } = useLogout();
 * await logout({ recargarEn: '/' });
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

// Exportar constantes de eventos para uso externo
export { EVENTS };
