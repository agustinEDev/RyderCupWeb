import { renderHook } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useCorreoVerificado } from './useCorreoVerificado';

const sesion = vi.hoisted(() => ({ user: null, refetch: null }));
vi.mock('./useAuth', () => ({
  useAuth: () => ({ user: sesion.user, refetch: sesion.refetch }),
}));

describe('useCorreoVerificado (B-17)', () => {
  beforeEach(() => {
    sesion.refetch = vi.fn();
  });

  it('verificado: confirma sin volver a preguntar', async () => {
    sesion.user = { email_verified: true };
    const { result } = renderHook(() => useCorreoVerificado());

    expect(result.current.sinVerificar).toBe(false);
    expect(await result.current.confirma()).toBe(true);
    expect(sesion.refetch).not.toHaveBeenCalled();
  });

  it('la copia dice que no: vuelve a preguntar, y vale si ya verificó', async () => {
    sesion.user = { email_verified: false };
    sesion.refetch.mockResolvedValue({ email_verified: true });
    const { result } = renderHook(() => useCorreoVerificado());

    expect(result.current.sinVerificar).toBe(true);
    expect(await result.current.confirma()).toBe(true);
    expect(sesion.refetch).toHaveBeenCalled();
  });

  it('sin usuario en la respuesta, no vale (CodeRabbit)', async () => {
    sesion.user = { email_verified: false };
    sesion.refetch.mockResolvedValue(null);
    const { result } = renderHook(() => useCorreoVerificado());

    expect(await result.current.confirma()).toBe(false);
  });

  it('un segundo toque mientras se pregunta no cuenta (CodeRabbit)', async () => {
    sesion.user = { email_verified: false };
    let contesta;
    sesion.refetch.mockReturnValue(
      new Promise((resolve) => {
        contesta = resolve;
      }),
    );
    const { result } = renderHook(() => useCorreoVerificado());

    const primero = result.current.confirma();
    expect(await result.current.confirma()).toBeNull();
    contesta({ email_verified: true });
    expect(await primero).toBe(true);
    expect(sesion.refetch).toHaveBeenCalledTimes(1);
  });

  it('sigue sin verificar, o no se pudo preguntar: no vale', async () => {
    sesion.user = { email_verified: false };
    sesion.refetch.mockResolvedValueOnce({ email_verified: false });
    const { result } = renderHook(() => useCorreoVerificado());
    expect(await result.current.confirma()).toBe(false);

    sesion.refetch.mockRejectedValueOnce(new Error('sin red'));
    expect(await result.current.confirma()).toBe(false);
  });
});
