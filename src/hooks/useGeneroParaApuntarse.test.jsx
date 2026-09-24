import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

/**
 * El género hace falta para apuntarse a una competición (#710): las barras se
 * valoran por género. Se pregunta solo a quien no lo tiene, se guarda en su
 * perfil y la sesión se refresca para que no se le vuelva a preguntar.
 */
const mockActualizar = vi.fn();
const mockRefrescar = vi.fn();
let usuario = { id: 'u1', gender: null };

vi.mock('../composition', () => ({
  updateUserProfileUseCase: { execute: (...a) => mockActualizar(...a) },
}));
vi.mock('./useAuth', () => ({
  useAuth: () => ({ user: usuario, refetch: mockRefrescar }),
}));

const { useGeneroParaApuntarse } = await import('./useGeneroParaApuntarse');

describe('useGeneroParaApuntarse', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usuario = { id: 'u1', gender: null };
  });

  it('H1: sin género, falta', () => {
    const { result } = renderHook(() => useGeneroParaApuntarse());
    expect(result.current.falta).toBe(true);
  });

  it('H2: con género, no falta', () => {
    usuario = { id: 'u1', gender: 'FEMALE' };
    const { result } = renderHook(() => useGeneroParaApuntarse());
    expect(result.current.falta).toBe(false);
  });

  it('H3: guardarlo lo pone en su perfil, sin refrescar todavía la sesión', async () => {
    // Refrescarla crea un `user` nuevo, y las páginas que dependen de él se
    // recargan: en mitad de pedir plaza o aceptar, eso era un parpadeo o una
    // lista vieja pisando la nueva. Se refresca al terminar (revisión local)
    const { result } = renderHook(() => useGeneroParaApuntarse());

    await act(() => result.current.guardar('MALE'));

    expect(mockActualizar).toHaveBeenCalledWith('u1', { gender: 'MALE' });
    expect(mockRefrescar).not.toHaveBeenCalled();
  });

  it('H3b: refrescar pone la sesión al día, para que no se vuelva a preguntar', async () => {
    const { result } = renderHook(() => useGeneroParaApuntarse());

    await act(() => result.current.refrescar());

    expect(mockRefrescar).toHaveBeenCalled();
  });

  it('H4: sin nada elegido no toca el perfil', async () => {
    const { result } = renderHook(() => useGeneroParaApuntarse());

    await act(() => result.current.guardar(null));

    expect(mockActualizar).not.toHaveBeenCalled();
  });
});
