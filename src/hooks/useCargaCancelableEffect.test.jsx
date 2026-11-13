import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCargaCancelableEffect } from './useCargaCancelableEffect';

/**
 * Una carga que vive en su efecto y descarta lo que llega tarde: al cambiar
 * sus dependencias, al volver a pedirla o al desmontar, la respuesta anterior
 * ya no toca nada, ni la espera de la actual.
 *
 *   #    caso                                         | qué pasa
 *   -----|--------------------------------------------|----------------------------------
 *   H1   la carga llega                              | se aplica y se quita la espera
 *   H2   cambian las dependencias con una en vuelo   | la vieja ni se aplica ni quita la espera
 *   H3   se desmonta con una en vuelo                | ni su respuesta ni su fallo tocan nada
 *   H4   la carga falla                              | se avisa solo si sigue siendo la actual
 *   H5   recargar()                                  | se pide otra vez con la espera; de dos seguidas, solo la última
 *   H6   inactiva                                    | no pide y no espera
 *   H7   recargar({ silenciosa: true })              | sin espera, y el fallo lo sabe
 *   H7b  y después cambian las dependencias          | esa carga ya no es silenciosa: espera
 */
// Una respuesta que llega cuando la prueba quiere
const aMano = () => {
  let resolver;
  let rechazar;
  const promesa = new Promise((res, rej) => {
    resolver = res;
    rechazar = rej;
  });
  return { promesa, resolver, rechazar };
};

const usar = (inicial) =>
  renderHook(
    ({ filtro, activa = true, pedir, alCargar, alFallar }) =>
      useCargaCancelableEffect(() => pedir(filtro), [filtro, pedir], { activa, alCargar, alFallar }),
    { initialProps: inicial }
  );

describe('useCargaCancelableEffect', () => {
  let pedir;
  let alCargar;
  let alFallar;
  beforeEach(() => {
    pedir = vi.fn();
    alCargar = vi.fn();
    alFallar = vi.fn();
  });
  const props = (resto) => ({ filtro: 'a', pedir, alCargar, alFallar, ...resto });

  it('H1: cuando llega, se aplica y se quita la espera', async () => {
    // Given una carga en vuelo
    const llega = aMano();
    pedir.mockReturnValueOnce(llega.promesa);
    const { result } = usar(props());
    expect(result.current.cargando).toBe(true);
    expect(pedir).toHaveBeenCalledWith('a');

    // When llega
    await act(async () => llega.resolver('datos'));

    // Then se aplica y sin espera
    expect(alCargar).toHaveBeenCalledWith('datos', { silenciosa: false });
    expect(result.current.cargando).toBe(false);
    expect(alFallar).not.toHaveBeenCalled();
  });

  it('H2: si cambian las dependencias, la vieja no se aplica ni quita la espera de la nueva', async () => {
    // Given una carga en vuelo
    const vieja = aMano();
    const nueva = aMano();
    pedir.mockReturnValueOnce(vieja.promesa).mockReturnValueOnce(nueva.promesa);
    const { result, rerender } = usar(props());

    // When cambian las dependencias, y la vieja llega antes
    rerender(props({ filtro: 'b' }));
    expect(pedir).toHaveBeenLastCalledWith('b');
    expect(result.current.cargando).toBe(true);
    await act(async () => vieja.resolver('vieja'));

    // Then ni se aplica ni quita la espera
    expect(alCargar).not.toHaveBeenCalled();
    expect(result.current.cargando).toBe(true);
    await act(async () => nueva.resolver('nueva'));
    expect(alCargar).toHaveBeenCalledTimes(1);
    expect(alCargar).toHaveBeenCalledWith('nueva', { silenciosa: false });
    expect(result.current.cargando).toBe(false);
  });

  it('H2: al cambiar las dependencias la espera sale con el efecto, antes de que llegue la nueva', async () => {
    pedir.mockResolvedValue('datos');
    const { result, rerender } = usar(props());
    await act(async () => {});
    expect(result.current.cargando).toBe(false);
    pedir.mockReturnValueOnce(new Promise(() => {}));

    rerender(props({ filtro: 'b' }));

    expect(result.current.cargando).toBe(true);
  });

  it('H2: si las dependencias no cambian, no se vuelve a pedir', async () => {
    pedir.mockResolvedValue('datos');
    const { rerender } = usar(props());
    await act(async () => {});

    rerender(props());
    await act(async () => {});

    expect(pedir).toHaveBeenCalledTimes(1);
  });

  it('H3: si se desmonta, ni su respuesta ni su fallo tocan nada', async () => {
    const una = aMano();
    const otra = aMano();
    pedir.mockReturnValueOnce(una.promesa);
    const primero = usar(props());
    primero.unmount();
    await act(async () => una.resolver('tarde'));

    pedir.mockReturnValueOnce(otra.promesa);
    const segundo = usar(props());
    segundo.unmount();
    await act(async () => otra.rechazar(new Error('tarde')));

    expect(alCargar).not.toHaveBeenCalled();
    expect(alFallar).not.toHaveBeenCalled();
  });

  it('H4: el fallo de la actual se avisa y quita la espera', async () => {
    const falla = aMano();
    pedir.mockReturnValueOnce(falla.promesa);
    const { result } = usar(props());

    const error = new Error('sin red');
    await act(async () => falla.rechazar(error));

    expect(alFallar).toHaveBeenCalledWith(error, { silenciosa: false });
    expect(alCargar).not.toHaveBeenCalled();
    expect(result.current.cargando).toBe(false);
  });

  it('H4: el fallo de una vieja no se avisa ni quita la espera', async () => {
    const vieja = aMano();
    pedir.mockReturnValueOnce(vieja.promesa).mockReturnValueOnce(new Promise(() => {}));
    const { result, rerender } = usar(props());
    rerender(props({ filtro: 'b' }));

    await act(async () => vieja.rechazar(new Error('vieja')));

    expect(alFallar).not.toHaveBeenCalled();
    expect(result.current.cargando).toBe(true);
  });

  it('H5: recargar pide otra vez, con la espera', async () => {
    pedir.mockResolvedValueOnce('primera');
    const { result } = usar(props());
    await act(async () => {});
    expect(result.current.cargando).toBe(false);
    const otra = aMano();
    pedir.mockReturnValueOnce(otra.promesa);

    act(() => result.current.recargar());

    expect(pedir).toHaveBeenCalledTimes(2);
    expect(result.current.cargando).toBe(true);
    await act(async () => otra.resolver('segunda'));
    expect(alCargar).toHaveBeenLastCalledWith('segunda', { silenciosa: false });
    expect(result.current.cargando).toBe(false);
  });

  it('H5: de dos recargar seguidos solo se aplica el último', async () => {
    pedir.mockResolvedValueOnce('primera');
    const { result } = usar(props());
    await act(async () => {});
    const penultima = aMano();
    const ultima = aMano();
    pedir.mockReturnValueOnce(penultima.promesa).mockReturnValueOnce(ultima.promesa);

    act(() => result.current.recargar());
    act(() => result.current.recargar());
    expect(pedir).toHaveBeenCalledTimes(3);
    await act(async () => penultima.resolver('penultima'));
    expect(result.current.cargando).toBe(true);
    await act(async () => ultima.resolver('ultima'));

    expect(alCargar.mock.calls.map(([d]) => d)).toEqual(['primera', 'ultima']);
    expect(result.current.cargando).toBe(false);
  });

  it('H5: la espera sale ya en el pintado del recargar, sin esperar al efecto', async () => {
    pedir.mockResolvedValueOnce('primera').mockReturnValue(new Promise(() => {}));
    const pintados = [];
    const { result } = renderHook(() => {
      const carga = useCargaCancelableEffect(() => pedir(), [], { alCargar });
      pintados.push(carga.cargando);
      return carga;
    });
    await act(async () => {});
    pintados.length = 0;

    act(() => result.current.recargar());

    expect(pintados[0]).toBe(true);
  });

  it('H6: inactiva, no pide y no espera', async () => {
    const { result } = usar(props({ activa: false }));
    await act(async () => {});

    expect(pedir).not.toHaveBeenCalled();
    expect(result.current.cargando).toBe(false);
  });

  it('H6: al activarse pide con la espera ya en ese pintado', async () => {
    const llega = aMano();
    pedir.mockReturnValueOnce(llega.promesa);
    const { result, rerender } = usar(props({ activa: false }));

    rerender(props({ activa: true }));

    expect(result.current.cargando).toBe(true);
    expect(pedir).toHaveBeenCalledTimes(1);
    await act(async () => llega.resolver('datos'));
    expect(result.current.cargando).toBe(false);
  });

  it('H6: si se desactiva con una en vuelo, deja de esperar y lo que llegue no se aplica', async () => {
    const llega = aMano();
    pedir.mockReturnValueOnce(llega.promesa);
    const { result, rerender } = usar(props());

    rerender(props({ activa: false }));
    expect(result.current.cargando).toBe(false);
    await act(async () => llega.resolver('tarde'));

    expect(alCargar).not.toHaveBeenCalled();
    expect(result.current.cargando).toBe(false);
  });

  it('H7: recargar en silencio pide sin la espera, y el fallo lo sabe', async () => {
    pedir.mockResolvedValueOnce('primera');
    const { result } = usar(props());
    await act(async () => {});
    const falla = aMano();
    pedir.mockReturnValueOnce(falla.promesa);

    act(() => result.current.recargar({ silenciosa: true }));

    expect(pedir).toHaveBeenCalledTimes(2);
    expect(result.current.cargando).toBe(false);
    const error = new Error('sin red');
    await act(async () => falla.rechazar(error));
    expect(alFallar).toHaveBeenCalledWith(error, { silenciosa: true });
  });

  it('H7b: si tras recargar en silencio cambian las dependencias, esa carga sí espera', async () => {
    pedir.mockResolvedValueOnce('primera');
    const { result, rerender } = usar(props());
    await act(async () => {});
    pedir.mockReturnValue(new Promise(() => {}));

    act(() => result.current.recargar({ silenciosa: true }));
    rerender(props({ filtro: 'b' }));

    expect(result.current.cargando).toBe(true);
  });
});
