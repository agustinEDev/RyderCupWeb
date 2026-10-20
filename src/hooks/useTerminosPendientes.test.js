import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { anotaLaSesion, olvidaLaSesion } from '../services/sesionCompartida';
import { useTerminosPendientes } from './useTerminosPendientes';

/**
 * Si el usuario de la sesión tiene los Términos pendientes, leído SIN preguntar:
 * lo usa `App.jsx` para no arrancar nada que llame a la API (la cola, las
 * muestras, el monitor de dispositivos) mientras el backend responda 403 a todo.
 */
describe('useTerminosPendientes', () => {
  afterEach(() => {
    act(() => olvidaLaSesion());
    vi.restoreAllMocks();
  });

  it('con terms_accepted false, pendientes', () => {
    act(() => anotaLaSesion({ id: 'u-1', terms_accepted: false }));

    const { result } = renderHook(() => useTerminosPendientes());

    expect(result.current).toBe(true);
  });

  it('al aceptar, deja de estarlo sin volver a montar', () => {
    act(() => anotaLaSesion({ id: 'u-1', terms_accepted: false }));
    const { result } = renderHook(() => useTerminosPendientes());

    act(() => anotaLaSesion({ id: 'u-1', terms_accepted: true }));

    expect(result.current).toBe(false);
  });

  it.each([
    ['sin el campo (backend antiguo)', { id: 'u-1' }],
    ['aceptados', { id: 'u-1', terms_accepted: true }],
  ])('%s, no pendientes', (_caso, usuario) => {
    act(() => anotaLaSesion(usuario));

    const { result } = renderHook(() => useTerminosPendientes());

    expect(result.current).toBe(false);
  });

  it('no pregunta a la red: solo lee lo que ya se sabe', () => {
    const red = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new globalThis.Response('{}'));

    const { result } = renderHook(() => useTerminosPendientes());

    expect(result.current).toBe(false);
    expect(red).not.toHaveBeenCalled();
  });
});
