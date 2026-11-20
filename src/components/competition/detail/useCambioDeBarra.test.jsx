import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCambioDeBarra, claveDelFalloDeLaBarra } from './useCambioDeBarra';

const mockCambiar = vi.fn();
vi.mock('../../../composition', () => ({
  changeEnrollmentTeeUseCase: { execute: (...a) => mockCambiar(...a) },
}));
const mockToast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('../../../utils/toast', () => ({ default: mockToast }));
vi.mock('../../../utils/registraElFallo', () => ({
  registraElFallo: vi.fn(),
}));

const t = (clave) => clave;
const ana = { id: 'e1', userId: 'ana', color: null };
const fallo = (status, errorCode) =>
  Object.assign(new Error(String(status)), { status, errorCode });

/**
 * Guardar la barra de un inscrito (FE #1214): con lo que confirma el
 * servidor, y cada rechazo con su texto, nunca el del servidor (F5).
 */
describe('useCambioDeBarra', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('guarda, pone en la lista la barra que quedó, avisa y cierra', async () => {
    mockCambiar.mockResolvedValue({ id: 'e1', teeColor: 'RED' });
    const setEnrollments = vi.fn();
    const { result } = renderHook(() =>
      useCambioDeBarra({ t, setEnrollments }),
    );
    act(() => result.current.abrir(ana));
    expect(result.current.cambiandoDe).toBe(ana);

    await act(() => result.current.guardar('RED'));

    expect(mockCambiar).toHaveBeenCalledWith('e1', 'RED');
    const actualiza = setEnrollments.mock.calls[0][0];
    expect(actualiza([ana, { id: 'e2', color: 'BLUE' }])).toEqual([
      { ...ana, color: 'RED' },
      { id: 'e2', color: 'BLUE' },
    ]);
    expect(mockToast.success).toHaveBeenCalledWith('detail.tee.saved');
    expect(result.current.cambiandoDe).toBeNull();
    expect(result.current.guardando).toBe(false);
  });

  it('un rechazo avisa con su texto y deja el modal abierto', async () => {
    mockCambiar.mockRejectedValue(fallo(422, 'TEE_NOT_AVAILABLE'));
    const setEnrollments = vi.fn();
    const { result } = renderHook(() =>
      useCambioDeBarra({ t, setEnrollments }),
    );
    act(() => result.current.abrir(ana));

    await act(() => result.current.guardar('RED'));

    expect(mockToast.error).toHaveBeenCalledWith(
      'detail.tee.errors.TEE_NOT_AVAILABLE',
    );
    expect(setEnrollments).not.toHaveBeenCalled();
    expect(result.current.cambiandoDe).toBe(ana);
    expect(result.current.guardando).toBe(false);
  });

  it.each([
    [fallo(422, 'TEE_NOT_AVAILABLE'), 'detail.tee.errors.TEE_NOT_AVAILABLE'],
    [fallo(409, 'TEE_CHANGE_CLOSED'), 'detail.tee.errors.TEE_CHANGE_CLOSED'],
    [
      fallo(409, 'ENROLLMENT_NOT_APPROVED'),
      'detail.tee.errors.ENROLLMENT_NOT_APPROVED',
    ],
    [
      fallo(409, 'PENDING_GAME_NOT_RECALCULABLE'),
      'detail.tee.errors.PENDING_GAME_NOT_RECALCULABLE',
    ],
    [fallo(403, undefined), 'detail.tee.errors.FORBIDDEN'],
    [fallo(409, 'OTRO_CODIGO'), 'detail.tee.errors.generic'],
    [new Error('sin red'), 'detail.tee.errors.generic'],
  ])('F5: %s → %s', (error, clave) => {
    expect(claveDelFalloDeLaBarra(error)).toBe(clave);
  });

  it('cerrar suelta el modal', () => {
    const { result } = renderHook(() =>
      useCambioDeBarra({ t, setEnrollments: vi.fn() }),
    );
    act(() => result.current.abrir(ana));
    act(() => result.current.cerrar());
    expect(result.current.cambiandoDe).toBeNull();
  });
});
