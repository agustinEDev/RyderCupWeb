import { useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import customToast from '../utils/toast';

/**
 * Hook personalizado para detectar inactividad del usuario y ejecutar logout automático
 *
 * @param {Object} options - Opciones de configuración
 * @param {number} options.timeout - Tiempo de inactividad en milisegundos (default: 30 minutos)
 * @param {number} options.warningTime - Tiempo antes del logout para mostrar advertencia en ms (default: 2 minutos)
 * @param {Function} options.onLogout - Callback que se ejecuta al hacer logout
 * @param {boolean} options.enabled - Si el hook está activo o no (default: true)
 *
 * @example
 * useInactivityLogout({
 *   timeout: 1800000, // 30 minutos
 *   warningTime: 120000, // 2 minutos
 *   onLogout: () => { logout() },
 *   enabled: isAuthenticated
 * });
 */
const useInactivityLogout = ({
  timeout = 30 * 60 * 1000, // 30 minutos por defecto
  warningTime = 2 * 60 * 1000, // 2 minutos por defecto
  onLogout,
  enabled = true
}) => {
  const { t } = useTranslation('auth');
  // Refs para mantener referencias a timers sin causar re-renders
  const logoutTimerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const warningToastIdRef = useRef(null);

  /**
   * Limpia todos los timers activos
   */
  const clearTimers = useCallback(() => {
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    // Cerrar toast de advertencia si existe
    if (warningToastIdRef.current) {
      customToast.dismiss(warningToastIdRef.current);
      warningToastIdRef.current = null;
    }
  }, []);

  /**
   * Ejecuta el logout y limpia los timers
   */
  const executeLogout = useCallback(() => {
    console.log('🚪 [InactivityLogout] Executing logout due to inactivity');
    clearTimers();

    // Mostrar toast informativo
    customToast.error(t('inactivity.sessionExpired'), {
      duration: 4000,
      icon: '⏰'
    });

    // Ejecutar callback de logout
    if (onLogout && typeof onLogout === 'function') {
      onLogout();
    }
  }, [onLogout, clearTimers, t]);

  /**
   * Muestra advertencia al usuario antes del logout
   */
  const showWarning = useCallback(() => {
    console.log('⚠️ [InactivityLogout] Showing inactivity warning');

    // Cerrar advertencia anterior si existe
    if (warningToastIdRef.current) {
      customToast.dismiss(warningToastIdRef.current);
    }

    // Mostrar toast con botón de continuar
    warningToastIdRef.current = toast(
      (toastRef) => (
        <div className="flex flex-col gap-2">
          <div className="flex items-start gap-2">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-semibold text-gray-900">
                {t('inactivity.sessionExpiring')}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {t('inactivity.sessionExpiringMessage')}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              customToast.dismiss(toastRef.id);
              resetTimer();
              customToast.success(t('inactivity.sessionRenewed'), { duration: 2000 });
            }}
            className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            {t('inactivity.continueSession')}
          </button>
        </div>
      ),
      {
        duration: warningTime, // El toast dura lo mismo que el tiempo de advertencia
        position: 'top-center',
        style: {
          minWidth: '320px',
          padding: '16px'
        }
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warningTime, t]);

  /**
   * Resetea los timers de inactividad (cuando hay actividad del usuario)
   */
  const resetTimer = useCallback(() => {
    // Limpiar timers anteriores
    clearTimers();

    if (!enabled) {
      return;
    }

    console.log('🔄 [InactivityLogout] Timer reset - user activity detected');

    // Calcular cuándo mostrar la advertencia
    const warningDelay = timeout - warningTime;

    // Programar advertencia
    warningTimerRef.current = setTimeout(() => {
      showWarning();
    }, warningDelay);

    // Programar logout
    logoutTimerRef.current = setTimeout(() => {
      executeLogout();
    }, timeout);
  }, [enabled, timeout, warningTime, showWarning, executeLogout, clearTimers]);

  /**
   * Manejador de eventos de actividad del usuario con debouncing
   */
  const handleActivity = useCallback(() => {
    // Debouncing simple: solo resetear si no hay timer de warning activo
    // Esto evita resetear el timer en cada pixel de movimiento del mouse
    if (!warningToastIdRef.current) {
      resetTimer();
    }
  }, [resetTimer]);

  // Effect principal: configurar event listeners
  useEffect(() => {
    if (!enabled) {
      clearTimers();
      return;
    }

    console.log('✅ [InactivityLogout] Hook enabled - monitoring user activity');

    // Eventos que consideramos como "actividad del usuario"
    const events = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click'
    ];

    // Iniciar el timer al montar
    resetTimer();

    // Agregar event listeners con debouncing
    let debounceTimeout;
    const debouncedHandler = () => {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(handleActivity, 1000); // 1 segundo de debounce
    };

    events.forEach(event => {
      document.addEventListener(event, debouncedHandler, { passive: true });
    });

    // Cleanup: remover listeners y limpiar timers
    return () => {
      console.log('🧹 [InactivityLogout] Cleaning up listeners and timers');

      events.forEach(event => {
        document.removeEventListener(event, debouncedHandler);
      });

      clearTimeout(debounceTimeout);
      clearTimers();
    };
  }, [enabled, resetTimer, handleActivity, clearTimers]);

  // No retornamos nada - este hook solo tiene side effects
};

export default useInactivityLogout;
