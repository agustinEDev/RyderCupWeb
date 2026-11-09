/**
 * Unit tests for Device Revocation Logout utilities
 * v2.0.4: Updated tests for separated revocation vs expiration handling
 * @see deviceRevocationLogout.js
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isDeviceRevoked,
  isSessionExpired,
  requiresReAuthentication,
  handleDeviceRevocationLogout,
  handleSessionExpiredLogout,
  clearDeviceRevocationFlag,
} from './deviceRevocationLogout';
// Lo que se borra de la cuenta lo registra la composition root (main.jsx lo carga el primero)
import '../composition/limpiezaAlCerrarLaSesion';
import { olvidaElCierreDeEstaCarga } from './cierreDeEstaCarga';
import { anotaLaCuentaDeEstaPestana, olvidaLaCuentaDeEstaPestana } from './vueltaTrasEntrar';
import customToast from './toast';
import { olvidaLasNovedades } from '../services/novedadesDeActividad';

// El número de Actividad y el del icono son de la cuenta que sale (FE-1)
vi.mock('../services/novedadesDeActividad', () => ({ olvidaLasNovedades: vi.fn() }));
// C4 (25 oct 2026): por sentryHelpers; `window.Sentry` no lo asigna nadie
const sentryHelpers = vi.hoisted(() => ({ clearUserContext: vi.fn() }));
vi.mock('./sentryHelpers', () => sentryHelpers);

// Mock i18next
vi.mock('i18next', () => ({
  default: {
    t: vi.fn((key) => key),
  },
}));

// Mock customToast
vi.mock('./toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    dismiss: vi.fn(),
  },
}));

describe('deviceRevocationLogout utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Cada test, una carga de página nueva
    olvidaElCierreDeEstaCarga();
    // Mock window.location.href
    delete window.location;
    window.location = { href: '', pathname: '' };
    // Mock localStorage
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
    // Mock Sentry
    window.Sentry = { setUser: vi.fn() };
    // Una cuenta que estuvo dentro: el aviso del cierre es para quien tenía sesión
    olvidaLaCuentaDeEstaPestana();
    anotaLaCuentaDeEstaPestana('u-1');
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  // ============================================
  // isDeviceRevoked - ONLY explicit revocation
  // ============================================
  describe('isDeviceRevoked', () => {
    it('should return true when response is 401 with Spanish device revoked message', () => {
      const response = { status: 401 };
      const errorData = { detail: 'Dispositivo revocado. Por favor, inicia sesión nuevamente.' };

      expect(isDeviceRevoked(response, errorData)).toBe(true);
    });

    it('should return true when response is 401 with English device revoked message', () => {
      const response = { status: 401 };
      const errorData = { detail: 'Device revoked. Please sign in again.' };

      expect(isDeviceRevoked(response, errorData)).toBe(true);
    });

    it('should return true when detail contains "dispositivo revocado" in mixed case', () => {
      const response = { status: 401 };
      const errorData = { detail: 'El Dispositivo Revocado por seguridad' };

      expect(isDeviceRevoked(response, errorData)).toBe(true);
    });

    // v2.0.4: Refresh token errors are now handled by isSessionExpired, NOT isDeviceRevoked
    it('should return false when response has refresh token expired message (handled by isSessionExpired)', () => {
      const response = { status: 401 };
      const errorData = { detail: 'Refresh token inválido o expirado. Por favor, inicia sesión nuevamente.' };

      expect(isDeviceRevoked(response, errorData)).toBe(false);
    });

    it('should return false when response has English refresh token expired message (handled by isSessionExpired)', () => {
      const response = { status: 401 };
      const errorData = { detail: 'Refresh token invalid or expired. Please sign in again.' };

      expect(isDeviceRevoked(response, errorData)).toBe(false);
    });

    it('should return false when response is 401 with access token error', () => {
      const response = { status: 401 };
      const errorData = { detail: 'Access token inválido o expirado' };

      expect(isDeviceRevoked(response, errorData)).toBe(false);
    });

    it('should return false when response is 401 but detail does not mention revocation', () => {
      const response = { status: 401 };
      const errorData = { detail: 'Credenciales inválidas' };

      expect(isDeviceRevoked(response, errorData)).toBe(false);
    });

    it('should return false when response is not 401', () => {
      const response = { status: 403 };
      const errorData = { detail: 'Dispositivo revocado' };

      expect(isDeviceRevoked(response, errorData)).toBe(false);
    });

    it('should return false when errorData is empty', () => {
      const response = { status: 401 };
      const errorData = {};

      expect(isDeviceRevoked(response, errorData)).toBe(false);
    });

    it('should return false when errorData.detail is null', () => {
      const response = { status: 401 };
      const errorData = { detail: null };

      expect(isDeviceRevoked(response, errorData)).toBe(false);
    });
  });

  // ============================================
  // isSessionExpired - refresh token expired/invalid
  // ============================================
  describe('isSessionExpired', () => {
    it('should return true when response has Spanish refresh token expired message', () => {
      const response = { status: 401 };
      const errorData = { detail: 'Refresh token inválido o expirado. Por favor, inicia sesión nuevamente.' };

      expect(isSessionExpired(response, errorData)).toBe(true);
    });

    it('should return true when response has English refresh token expired message', () => {
      const response = { status: 401 };
      const errorData = { detail: 'Refresh token invalid or expired. Please sign in again.' };

      expect(isSessionExpired(response, errorData)).toBe(true);
    });

    it('should return true when response has generic refresh token invalid message', () => {
      const response = { status: 401 };
      const errorData = { detail: 'El refresh token es inválido' };

      expect(isSessionExpired(response, errorData)).toBe(true);
    });

    it('should return true when response has generic refresh token expired message', () => {
      const response = { status: 401 };
      const errorData = { detail: 'Refresh token has expired' };

      expect(isSessionExpired(response, errorData)).toBe(true);
    });

    it('should return false when response has device revoked message (handled by isDeviceRevoked)', () => {
      const response = { status: 401 };
      const errorData = { detail: 'Dispositivo revocado. Por favor, inicia sesión nuevamente.' };

      expect(isSessionExpired(response, errorData)).toBe(false);
    });

    it('should return false when response is 401 with access token error', () => {
      const response = { status: 401 };
      const errorData = { detail: 'Access token inválido o expirado' };

      expect(isSessionExpired(response, errorData)).toBe(false);
    });

    it('should return false when response is not 401', () => {
      const response = { status: 403 };
      const errorData = { detail: 'Refresh token expired' };

      expect(isSessionExpired(response, errorData)).toBe(false);
    });
  });

  // ============================================
  // requiresReAuthentication - combined check
  // ============================================
  describe('requiresReAuthentication', () => {
    it('should return true for device revocation', () => {
      const response = { status: 401 };
      const errorData = { detail: 'Dispositivo revocado' };

      expect(requiresReAuthentication(response, errorData)).toBe(true);
    });

    it('should return true for session expiration', () => {
      const response = { status: 401 };
      const errorData = { detail: 'Refresh token expired' };

      expect(requiresReAuthentication(response, errorData)).toBe(true);
    });

    it('should return false for other 401 errors', () => {
      const response = { status: 401 };
      const errorData = { detail: 'Invalid credentials' };

      expect(requiresReAuthentication(response, errorData)).toBe(false);
    });
  });

  // ============================================
  // handleDeviceRevocationLogout - always shows revocation message
  // ============================================
  describe('handleDeviceRevocationLogout', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should clear localStorage user data', () => {
      handleDeviceRevocationLogout();

      expect(localStorage.removeItem).toHaveBeenCalledWith('user');
      expect(localStorage.removeItem).toHaveBeenCalledWith('access_token');
    });

    it('se lleva lo pendiente del hándicap de esa cuenta (FE #677)', () => {
      // No pasa por `clearAuth` y recarga, pero la recarga no borra el
      // almacenamiento: en un móvil compartido, la siguiente persona vería el
      // modal con el hándicap de la anterior
      handleDeviceRevocationLogout();

      expect(localStorage.removeItem).toHaveBeenCalledWith('refrescar_handicap');
      expect(localStorage.removeItem).toHaveBeenCalledWith('pedir_handicap');
    });

    it('forgets the Activity number and the app icon badge (review FE-1)', () => {
      handleDeviceRevocationLogout();

      expect(olvidaLasNovedades).toHaveBeenCalledTimes(1);
    });

    it('should clear Sentry user context', () => {
      handleDeviceRevocationLogout();

      expect(sentryHelpers.clearUserContext).toHaveBeenCalledTimes(1);
    });

    it('should show revocation message with 🔒 icon (always for this handler)', () => {
      handleDeviceRevocationLogout();

      expect(customToast.error).toHaveBeenCalledWith(
        'errors.deviceRevoked',
        expect.objectContaining({ duration: 8000, icon: '🔒' })
      );
    });

    it('should redirect to /login after 500ms delay', () => {
      handleDeviceRevocationLogout();

      expect(window.location.href).toBe('');

      vi.advanceTimersByTime(500);

      expect(window.location.href).toBe('/login');
    });

    it('should not crash if Sentry is not initialized', () => {
      window.Sentry = undefined;

      expect(() => handleDeviceRevocationLogout()).not.toThrow();
      expect(localStorage.removeItem).toHaveBeenCalled();
    });

  });

  // ============================================
  // handleSessionExpiredLogout - always shows expiration message
  // ============================================
  describe('handleSessionExpiredLogout', () => {
    it('forgets the Activity number and the app icon badge (review FE-1)', () => {
      vi.useFakeTimers();
      handleSessionExpiredLogout();
      vi.useRealTimers();

      expect(olvidaLasNovedades).toHaveBeenCalledTimes(1);
    });

    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should clear localStorage user data', () => {
      handleSessionExpiredLogout();

      expect(localStorage.removeItem).toHaveBeenCalledWith('user');
      expect(localStorage.removeItem).toHaveBeenCalledWith('access_token');
    });

    it('should show expiration message with ⏱️ icon (always for this handler)', () => {
      handleSessionExpiredLogout();

      expect(customToast.error).toHaveBeenCalledWith(
        'errors.sessionExpired',
        expect.objectContaining({ duration: 8000, icon: '⏱️' })
      );
    });

    it('should redirect to /login after 500ms delay', () => {
      handleSessionExpiredLogout();

      expect(window.location.href).toBe('');

      vi.advanceTimersByTime(500);

      expect(window.location.href).toBe('/login');
    });

  });

  // ============================================
  // i18n Integration
  // ============================================
  describe('i18n Integration', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should call i18next.t with correct key and namespace for revocation', async () => {
      const i18next = (await import('i18next')).default;

      handleDeviceRevocationLogout();

      expect(i18next.t).toHaveBeenCalledWith('errors.deviceRevoked', { ns: 'auth' });
    });

    it('should call i18next.t with correct key and namespace for expiration', async () => {
      const i18next = (await import('i18next')).default;

      handleSessionExpiredLogout();

      expect(i18next.t).toHaveBeenCalledWith('errors.sessionExpired', { ns: 'auth' });
    });

    // B1-B2 (8 nov 2026): el refresco no dice por qué se rechaza (BE #733); un rechazo
    // (dispositivo revocado, contraseña cambiada…) no es una sesión caducada
    it('B1: un refresco rechazado (SESSION_REJECTED) dice que la sesión ha terminado', async () => {
      const i18next = (await import('i18next')).default;

      handleSessionExpiredLogout({
        detail: 'Refresh token inválido o expirado. Por favor, inicia sesión nuevamente.',
        error_code: 'SESSION_REJECTED',
      });

      expect(i18next.t).toHaveBeenCalledWith('errors.sessionEnded', { ns: 'auth' });
      expect(i18next.t).not.toHaveBeenCalledWith('errors.sessionExpired', { ns: 'auth' });
    });

    it('B2: una sesión que acaba sin más (SESSION_ENDED) sigue diciendo que ha expirado', async () => {
      const i18next = (await import('i18next')).default;

      handleSessionExpiredLogout({
        detail: 'Refresh token inválido o expirado. Por favor, inicia sesión nuevamente.',
        error_code: 'SESSION_ENDED',
      });

      expect(i18next.t).toHaveBeenCalledWith('errors.sessionExpired', { ns: 'auth' });
    });

    it.each([
      ['un código de rechazo antiguo', { detail: 'Refresh token inválido o expirado', error_code: 'REFRESH_TOKEN_REVOKED' }],
      ['un 401 con detalle y sin código', { detail: 'Refresh token inválido o expirado' }],
    ])('B1: %s también dice que la sesión ha terminado (la misma regla que Sentry)', async (_caso, datos) => {
      const i18next = (await import('i18next')).default;

      handleSessionExpiredLogout(datos);

      expect(i18next.t).toHaveBeenCalledWith('errors.sessionEnded', { ns: 'auth' });
    });

    it('B1: sin datos del servidor y con el motivo de un rechazo, dice que ha terminado (CodeRabbit #1065)', async () => {
      const i18next = (await import('i18next')).default;

      handleSessionExpiredLogout(null, { motivo: 'refresh_rejected', estado: 401 });

      expect(i18next.t).toHaveBeenCalledWith('errors.sessionEnded', { ns: 'auth' });
    });

    it('B1: sin datos del servidor, como siempre: ha expirado', async () => {
      const i18next = (await import('i18next')).default;

      handleSessionExpiredLogout(null);

      expect(i18next.t).toHaveBeenCalledWith('errors.sessionExpired', { ns: 'auth' });
    });

    it('sin ninguna cuenta conocida en la pestaña, no avisa «ha expirado»: no había sesión', () => {
      olvidaLaCuentaDeEstaPestana();
      anotaLaCuentaDeEstaPestana(null);

      handleSessionExpiredLogout({ detail: 'Refresh token inválido o expirado', error_code: 'SESSION_ENDED' });

      expect(customToast.error).not.toHaveBeenCalled();
      expect(window.location.href).toBe('');
    });

    it('sin ninguna cuenta conocida, un dispositivo revocado de verdad sí avisa', () => {
      olvidaLaCuentaDeEstaPestana();
      anotaLaCuentaDeEstaPestana(null);

      handleDeviceRevocationLogout({ detail: 'Dispositivo revocado' });

      expect(customToast.error).toHaveBeenCalledTimes(1);
    });

    it('con la cuenta solo en el usuario guardado (nada anotado aún), avisa', () => {
      olvidaLaCuentaDeEstaPestana();
      localStorage.getItem.mockImplementation((k) => (k === 'user' ? '{"id":"u-5"}' : null));

      handleSessionExpiredLogout({ detail: 'Refresh token inválido o expirado', error_code: 'SESSION_ENDED' });

      expect(customToast.error).toHaveBeenCalledTimes(1);
    });

    it('tras cerrar sesión a propósito, el usuario guardado no cuenta: sin aviso', async () => {
      const { olvidaLaUltimaCuenta } = await import('./vueltaTrasEntrar');
      olvidaLaUltimaCuenta();
      localStorage.getItem.mockImplementation((k) => (k === 'user' ? '{"id":"u-5"}' : null));

      handleSessionExpiredLogout({ detail: 'Refresh token inválido o expirado', error_code: 'SESSION_ENDED' });

      expect(customToast.error).not.toHaveBeenCalled();
    });

    it('sin ninguna cuenta conocida, va al login igual', () => {
      vi.useFakeTimers();
      olvidaLaCuentaDeEstaPestana();
      anotaLaCuentaDeEstaPestana(null);

      handleSessionExpiredLogout({ detail: 'Refresh token inválido o expirado', error_code: 'SESSION_ENDED' });
      vi.runAllTimers();

      expect(window.location.href).toBe('/login');
      vi.useRealTimers();
    });

    it('A1: el aviso del cierre lleva su marca para salir aunque el cierre esté en marcha', () => {
      handleSessionExpiredLogout();

      expect(customToast.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ delCierre: true })
      );
    });

  });

  // ============================================
  // clearDeviceRevocationFlag
  // ============================================
  describe('clearDeviceRevocationFlag', () => {
    it('should remove the revocation handled flag from localStorage', () => {
      clearDeviceRevocationFlag();

      expect(localStorage.removeItem).toHaveBeenCalledWith('device_revocation_handled');
    });
  });

  // ============================================
  // Idempotency - prevent multiple logouts
  // ============================================
  describe('Idempotency', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it.each([['true'], ['forzado'], ['propia']])('C2: ya en /login con la marca «%s», nada', (marca) => {
      localStorage.getItem.mockImplementation((key) => {
        if (key === 'device_revocation_handled') return marca;
        return null;
      });
      window.location.pathname = '/login';

      handleDeviceRevocationLogout();
      vi.advanceTimersByTime(500);

      expect(customToast.error).not.toHaveBeenCalled();
      expect(localStorage.removeItem).not.toHaveBeenCalled();
      expect(window.location.href).toBe('');
    });

    it('C3: si limpiar falla tras revocar el propio dispositivo, sale igualmente a /login', () => {
      localStorage.getItem.mockImplementation((key) => (key === 'device_revocation_handled' ? 'propia' : null));
      localStorage.removeItem.mockImplementation(() => {
        throw new Error('SecurityError');
      });
      window.location.pathname = '/dashboard';

      expect(() => handleDeviceRevocationLogout()).toThrow('SecurityError');

      expect(window.location.href).toBe('/login');
    });

    it('si algo falla dentro del cierre (almacenamiento lleno), sale igualmente a /login', () => {
      localStorage.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      window.location.pathname = '/dashboard';

      expect(() => handleDeviceRevocationLogout()).toThrow('QuotaExceededError');
      vi.advanceTimersByTime(500);

      expect(window.location.href).toBe('/login');
      // Y la cuenta ya se limpió: lo primero, antes de la marca (CodeRabbit)
      expect(localStorage.removeItem).toHaveBeenCalledWith('user');
      expect(sentryHelpers.clearUserContext).toHaveBeenCalled();
    });


    // C4 (8 nov 2026): una marca de otra pestaña o de una carga anterior no ahorra el
    // cierre de esta: limpia, avisa y se va, como la primera vez
    it.each([['forzado'], ['true']])('con la marca «%s» de otra carga, el cierre completo', (marca) => {
      localStorage.getItem.mockImplementation((key) => {
        if (key === 'device_revocation_handled') return marca;
        return null;
      });
      window.location.pathname = '/dashboard';

      handleDeviceRevocationLogout();
      vi.advanceTimersByTime(500);

      expect(customToast.error).toHaveBeenCalledTimes(1);
      expect(localStorage.removeItem).toHaveBeenCalledWith('user');
      expect(window.location.href).toBe('/login');
    });
  });
});

describe('la redirección dura guarda la página para volver tras entrar (probador de la release)', () => {
  const desdeElEnlace = () => {
    sessionStorage.clear();
    window.location = {
      href: '',
      pathname: '/confirm-email-change',
      search: '?token=abc',
      hash: '',
      origin: 'http://localhost:3000',
    };
  };

  it.each([
    ['la primera vez: la guarda', null, '/confirm-email-change?token=abc'],
    // Marca de otra carga, o de una versión anterior: el cierre de esta guarda (C4)
    ['marca vieja «true»: la guarda', 'true', '/confirm-email-change?token=abc'],
    ['marca de otra pestaña: la guarda', 'forzado', '/confirm-email-change?token=abc'],
    // Revocó su propio dispositivo: no guarda, y borra una anterior (C3)
    ['revocación propia: no la guarda', 'propia', null],
  ])('desde el enlace de confirmar, con su token: %s', async (_caso, tratada, esperado) => {
    desdeElEnlace();
    sessionStorage.setItem('vuelta_tras_entrar', '/competitions/1');
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => tratada),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
    const { handleSessionExpiredLogout } = await import('./deviceRevocationLogout');
    const { olvidaElCierreDeEstaCarga } = await import('./cierreDeEstaCarga');
    olvidaElCierreDeEstaCarga();

    handleSessionExpiredLogout({ detail: 'expired' });

    expect(sessionStorage.getItem('vuelta_tras_entrar')).toBe(esperado);
    vi.unstubAllGlobals();
  });

  // Un almacén de verdad: los dos avisos comparten la marca, como en el navegador
  const conAlmacen = (inicial = {}) => {
    const datos = { ...inicial };
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((k) => datos[k] ?? null),
      setItem: vi.fn((k, v) => {
        datos[k] = String(v);
      }),
      removeItem: vi.fn((k) => {
        delete datos[k];
      }),
    });
    return datos;
  };

  // Una carga de página nueva: el módulo, sin el cierre de esta carga
  const deUnaCargaNueva = async () => {
    vi.resetModules();
    return import('./deviceRevocationLogout');
  };

  it('C1: dos fallos en la misma carga: el segundo no hace nada (probador y /code-review, 8 nov)', async () => {
    vi.useFakeTimers();
    desdeElEnlace();
    // Con sesión de antes: el usuario guardado (sin él no habría aviso que contar)
    const datos = conAlmacen({ user: JSON.stringify({ id: 'u-1' }) });
    const { handleSessionExpiredLogout } = await deUnaCargaNueva();
    const toast = (await import('./toast')).default;
    toast.error.mockClear();

    handleSessionExpiredLogout({ detail: 'expired' });
    handleSessionExpiredLogout({ detail: 'expired' });

    // El toast se lee: la salida espera sus 500 ms, no la adelanta el segundo
    expect(window.location.href).toBe('');
    vi.advanceTimersByTime(500);
    expect(window.location.href).toBe('/login');
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem('vuelta_tras_entrar')).toBe('/confirm-email-change?token=abc');
    expect(datos.device_revocation_handled).toBe('forzado');
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('C3: tras revocar el propio dispositivo, el aviso que llegue limpia la cuenta y no guarda', async () => {
    desdeElEnlace();
    sessionStorage.setItem('vuelta_tras_entrar', '/competitions/1');
    const datos = conAlmacen({ user: '{"id":"u-1"}' });
    const { handleDeviceRevocationLogout, marcaLaRevocacionPropia } = await deUnaCargaNueva();
    const toast = (await import('./toast')).default;
    toast.error.mockClear();

    marcaLaRevocacionPropia();
    handleDeviceRevocationLogout({ detail: 'Dispositivo revocado' });

    expect(datos.user).toBeUndefined();
    expect(toast.error).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('vuelta_tras_entrar')).toBeNull();
    expect(window.location.href).toBe('/login');
    vi.unstubAllGlobals();
  });
});
