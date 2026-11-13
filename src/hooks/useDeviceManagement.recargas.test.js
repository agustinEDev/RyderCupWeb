import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

/**
 * Cuándo se pide la lista de dispositivos y qué pasa con lo que llega tarde (T4).
 *
 *   #      caso                                                | qué pasa
 *   -------|--------------------------------------------------|----------------------------------
 *   T4-23  lista cargada; cambia el idioma                     | se vuelve a pedir, con la espera
 *   T4-24  lista en vuelo; se sale de la pantalla y falla      | sin aviso de error en otra pantalla
 *   T4-25  dos lecturas (cambio de idioma); la 1.ª llega última | se ve la segunda
 *   T4-26  lista cargada; revoca uno                           | sale de la lista, aviso de éxito, sin volver a pedir
 */

// El `t` cambia con el idioma, como en react-i18next
const idioma = vi.hoisted(() => ({ t: (k) => `es:${k}` }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: idioma.t }) }));

const mockToast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock('../utils/toast', () => ({ default: mockToast }));

const mockLeer = vi.hoisted(() => vi.fn());
const mockRevocar = vi.hoisted(() => vi.fn());
vi.mock('../composition', () => ({
  getActiveDevicesUseCase: { execute: (...a) => mockLeer(...a) },
  revokeDeviceUseCase: { execute: (...a) => mockRevocar(...a) },
}));

const { useDeviceManagement } = await import('./useDeviceManagement');

const MOVIL = { id: 'd-1', deviceName: 'Safari en iPhone' };
const PORTATIL = { id: 'd-2', deviceName: 'Chrome en macOS' };
const pendiente = () => {
  let soltar;
  let fallar;
  const promesa = new Promise((resolver, rechazar) => {
    soltar = resolver;
    fallar = rechazar;
  });
  return { promesa, soltar, fallar };
};

let consola;
beforeEach(() => {
  vi.clearAllMocks();
  idioma.t = (k) => `es:${k}`;
  mockLeer.mockResolvedValue({ devices: [MOVIL, PORTATIL] });
  consola = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => consola.mockRestore());

describe('useDeviceManagement · recargas (T4)', () => {
  it('T4-23: al cambiar de idioma se vuelve a pedir la lista, con la espera', async () => {
    const { result, rerender } = renderHook(() => useDeviceManagement());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const otra = pendiente();
    mockLeer.mockReturnValueOnce(otra.promesa);

    idioma.t = (k) => `en:${k}`;
    rerender();

    await waitFor(() => expect(mockLeer).toHaveBeenCalledTimes(2));
    expect(result.current.isLoading).toBe(true);
    await act(async () => otra.soltar({ devices: [PORTATIL] }));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.devices).toEqual([PORTATIL]);
  });

  it('T4-24: si se sale de la pantalla con la lista en vuelo y falla, no avisa en otra pantalla', async () => {
    const enVuelo = pendiente();
    mockLeer.mockReturnValueOnce(enVuelo.promesa);
    const { unmount } = renderHook(() => useDeviceManagement());
    await waitFor(() => expect(mockLeer).toHaveBeenCalledTimes(1));

    unmount();
    await act(async () => enVuelo.fallar(new Error('sin red')));

    expect(mockToast.error).not.toHaveBeenCalled();
  });

  it('T4-25: dos lecturas por un cambio de idioma y la primera llega la última: se ve la segunda', async () => {
    const primera = pendiente();
    mockLeer
      .mockReturnValueOnce(primera.promesa)
      .mockResolvedValueOnce({ devices: [PORTATIL] });
    const { result, rerender } = renderHook(() => useDeviceManagement());
    await waitFor(() => expect(mockLeer).toHaveBeenCalledTimes(1));

    idioma.t = (k) => `en:${k}`;
    rerender();
    await waitFor(() => expect(result.current.devices).toEqual([PORTATIL]));
    await act(async () => primera.soltar({ devices: [MOVIL, PORTATIL] }));

    expect(result.current.devices).toEqual([PORTATIL]);
    expect(result.current.isLoading).toBe(false);
  });

  it('T4-26: revocar uno lo quita de la lista y lo dice, sin volver a pedirla', async () => {
    mockRevocar.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeviceManagement());
    await waitFor(() =>
      expect(result.current.devices).toEqual([MOVIL, PORTATIL]),
    );

    let revocado;
    await act(async () => {
      revocado = await result.current.revokeDevice('d-1');
    });

    expect(revocado).toBe(true);
    expect(result.current.devices).toEqual([PORTATIL]);
    expect(mockToast.success).toHaveBeenCalledWith('es:success.deviceRevoked');
    expect(mockLeer).toHaveBeenCalledTimes(1);
  });
});
