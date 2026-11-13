/**
 * Tests for useUserRoles Hook
 * Sprint 1 v2.1.0: RBAC Frontend Implementation
 *
 * Tests the hook that consumes GET /api/v1/users/me/roles/{competitionId}
 * to provide role-based access control for UI elements.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useUserRoles } from './useUserRoles';
import { getUserRolesUseCase } from '../composition';

// Mock the use case
vi.mock('../composition', () => ({
  getUserRolesUseCase: {
    execute: vi.fn(),
  },
}));

describe('useUserRoles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Lo que un test deja en cola (`mock…Once`) no se cuela en el siguiente
    getUserRolesUseCase.execute.mockReset();
  });

  it('should return default roles (all false) and loading state initially', () => {
    getUserRolesUseCase.execute.mockResolvedValue({
      isAdmin: false,
      isCreator: false,
      isPlayer: false,
    });

    const { result } = renderHook(() => useUserRoles('comp-123'));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isCreator).toBe(false);
    expect(result.current.isPlayer).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should fetch and return admin role correctly', async () => {
    getUserRolesUseCase.execute.mockResolvedValue({
      isAdmin: true,
      isCreator: false,
      isPlayer: false,
    });

    const { result } = renderHook(() => useUserRoles('comp-123', 'u-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isCreator).toBe(false);
    expect(result.current.isPlayer).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should fetch and return creator role correctly', async () => {
    getUserRolesUseCase.execute.mockResolvedValue({
      isAdmin: false,
      isCreator: true,
      isPlayer: false,
    });

    const { result } = renderHook(() => useUserRoles('comp-123', 'u-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isCreator).toBe(true);
    expect(result.current.isPlayer).toBe(false);
  });

  it('should fetch and return player role correctly', async () => {
    getUserRolesUseCase.execute.mockResolvedValue({
      isAdmin: false,
      isCreator: false,
      isPlayer: true,
    });

    const { result } = renderHook(() => useUserRoles('comp-123', 'u-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isCreator).toBe(false);
    expect(result.current.isPlayer).toBe(true);
  });

  it('should handle multiple roles correctly', async () => {
    getUserRolesUseCase.execute.mockResolvedValue({
      isAdmin: true,
      isCreator: true,
      isPlayer: true,
    });

    const { result } = renderHook(() => useUserRoles('comp-123', 'u-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isCreator).toBe(true);
    expect(result.current.isPlayer).toBe(true);
  });

  it('should not fetch roles if competitionId is not provided', async () => {
    const { result } = renderHook(() => useUserRoles(null));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(getUserRolesUseCase.execute).not.toHaveBeenCalled();
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isCreator).toBe(false);
    expect(result.current.isPlayer).toBe(false);
  });

  it('should handle API errors and reset roles to false', async () => {
    const error = new Error('Network error');
    getUserRolesUseCase.execute.mockRejectedValue(error);

    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const { result } = renderHook(() => useUserRoles('comp-123', 'u-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isCreator).toBe(false);
    expect(result.current.isPlayer).toBe(false);
    expect(result.current.error).toBe(error);

    consoleErrorSpy.mockRestore();
  });

  it('should provide refetch function that re-fetches roles', async () => {
    getUserRolesUseCase.execute
      .mockResolvedValueOnce({
        isAdmin: false,
        isCreator: true,
        isPlayer: false,
      })
      .mockResolvedValueOnce({
        isAdmin: true,
        isCreator: true,
        isPlayer: false,
      });

    const { result } = renderHook(() => useUserRoles('comp-123', 'u-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isCreator).toBe(true);
    expect(result.current.isAdmin).toBe(false);

    // Refetch - wrap in act
    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isCreator).toBe(true);
    expect(getUserRolesUseCase.execute).toHaveBeenCalledTimes(2);
  });

  it('should call use case with correct competitionId', async () => {
    getUserRolesUseCase.execute.mockResolvedValue({
      isAdmin: false,
      isCreator: false,
      isPlayer: true,
    });

    renderHook(() => useUserRoles('comp-456', 'u-1'));

    await waitFor(() => {
      expect(getUserRolesUseCase.execute).toHaveBeenCalledWith('comp-456');
    });
  });

  it('should re-fetch roles when competitionId changes', async () => {
    getUserRolesUseCase.execute.mockResolvedValue({
      isAdmin: false,
      isCreator: true,
      isPlayer: false,
    });

    const { rerender } = renderHook(
      ({ compId }) => useUserRoles(compId, 'u-1'),
      { initialProps: { compId: 'comp-123' } },
    );

    await waitFor(() => {
      expect(getUserRolesUseCase.execute).toHaveBeenCalledWith('comp-123');
    });

    // Change competitionId
    rerender({ compId: 'comp-456' });

    await waitFor(() => {
      expect(getUserRolesUseCase.execute).toHaveBeenCalledWith('comp-456');
    });

    expect(getUserRolesUseCase.execute).toHaveBeenCalledTimes(2);
  });
});

/**
 * Los roles son de UN usuario en UNA competición (T4, A01): lo que llega de
 * otra competición o de otro usuario nunca se enseña.
 *
 *   #      caso                                                      | qué pasa
 *   -------|---------------------------------------------------------|----------------------------------
 *   T4-16  cambia de A a B; llega B y después A                       | roles de B
 *   T4-17  roles de A cargados; cambia a B                            | en ese mismo pintado, espera y todo false
 *   T4-18  cambia de A a B y A falla tarde                            | ni error ni roles a false sobre B
 *   T4-19  error en A; cambia a B                                     | el error de A no se ve en B
 *   T4-20  error; refetch()                                           | error null y espera al momento; luego los nuevos
 *   T4-21  dos refetch() y el primero llega el último                 | los del segundo
 *   T4-22  se desmonta con la petición en vuelo                       | sin console.error
 *   P6     roles de U1 en A; cambia el usuario a U2 en A              | en ese mismo pintado, espera y todo false; lo de U1 no se aplica
 *   T4-40  sin usuario todavía; llega el usuario                      | no se pide antes; una sola petición; ningún rol antes
 *   T4-41  sin competición ni usuario                                 | ni se pide ni se espera (P5)
 */
describe('useUserRoles · de quién y de qué competición (T4)', () => {
  const ORGANIZA = { isAdmin: false, isCreator: true, isPlayer: false };
  const ADMIN = { isAdmin: true, isCreator: true, isPlayer: true };
  const JUEGA = { isAdmin: false, isCreator: false, isPlayer: true };
  const pendiente = () => {
    let soltar;
    let fallar;
    const promesa = new Promise((resolver, rechazar) => {
      soltar = resolver;
      fallar = rechazar;
    });
    return { promesa, soltar, fallar };
  };
  // Cada pintado, con la competición y el usuario de ese pintado
  const pintados = [];
  const pinta = (inicial) =>
    renderHook(
      ({ competicion, usuario }) => {
        const r = useUserRoles(competicion, usuario);
        pintados.push({ competicion, usuario, ...r });
        return r;
      },
      { initialProps: inicial },
    );
  const sinRolesYEsperando = (p) =>
    p.isLoading &&
    !p.isAdmin &&
    !p.isCreator &&
    !p.isPlayer &&
    p.error === null;

  let consola;
  beforeEach(() => {
    vi.clearAllMocks();
    // Lo que un test deja en cola (`mock…Once`) no se cuela en el siguiente
    getUserRolesUseCase.execute.mockReset();
    pintados.length = 0;
    consola = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => consola.mockRestore());

  it('T4-16: la respuesta de A que llega después de la de B no pisa los roles de B', async () => {
    const deA = pendiente();
    getUserRolesUseCase.execute
      .mockReturnValueOnce(deA.promesa)
      .mockResolvedValueOnce(JUEGA);
    const { result, rerender } = pinta({ competicion: 'A', usuario: 'u1' });

    rerender({ competicion: 'B', usuario: 'u1' });
    await waitFor(() => expect(result.current.isPlayer).toBe(true));
    await act(async () => deA.soltar(ADMIN));

    expect(result.current).toMatchObject({
      ...JUEGA,
      isLoading: false,
      error: null,
    });
    expect(
      pintados.filter((p) => p.competicion === 'B' && p.isCreator),
    ).toEqual([]);
  });

  it('T4-17: al cambiar de A a B, en ese mismo pintado ya espera y no enseña los roles de A', async () => {
    const deB = pendiente();
    getUserRolesUseCase.execute
      .mockResolvedValueOnce(ORGANIZA)
      .mockReturnValueOnce(deB.promesa);
    const { result, rerender } = pinta({ competicion: 'A', usuario: 'u1' });
    await waitFor(() => expect(result.current.isCreator).toBe(true));

    rerender({ competicion: 'B', usuario: 'u1' });

    const deLaB = pintados.filter((p) => p.competicion === 'B');
    expect(deLaB.length).toBeGreaterThan(0);
    expect(deLaB.every(sinRolesYEsperando)).toBe(true);
    await act(async () => deB.soltar(JUEGA));
    expect(result.current).toMatchObject({ ...JUEGA, isLoading: false });
  });

  it('T4-18: si A falla tarde con B ya pedida, B ni enseña error ni deja de esperar por eso', async () => {
    const deA = pendiente();
    const deB = pendiente();
    getUserRolesUseCase.execute
      .mockReturnValueOnce(deA.promesa)
      .mockReturnValueOnce(deB.promesa);
    const { result, rerender } = pinta({ competicion: 'A', usuario: 'u1' });

    rerender({ competicion: 'B', usuario: 'u1' });
    await act(async () => deA.fallar(new Error('de A')));

    expect(sinRolesYEsperando(result.current)).toBe(true);
    expect(consola).not.toHaveBeenCalled();
    await act(async () => deB.soltar(ORGANIZA));
    expect(result.current).toMatchObject({
      ...ORGANIZA,
      isLoading: false,
      error: null,
    });
  });

  it('T4-19: el error de A no se ve en B', async () => {
    const deB = pendiente();
    getUserRolesUseCase.execute
      .mockRejectedValueOnce(new Error('de A'))
      .mockReturnValueOnce(deB.promesa);
    const { result, rerender } = pinta({ competicion: 'A', usuario: 'u1' });
    await waitFor(() => expect(result.current.error).not.toBe(null));

    rerender({ competicion: 'B', usuario: 'u1' });

    expect(
      pintados.filter((p) => p.competicion === 'B').every(sinRolesYEsperando),
    ).toBe(true);
    await act(async () => deB.soltar(JUEGA));
    expect(result.current).toMatchObject({
      ...JUEGA,
      isLoading: false,
      error: null,
    });
  });

  it('T4-20: tras un error, refetch() quita el error y espera al momento; luego, los roles nuevos', async () => {
    const otra = pendiente();
    getUserRolesUseCase.execute
      .mockRejectedValueOnce(new Error('sin red'))
      .mockReturnValueOnce(otra.promesa);
    const { result } = pinta({ competicion: 'A', usuario: 'u1' });
    await waitFor(() => expect(result.current.error).not.toBe(null));

    act(() => {
      result.current.refetch();
    });

    expect(result.current.error).toBe(null);
    expect(result.current.isLoading).toBe(true);
    await act(async () => otra.soltar(ORGANIZA));
    expect(result.current).toMatchObject({
      ...ORGANIZA,
      isLoading: false,
      error: null,
    });
  });

  it('T4-21: dos refetch() seguidos y el primero llega el último: se quedan los del segundo', async () => {
    const primero = pendiente();
    getUserRolesUseCase.execute
      .mockResolvedValueOnce(JUEGA)
      .mockReturnValueOnce(primero.promesa)
      .mockResolvedValueOnce(ORGANIZA);
    const { result } = pinta({ competicion: 'A', usuario: 'u1' });
    await waitFor(() => expect(result.current.isPlayer).toBe(true));

    act(() => {
      result.current.refetch();
    });
    await waitFor(() =>
      expect(getUserRolesUseCase.execute).toHaveBeenCalledTimes(2),
    );
    act(() => {
      result.current.refetch();
    });
    await waitFor(() =>
      expect(result.current).toMatchObject({ ...ORGANIZA, isLoading: false }),
    );
    await act(async () => primero.soltar(ADMIN));

    expect(result.current).toMatchObject({ ...ORGANIZA, isLoading: false });
  });

  it('T4-22: desmontado con la petición en vuelo, su fallo no se registra ni se aplica', async () => {
    const enVuelo = pendiente();
    getUserRolesUseCase.execute.mockReturnValueOnce(enVuelo.promesa);
    const { unmount } = pinta({ competicion: 'A', usuario: 'u1' });
    await waitFor(() =>
      expect(getUserRolesUseCase.execute).toHaveBeenCalledTimes(1),
    );

    unmount();
    await act(async () => enVuelo.fallar(new Error('tarde')));

    expect(consola).not.toHaveBeenCalled();
  });

  it('P6: al cambiar de usuario en la misma competición, ya en ese pintado espera sin roles, y lo de U1 que llega tarde no se aplica', async () => {
    const deU1 = pendiente();
    const deU2 = pendiente();
    getUserRolesUseCase.execute
      .mockResolvedValueOnce(ADMIN)
      .mockReturnValueOnce(deU1.promesa)
      .mockReturnValueOnce(deU2.promesa);
    const { result, rerender } = pinta({ competicion: 'A', usuario: 'u1' });
    await waitFor(() => expect(result.current.isAdmin).toBe(true));

    // U1 vuelve a pedir y, con esa respuesta aún en vuelo, la sesión pasa a U2
    act(() => {
      result.current.refetch();
    });
    await waitFor(() =>
      expect(getUserRolesUseCase.execute).toHaveBeenCalledTimes(2),
    );
    rerender({ competicion: 'A', usuario: 'u2' });

    const deU2Pintados = pintados.filter((p) => p.usuario === 'u2');
    expect(deU2Pintados.length).toBeGreaterThan(0);
    expect(deU2Pintados.every(sinRolesYEsperando)).toBe(true);
    await waitFor(() =>
      expect(getUserRolesUseCase.execute).toHaveBeenCalledTimes(3),
    );
    await act(async () => deU1.soltar(ADMIN));
    expect(sinRolesYEsperando(result.current)).toBe(true);

    await act(async () => deU2.soltar(JUEGA));
    expect(result.current).toMatchObject({
      ...JUEGA,
      isLoading: false,
      error: null,
    });
    expect(
      pintados.filter((p) => p.usuario === 'u2' && (p.isAdmin || p.isCreator)),
    ).toEqual([]);
  });

  // /code-review: la pantalla puede montar antes de saber quién es el usuario.
  // Pedir entonces y otra vez al llegar hacía parpadear los controles de
  // organizador (se veían, se iban y volvían)
  it('T4-40: sin usuario no se piden; al llegar, una sola petición, y ningún rol antes de su respuesta', async () => {
    const deU1 = pendiente();
    getUserRolesUseCase.execute.mockReturnValueOnce(deU1.promesa);
    const { result, rerender } = pinta({
      competicion: 'A',
      usuario: undefined,
    });
    await act(async () => {});

    expect(getUserRolesUseCase.execute).not.toHaveBeenCalled();
    expect(sinRolesYEsperando(result.current)).toBe(true);

    rerender({ competicion: 'A', usuario: 'u1' });
    await waitFor(() =>
      expect(getUserRolesUseCase.execute).toHaveBeenCalledTimes(1),
    );
    expect(sinRolesYEsperando(result.current)).toBe(true);
    await act(async () => deU1.soltar(ADMIN));

    expect(result.current).toMatchObject({
      ...ADMIN,
      isLoading: false,
      error: null,
    });
    expect(getUserRolesUseCase.execute).toHaveBeenCalledTimes(1);
    const antesDeLlegar = pintados.slice(
      0,
      pintados.findIndex((p) => p.isAdmin),
    );
    expect(antesDeLlegar.every(sinRolesYEsperando)).toBe(true);
  });

  it('T4-41: sin competición no se espera aunque falte el usuario (P5)', async () => {
    const { result } = pinta({ competicion: null, usuario: undefined });
    await act(async () => {});

    expect(getUserRolesUseCase.execute).not.toHaveBeenCalled();
    expect(result.current).toMatchObject({
      isAdmin: false,
      isCreator: false,
      isPlayer: false,
      isLoading: false,
    });
  });
});
