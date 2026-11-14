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
 *   H7c  en silencio y a la vez cambian las deps     | es una carga nueva: espera, y su fallo no es silencioso
 *   H6b  en silencio estando inactiva                | al activarse, la carga espera
 *   H8   recargar                                     | es la misma función en cada pintado
 *   H5b  la vieja falla antes de que React pinte el recargar | no se avisa: ya no es la vigente
 *   H9   recargar() y su carga termina           | su promesa se cumple con el resultado, después de alCargar/alFallar
 *   H10  recargar() y su carga se descarta       | (cambian las deps, se desactiva o se desmonta)
 *                                                | su promesa se cumple como descartada y no se aplica nada
 *   H10b otro recargar() más nuevo la sustituye  | su promesa se cumple con lo que acabe la que la sustituyó
 *        y esa termina                           | ('cargada' con sus datos o 'fallida' con su error)
 *   H10c y a esa la sustituye otra               | se sigue la cadena: todas se cumplen con la última
 *   H10d y la que la sustituyó se descarta       | (cambian las deps, se desactiva o se desmonta) todas, descartadas
 *   H10e recargar() con la carga inactiva        | (ya lo estaba, o se desactiva en el mismo pintado) se cumple
 *                                                | como descartada en ese momento, con las que la siguen
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
      useCargaCancelableEffect(() => pedir(filtro), [filtro, pedir], {
        activa,
        alCargar,
        alFallar,
      }),
    { initialProps: inicial },
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
  const props = (resto) => ({
    filtro: 'a',
    pedir,
    alCargar,
    alFallar,
    ...resto,
  });

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
    pedir
      .mockReturnValueOnce(vieja.promesa)
      .mockReturnValueOnce(new Promise(() => {}));
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

    act(() => {
      result.current.recargar();
    });

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
    pedir
      .mockReturnValueOnce(penultima.promesa)
      .mockReturnValueOnce(ultima.promesa);

    act(() => {
      result.current.recargar();
    });
    act(() => {
      result.current.recargar();
    });
    expect(pedir).toHaveBeenCalledTimes(3);
    await act(async () => penultima.resolver('penultima'));
    expect(result.current.cargando).toBe(true);
    await act(async () => ultima.resolver('ultima'));

    expect(alCargar.mock.calls.map(([d]) => d)).toEqual(['primera', 'ultima']);
    expect(result.current.cargando).toBe(false);
  });

  it('H5: la espera sale ya en el pintado del recargar, sin esperar al efecto', async () => {
    pedir
      .mockResolvedValueOnce('primera')
      .mockReturnValue(new Promise(() => {}));
    const pintados = [];
    const { result } = renderHook(() => {
      const carga = useCargaCancelableEffect(() => pedir(), [], { alCargar });
      pintados.push(carga.cargando);
      return carga;
    });
    await act(async () => {});
    pintados.length = 0;

    act(() => {
      result.current.recargar();
    });

    expect(pintados[0]).toBe(true);
  });

  it('H6: inactiva, no pide y no espera', async () => {
    const { result } = usar(props({ activa: false }));
    await act(async () => {});

    expect(pedir).not.toHaveBeenCalled();
    expect(result.current.cargando).toBe(false);
  });

  it('H6: al activarse por primera vez pide con la espera ya puesta', async () => {
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

    act(() => {
      result.current.recargar({ silenciosa: true });
    });

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

    act(() => {
      result.current.recargar({ silenciosa: true });
    });
    rerender(props({ filtro: 'b' }));

    expect(result.current.cargando).toBe(true);
  });

  it('H7c: si a la vez que se recarga en silencio cambian las dependencias, la carga espera y su fallo no es silencioso', async () => {
    pedir.mockResolvedValueOnce('primera');
    const { result, rerender } = usar(props());
    await act(async () => {});
    const falla = aMano();
    pedir.mockReturnValue(falla.promesa);

    await act(async () => {
      result.current.recargar({ silenciosa: true });
      rerender(props({ filtro: 'b' }));
    });

    expect(result.current.cargando).toBe(true);
    const error = new Error('otro filtro');
    await act(async () => falla.rechazar(error));
    expect(alFallar).toHaveBeenCalledWith(error, { silenciosa: false });
  });

  it('H6b: un recargar en silencio estando inactiva no deja silenciosa la carga al activarse', async () => {
    const { result, rerender } = usar(props({ activa: false }));
    await act(async () => {});
    pedir.mockResolvedValueOnce('datos');

    act(() => {
      result.current.recargar({ silenciosa: true });
    });
    await act(async () => {
      rerender(props({ activa: true }));
    });

    expect(alCargar).toHaveBeenCalledWith('datos', { silenciosa: false });
  });

  it('H8: recargar es la misma función en cada pintado (se pasa como prop)', async () => {
    pedir.mockResolvedValue('datos');
    const { result, rerender } = usar(props());
    const primera = result.current.recargar;
    await act(async () => {});
    rerender(props({ filtro: 'b' }));
    await act(async () => {});

    expect(result.current.recargar).toBe(primera);
  });

  it('H5b: si la vieja falla después de recargar() pero antes de que React lo pinte, no se avisa', async () => {
    const vieja = aMano();
    pedir.mockReturnValueOnce(vieja.promesa);
    const { result } = usar(props());
    pedir.mockReturnValue(new Promise(() => {}));

    // Fuera de act: el recargar queda pendiente de pintar, como tras un await
    result.current.recargar();
    vieja.rechazar(new Error('vieja'));
    await Promise.resolve();
    await Promise.resolve();
    await act(async () => {});

    expect(alFallar).not.toHaveBeenCalled();
    expect(alCargar).not.toHaveBeenCalled();
  });

  // Cómo quedó una promesa sin esperarla: 'pendiente' o su valor
  const estadoDe = (promesa) => {
    const visto = { valor: 'pendiente' };
    promesa.then((valor) => {
      visto.valor = valor;
    });
    return visto;
  };

  it('H9: la promesa de recargar se cumple con los datos de SU carga, después de alCargar', async () => {
    // Given una carga ya hecha
    pedir.mockResolvedValueOnce('primera');
    const { result } = usar(props());
    await act(async () => {});
    const otra = aMano();
    pedir.mockReturnValueOnce(otra.promesa);

    // When se recarga y su carga llega
    let promesa;
    act(() => {
      promesa = result.current.recargar();
    });
    const visto = estadoDe(promesa);
    await act(async () => {});
    expect(visto.valor).toBe('pendiente');
    let aplicadaAntes = false;
    alCargar.mockImplementation(() => {
      aplicadaAntes = visto.valor === 'pendiente';
    });
    await act(async () => otra.resolver('segunda'));

    // Then se cumple con lo que llegó, y alCargar corrió antes
    expect(visto.valor).toEqual({ estado: 'cargada', datos: 'segunda' });
    expect(aplicadaAntes).toBe(true);
  });

  it('H9: si su carga falla, la promesa se cumple (no se rechaza) con el error, después de alFallar', async () => {
    pedir.mockResolvedValueOnce('primera');
    const { result } = usar(props());
    await act(async () => {});
    const falla = aMano();
    pedir.mockReturnValueOnce(falla.promesa);

    let promesa;
    act(() => {
      promesa = result.current.recargar({ silenciosa: true });
    });
    const visto = estadoDe(promesa);
    const error = new Error('sin red');
    await act(async () => falla.rechazar(error));

    expect(visto.valor).toEqual({ estado: 'fallida', error });
    expect(alFallar).toHaveBeenCalledWith(error, { silenciosa: true });
  });

  it('H10b: de dos recargar seguidos, la del primero se cumple con la carga del segundo aunque la suya llegue después', async () => {
    pedir.mockResolvedValueOnce('primera');
    const { result } = usar(props());
    await act(async () => {});
    const penultima = aMano();
    const ultima = aMano();
    pedir
      .mockReturnValueOnce(penultima.promesa)
      .mockReturnValueOnce(ultima.promesa);

    let primera;
    let segunda;
    act(() => {
      primera = result.current.recargar();
    });
    act(() => {
      segunda = result.current.recargar();
    });
    const vistaPrimera = estadoDe(primera);
    const vistaSegunda = estadoDe(segunda);
    await act(async () => ultima.resolver('ultima'));
    await act(async () => penultima.resolver('penultima'));

    expect(vistaPrimera.valor).toEqual({ estado: 'cargada', datos: 'ultima' });
    expect(vistaSegunda.valor).toEqual({ estado: 'cargada', datos: 'ultima' });
    expect(alCargar.mock.calls.map(([d]) => d)).toEqual(['primera', 'ultima']);
  });

  it('H10b: dos recargar en el mismo pintado: la del primero se cumple con la carga del segundo', async () => {
    pedir.mockResolvedValueOnce('primera');
    const { result } = usar(props());
    await act(async () => {});
    pedir.mockResolvedValueOnce('segunda');

    let primera;
    let segunda;
    await act(async () => {
      primera = result.current.recargar();
      segunda = result.current.recargar({ silenciosa: true });
    });

    await expect(primera).resolves.toEqual({
      estado: 'cargada',
      datos: 'segunda',
    });
    await expect(segunda).resolves.toEqual({
      estado: 'cargada',
      datos: 'segunda',
    });
  });

  it('H10: si cambian las dependencias con su carga en vuelo, se cumple como descartada y no aplica nada', async () => {
    pedir.mockResolvedValueOnce('primera');
    const { result, rerender } = usar(props());
    await act(async () => {});
    const vieja = aMano();
    pedir
      .mockReturnValueOnce(vieja.promesa)
      .mockReturnValueOnce(new Promise(() => {}));

    let promesa;
    act(() => {
      promesa = result.current.recargar({ silenciosa: true });
    });
    const visto = estadoDe(promesa);
    rerender(props({ filtro: 'b' }));
    await act(async () => {});

    // Se cumple ya al descartarse, sin esperar a que llegue la vieja
    expect(visto.valor).toEqual({ estado: 'descartada' });
    await act(async () => vieja.resolver('vieja'));
    expect(visto.valor).toEqual({ estado: 'descartada' });
    expect(alCargar.mock.calls.map(([d]) => d)).toEqual(['primera']);
  });

  it('H10: si se desmonta con su carga en vuelo, se cumple como descartada y su fallo no se avisa', async () => {
    pedir.mockResolvedValueOnce('primera');
    const { result, unmount } = usar(props());
    await act(async () => {});
    const falla = aMano();
    pedir.mockReturnValueOnce(falla.promesa);

    let promesa;
    act(() => {
      promesa = result.current.recargar();
    });
    const visto = estadoDe(promesa);
    unmount();
    await act(async () => falla.rechazar(new Error('tarde')));

    expect(visto.valor).toEqual({ estado: 'descartada' });
    expect(alFallar).not.toHaveBeenCalled();
  });

  it('H10: si se desactiva con su carga en vuelo, se cumple como descartada', async () => {
    pedir.mockResolvedValueOnce('primera');
    const { result, rerender } = usar(props());
    await act(async () => {});
    pedir.mockReturnValueOnce(new Promise(() => {}));

    let promesa;
    act(() => {
      promesa = result.current.recargar();
    });
    rerender(props({ activa: false }));

    await expect(promesa).resolves.toEqual({ estado: 'descartada' });
  });

  it('H10: un recargar estando inactiva no llega a pedir y se cumple como descartada ya, sin esperar a desmontar', async () => {
    const { result } = usar(props({ activa: false }));
    await act(async () => {});

    let promesa;
    act(() => {
      promesa = result.current.recargar();
    });
    const visto = estadoDe(promesa);
    await act(async () => {});

    expect(visto.valor).toEqual({ estado: 'descartada' });
    expect(pedir).not.toHaveBeenCalled();
  });

  it('H10e: recargar y desactivarse en el mismo pintado: se cumple como descartada', async () => {
    pedir.mockResolvedValueOnce('primera');
    const { result, rerender } = usar(props());
    await act(async () => {});
    pedir.mockReturnValue(new Promise(() => {}));

    let promesa;
    act(() => {
      promesa = result.current.recargar();
      rerender(props({ activa: false }));
    });
    const visto = estadoDe(promesa);
    await act(async () => {});

    expect(visto.valor).toEqual({ estado: 'descartada' });
    expect(pedir).toHaveBeenCalledTimes(1);
  });

  it('H10e: con una recarga en vuelo, otro recargar y desactivarse en el mismo pintado: las dos, descartadas', async () => {
    const { vistas, result, rerender } = await recargasSeguidas(1);

    act(() => {
      vistas.push(estadoDe(result.current.recargar()));
      rerender(props({ activa: false }));
    });
    await act(async () => {});

    expect(vistas[0].valor).toEqual({ estado: 'descartada' });
    expect(vistas[1].valor).toEqual({ estado: 'descartada' });
    expect(pedir).toHaveBeenCalledTimes(2);
  });

  it('H10: si la vieja falla antes de que React pinte el recargar, la promesa nueva no se cumple con ese fallo', async () => {
    const vieja = aMano();
    pedir.mockReturnValueOnce(vieja.promesa);
    const { result } = usar(props());
    const nueva = aMano();
    pedir.mockReturnValue(nueva.promesa);

    const promesa = result.current.recargar();
    const visto = estadoDe(promesa);
    vieja.rechazar(new Error('vieja'));
    await Promise.resolve();
    await Promise.resolve();
    await act(async () => {});
    expect(visto.valor).toBe('pendiente');

    await act(async () => nueva.resolver('nueva'));
    expect(visto.valor).toEqual({ estado: 'cargada', datos: 'nueva' });
  });

  // Dos o tres `recargar()` seguidos, cada uno en su pintado, con sus cargas a mano
  const recargasSeguidas = async (cuantas) => {
    pedir.mockResolvedValueOnce('primera');
    const utiles = usar(props());
    await act(async () => {});
    const cargas = Array.from({ length: cuantas }, aMano);
    cargas.forEach((carga) => pedir.mockReturnValueOnce(carga.promesa));
    const vistas = [];
    for (let i = 0; i < cuantas; i += 1) {
      act(() => {
        vistas.push(
          estadoDe(utiles.result.current.recargar({ silenciosa: i % 2 === 1 })),
        );
      });
    }
    return { ...utiles, cargas, vistas };
  };

  it('H10b: la sustituida no se cumple hasta que termina la que la sustituyó, y se cumple con sus datos', async () => {
    // Given recargar() A sustituido por recargar() B
    const { cargas, vistas } = await recargasSeguidas(2);
    const [cargaA, cargaB] = cargas;
    const [vistaA, vistaB] = vistas;

    // When la de A llega antes: ya no se aplica, y A sigue esperando
    await act(async () => cargaA.resolver('de A'));
    expect(vistaA.valor).toBe('pendiente');
    expect(alCargar.mock.calls.map(([d]) => d)).toEqual(['primera']);

    // When termina la de B
    await act(async () => cargaB.resolver('de B'));

    // Then A se cumple con lo de B
    expect(vistaA.valor).toEqual({ estado: 'cargada', datos: 'de B' });
    expect(vistaB.valor).toEqual({ estado: 'cargada', datos: 'de B' });
    expect(alCargar.mock.calls.map(([d]) => d)).toEqual(['primera', 'de B']);
  });

  it('H10b: si la que la sustituyó falla, la sustituida se cumple (no se rechaza) con ese error', async () => {
    const { cargas, vistas } = await recargasSeguidas(2);
    const [cargaA, cargaB] = cargas;
    const [vistaA, vistaB] = vistas;

    const error = new Error('sin red');
    await act(async () => cargaB.rechazar(error));
    await act(async () => cargaA.rechazar(new Error('tarde')));

    expect(vistaA.valor).toEqual({ estado: 'fallida', error });
    expect(vistaB.valor).toEqual({ estado: 'fallida', error });
    expect(alFallar).toHaveBeenCalledTimes(1);
    expect(alFallar).toHaveBeenCalledWith(error, { silenciosa: true });
  });

  it('H10c: si a la que la sustituyó la sustituye otra, se sigue la cadena hasta la última', async () => {
    // Given A sustituido por B, y B por C
    const { cargas, vistas } = await recargasSeguidas(3);
    const [cargaA, cargaB, cargaC] = cargas;
    const [vistaA, vistaB, vistaC] = vistas;

    // When llegan las de A y B, ya sustituidas
    await act(async () => cargaB.resolver('de B'));
    await act(async () => cargaA.resolver('de A'));
    expect(vistaA.valor).toBe('pendiente');
    expect(vistaB.valor).toBe('pendiente');

    // When termina la de C
    await act(async () => cargaC.resolver('de C'));

    // Then A, B y C se cumplen con lo de C
    expect(vistaA.valor).toEqual({ estado: 'cargada', datos: 'de C' });
    expect(vistaB.valor).toEqual({ estado: 'cargada', datos: 'de C' });
    expect(vistaC.valor).toEqual({ estado: 'cargada', datos: 'de C' });
    expect(alCargar.mock.calls.map(([d]) => d)).toEqual(['primera', 'de C']);
  });

  it('H10c: con la última fallida, toda la cadena se cumple con su error', async () => {
    const { cargas, vistas } = await recargasSeguidas(3);
    const error = new Error('caída');

    await act(async () => cargas[2].rechazar(error));

    vistas.forEach((vista) =>
      expect(vista.valor).toEqual({ estado: 'fallida', error }),
    );
  });

  it('H10d: si cambian las dependencias antes de que termine la que la sustituyó, las dos se cumplen como descartadas', async () => {
    // Given A sustituido por B, con la de B en vuelo
    const { cargas, vistas, rerender } = await recargasSeguidas(2);
    pedir.mockReturnValueOnce(new Promise(() => {}));

    // When cambian las dependencias
    rerender(props({ filtro: 'b' }));
    await act(async () => {});

    // Then A y B, descartadas ya, y lo de B que llega tarde no cambia nada
    expect(vistas[0].valor).toEqual({ estado: 'descartada' });
    expect(vistas[1].valor).toEqual({ estado: 'descartada' });
    await act(async () => cargas[1].resolver('de B'));
    expect(vistas[0].valor).toEqual({ estado: 'descartada' });
    expect(alCargar.mock.calls.map(([d]) => d)).toEqual(['primera']);
  });

  it('H10d: si se desmonta antes de que termine la que la sustituyó, las dos se cumplen como descartadas', async () => {
    const { cargas, vistas, unmount } = await recargasSeguidas(2);

    unmount();
    await act(async () => cargas[1].rechazar(new Error('tarde')));

    expect(vistas[0].valor).toEqual({ estado: 'descartada' });
    expect(vistas[1].valor).toEqual({ estado: 'descartada' });
    expect(alFallar).not.toHaveBeenCalled();
  });

  it('H10d: si se desactiva antes de que termine la que la sustituyó, las dos se cumplen como descartadas', async () => {
    const { vistas, rerender } = await recargasSeguidas(2);

    rerender(props({ activa: false }));
    await act(async () => {});

    expect(vistas[0].valor).toEqual({ estado: 'descartada' });
    expect(vistas[1].valor).toEqual({ estado: 'descartada' });
  });

  it('H10d: un recargar estando inactiva y el que lo sustituye se cumplen como descartados ya, sin esperar a desmontar', async () => {
    const { result } = usar(props({ activa: false }));
    await act(async () => {});
    const vistas = [];
    act(() => {
      vistas.push(estadoDe(result.current.recargar()));
    });
    act(() => {
      vistas.push(estadoDe(result.current.recargar()));
    });

    await act(async () => {});

    expect(vistas[0].valor).toEqual({ estado: 'descartada' });
    expect(vistas[1].valor).toEqual({ estado: 'descartada' });
    expect(pedir).not.toHaveBeenCalled();
  });
});
