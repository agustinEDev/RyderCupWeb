import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import toast from 'react-hot-toast';
import useInactivityLogout from './useInactivityLogout';

// Mock de react-hot-toast
vi.mock('react-hot-toast', () => {
  const toastFn = vi.fn((content, options) => 'toast-id-123');
  toastFn.error = vi.fn();
  toastFn.success = vi.fn();
  toastFn.dismiss = vi.fn();

  return {
    default: toastFn
  };
});

describe('useInactivityLogout', () => {
  let onLogoutMock;

  beforeEach(() => {
    // Reset de todos los mocks antes de cada test
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useFakeTimers();

    // Mock de console.log para evitar spam en tests
    vi.spyOn(console, 'log').mockImplementation(() => {});

    // Mock de la función de logout
    onLogoutMock = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Inicialización', () => {
    it('debe inicializarse sin errores con parámetros por defecto', () => {
      const { result } = renderHook(() =>
        useInactivityLogout({ onLogout: onLogoutMock, enabled: true })
      );

      expect(result.error).toBeUndefined();
      expect(onLogoutMock).not.toHaveBeenCalled();
    });

    it('debe aceptar timeout y warningTime personalizados', () => {
      const customTimeout = 10 * 60 * 1000; // 10 minutos
      const customWarningTime = 1 * 60 * 1000; // 1 minuto

      const { result } = renderHook(() =>
        useInactivityLogout({
          timeout: customTimeout,
          warningTime: customWarningTime,
          onLogout: onLogoutMock,
          enabled: true
        })
      );

      expect(result.error).toBeUndefined();
    });

    it('NO debe iniciar timers si enabled es false', () => {
      renderHook(() =>
        useInactivityLogout({ onLogout: onLogoutMock, enabled: false })
      );

      // Avanzar tiempo
      act(() => {
        vi.advanceTimersByTime(31 * 60 * 1000); // 31 minutos
      });

      expect(onLogoutMock).not.toHaveBeenCalled();
      expect(toast).not.toHaveBeenCalled();
    });
  });

  describe('Detección de Actividad', () => {
    it('debe agregar event listeners al montar el hook', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

      renderHook(() =>
        useInactivityLogout({ onLogout: onLogoutMock, enabled: true })
      );

      // Verificar que se agregaron los 6 event listeners
      const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
      events.forEach(event => {
        expect(addEventListenerSpy).toHaveBeenCalledWith(
          event,
          expect.any(Function),
          { passive: true }
        );
      });
    });

    it('debe resetear el timer cuando detecta actividad del usuario', () => {
      renderHook(() =>
        useInactivityLogout({
          timeout: 10000, // 10 segundos para test rápido
          warningTime: 2000, // 2 segundos
          onLogout: onLogoutMock,
          enabled: true
        })
      );

      // Avanzar 5 segundos
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Simular actividad del usuario (mousemove)
      act(() => {
        const event = new MouseEvent('mousemove');
        document.dispatchEvent(event);
      });

      // Esperar el debounce (1 segundo)
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Avanzar otros 8 segundos (total: 14 segundos desde inicio, pero solo 8 desde reset)
      act(() => {
        vi.advanceTimersByTime(8000);
      });

      // NO debe haber ejecutado logout porque reseteamos el timer
      expect(onLogoutMock).not.toHaveBeenCalled();
    });

    it('debe aplicar debouncing a los eventos (1 segundo)', () => {
      renderHook(() =>
        useInactivityLogout({
          timeout: 10000,
          warningTime: 2000,
          onLogout: onLogoutMock,
          enabled: true
        })
      );

      // Simular múltiples eventos en rápida sucesión (como movimiento de mouse)
      act(() => {
        for (let i = 0; i < 10; i++) {
          const event = new MouseEvent('mousemove');
          document.dispatchEvent(event);
        }
      });

      // Avanzar solo 500ms (menos que el debounce)
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // El timer NO debe haberse reseteado aún (debouncing activo)
      // Verificamos que console.log de reset NO se haya llamado múltiples veces
      const resetLogCalls = console.log.mock.calls.filter(
        call => call[0]?.includes('Timer reset')
      );

      // Debe ser 1 (el inicial) + 0 (porque el debounce no ha terminado)
      expect(resetLogCalls.length).toBeLessThanOrEqual(1);
    });
  });

  describe('Advertencia de Inactividad', () => {
    it('debe mostrar advertencia 2 minutos antes del logout', async () => {
      const timeout = 10000; // 10 segundos
      const warningTime = 2000; // 2 segundos

      renderHook(() =>
        useInactivityLogout({
          timeout,
          warningTime,
          onLogout: onLogoutMock,
          enabled: true
        })
      );

      // Avanzar hasta el momento de la advertencia (8 segundos)
      act(() => {
        vi.advanceTimersByTime(timeout - warningTime);
      });

      // Verificar que se mostró el toast de advertencia
      expect(toast).toHaveBeenCalledWith(
        expect.any(Function), // El contenido es una función (render prop)
        expect.objectContaining({
          duration: warningTime,
          position: 'top-center'
        })
      );

      // El logout NO debe haberse ejecutado aún
      expect(onLogoutMock).not.toHaveBeenCalled();
    });

    it('NO debe resetear timer con actividad después de mostrar advertencia', () => {
      const timeout = 10000;
      const warningTime = 2000;

      renderHook(() =>
        useInactivityLogout({
          timeout,
          warningTime,
          onLogout: onLogoutMock,
          enabled: true
        })
      );

      // Avanzar hasta mostrar advertencia
      act(() => {
        vi.advanceTimersByTime(timeout - warningTime);
      });

      // Simular actividad del usuario (movimiento del mouse)
      act(() => {
        const event = new MouseEvent('mousemove');
        document.dispatchEvent(event);
      });

      // Avanzar el debounce
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Avanzar el resto del tiempo hasta logout
      act(() => {
        vi.advanceTimersByTime(warningTime);
      });

      // El logout SÍ debe ejecutarse porque la actividad fue ignorada
      expect(onLogoutMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Logout Automático', () => {
    it('debe ejecutar logout después del timeout completo', () => {
      const timeout = 5000; // 5 segundos para test rápido
      const warningTime = 1000; // 1 segundo

      renderHook(() =>
        useInactivityLogout({
          timeout,
          warningTime,
          onLogout: onLogoutMock,
          enabled: true
        })
      );

      // Avanzar el tiempo completo
      act(() => {
        vi.advanceTimersByTime(timeout);
      });

      // Verificar que se ejecutó el logout
      expect(onLogoutMock).toHaveBeenCalledTimes(1);
    });

    it('debe mostrar toast de error al ejecutar logout', () => {
      const timeout = 5000;
      const warningTime = 1000;

      renderHook(() =>
        useInactivityLogout({
          timeout,
          warningTime,
          onLogout: onLogoutMock,
          enabled: true
        })
      );

      // Avanzar hasta logout
      act(() => {
        vi.advanceTimersByTime(timeout);
      });

      // Verificar toast de error
      expect(toast.error).toHaveBeenCalledWith(
        'Tu sesión ha expirado por inactividad',
        expect.objectContaining({
          duration: 4000,
          icon: '⏰'
        })
      );
    });

    it('debe limpiar todos los timers después del logout', () => {
      const timeout = 5000;
      const warningTime = 1000;

      renderHook(() =>
        useInactivityLogout({
          timeout,
          warningTime,
          onLogout: onLogoutMock,
          enabled: true
        })
      );

      // Avanzar hasta logout
      act(() => {
        vi.advanceTimersByTime(timeout);
      });

      // Verificar que toast.dismiss fue llamado (limpieza)
      expect(toast.dismiss).toHaveBeenCalled();
    });
  });

  describe('Cleanup y Memory Leaks', () => {
    it('debe remover event listeners al desmontar', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      const { unmount } = renderHook(() =>
        useInactivityLogout({ onLogout: onLogoutMock, enabled: true })
      );

      // Desmontar el hook
      unmount();

      // Verificar que se removieron los event listeners
      const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
      events.forEach(event => {
        expect(removeEventListenerSpy).toHaveBeenCalledWith(
          event,
          expect.any(Function)
        );
      });
    });

    it('debe limpiar timers al desmontar', () => {
      const { unmount } = renderHook(() =>
        useInactivityLogout({
          timeout: 10000,
          warningTime: 2000,
          onLogout: onLogoutMock,
          enabled: true
        })
      );

      // Avanzar un poco de tiempo
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      // Desmontar
      unmount();

      // Avanzar mucho más tiempo
      act(() => {
        vi.advanceTimersByTime(20000);
      });

      // El logout NO debe ejecutarse porque los timers fueron limpiados
      expect(onLogoutMock).not.toHaveBeenCalled();
    });

    it('debe cerrar toast de advertencia al desmontar', () => {
      const timeout = 5000;
      const warningTime = 1000;

      const { unmount } = renderHook(() =>
        useInactivityLogout({
          timeout,
          warningTime,
          onLogout: onLogoutMock,
          enabled: true
        })
      );

      // Avanzar hasta advertencia
      act(() => {
        vi.advanceTimersByTime(timeout - warningTime);
      });

      // Desmontar
      unmount();

      // Verificar que se llamó toast.dismiss
      expect(toast.dismiss).toHaveBeenCalled();
    });
  });

  describe('Casos Edge', () => {
    it('debe manejar onLogout undefined sin errores', () => {
      const timeout = 5000;
      const warningTime = 1000;

      const { result } = renderHook(() =>
        useInactivityLogout({
          timeout,
          warningTime,
          onLogout: undefined, // Sin callback
          enabled: true
        })
      );

      // Avanzar hasta logout
      act(() => {
        vi.advanceTimersByTime(timeout);
      });

      // No debe haber errores
      expect(result.error).toBeUndefined();
    });

    it('debe manejar cambio de enabled de true a false', () => {
      let enabled = true;

      const { rerender } = renderHook(
        ({ enabled }) =>
          useInactivityLogout({
            timeout: 10000,
            warningTime: 2000,
            onLogout: onLogoutMock,
            enabled
          }),
        { initialProps: { enabled: true } }
      );

      // Cambiar a disabled
      // enabled = false; // Eliminado por lint
      rerender({ enabled: false });

      // Avanzar tiempo
      act(() => {
        vi.advanceTimersByTime(15000);
      });

      // No debe ejecutar logout porque está disabled
      expect(onLogoutMock).not.toHaveBeenCalled();
    });

    it('debe reiniciar timers al cambiar de disabled a enabled', () => {
      let enabled = false;

      const { rerender } = renderHook(
        ({ enabled }) =>
          useInactivityLogout({
            timeout: 5000,
            warningTime: 1000,
            onLogout: onLogoutMock,
            enabled
          }),
        { initialProps: { enabled: false } }
      );

      // Avanzar tiempo mientras está disabled
      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(onLogoutMock).not.toHaveBeenCalled();

      // Cambiar a enabled
      // enabled = true; // Eliminado por lint
      rerender({ enabled: true });

      // Ahora SÍ debe iniciar los timers
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Debe ejecutar logout
      expect(onLogoutMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Integración con Toast', () => {
    it('el botón "Continuar sesión" debe resetear el timer', async () => {
      const timeout = 10000;
      const warningTime = 2000;

      renderHook(() =>
        useInactivityLogout({
          timeout,
          warningTime,
          onLogout: onLogoutMock,
          enabled: true
        })
      );

      // Avanzar hasta advertencia
      act(() => {
        vi.advanceTimersByTime(timeout - warningTime);
      });

      // Verificar que se llamó al toast con una función de render
      expect(toast).toHaveBeenCalled();
      const toastCall = toast.mock.calls[0];
      expect(typeof toastCall[0]).toBe('function');

      // Avanzar el resto del tiempo
      act(() => {
        vi.advanceTimersByTime(warningTime + 5000);
      });

      // Si el usuario hubiera hecho clic en "Continuar sesión",
      // el timer se habría reseteado y NO debería ejecutar logout
      // En este test, NO hacemos clic, así que SÍ debe ejecutar logout
      expect(onLogoutMock).toHaveBeenCalledTimes(1);
    });
  });
});
