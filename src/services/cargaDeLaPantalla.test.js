import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Lo común de los `loader` de las pantallas (FE #647, fase 3; caminos C1-C17 y
 * tabla de Torneos aprobados el 2 nov 2026). Nunca lanza: lo que pasó va en
 * `estado`, y la pantalla decide qué enseñar.
 *
 *   #   | caso                                        | esperado
 *   ----|---------------------------------------------|----------------------------------------
 *   T1  | responde                                    | ok, con los datos; quedan en memoria
 *   T3  | sin red, nada en memoria                    | sinRed, sin datos
 *   T4  | sin red, con lo de antes en memoria         | sinRed, con lo de antes
 *   T5  | no responde en 4 s                          | sinRed (con lo de antes, si hay)
 *   T6  | 429 / 5xx, nada en memoria                  | error, sin datos
 *   T7  | 429 / 5xx, con lo de antes                  | error, con lo de antes
 *   C1  | un fallo no borra la memoria                | lo de antes sigue para la próxima
 *   T12 | sin sesión                                  | sinSesion, sin pedir nada
 *   T13 | términos sin aceptar                        | sinSesion, sin pedir nada
 *   C2  | pide con el usuario de la sesión            | `pedir` lo recibe
 *
 * Lo que añadió el revisor (2 nov 2026):
 *
 *   T27 | la primera carga de la aplicación            | pendiente, al momento y sin pedir nada: la
 *       |                                              | pantalla carga como hoy, con la carcasa puesta
 *   T28 | la sesión no contesta en 4 s                  | sinRed: el tope lo cubre todo
 *   T29 | la lista llega después del tope               | se guarda, y `tardia` la entrega
 *   T30 | se cierra sesión mientras se pide             | no se guarda
 *
 * Y el segundo revisor:
 *
 *   T28 | la sesión no contesta en 4 s                  | sinSesion: la pantalla vuelve a pedir al
 *       |                                              | saberse quién es (con sinRed se quedaba)
 *
 * Y `/code-review`:
 *
 *   T28 | la sesión no contesta en 4 s, ya se sabía      | sinRed, con lo de antes en memoria
 *       | quién era                                     | (sinSesion lo perdía, y la espera no acababa)
 *   T28c| ídem, sin saber quién es                      | sinSesion (la pantalla pide al saberse)
 *   T42 | dos cargas a la vez de la misma lista         | una sola petición
 *   T42c| una que no contesta, pasado el tope           | la siguiente carga pide de nuevo
 *   T43 | Reintentar y se navega antes de que pida      | la marca de volver a pedir se olvida
 *   T39 | cualquier fallo que no sea el tope            | a la consola, como antes, con su nombre
 *
 * Y el tercer revisor (2 nov 2026):
 *
 *   C5  | la comprobación del router no gasta la marca  | si otra navegación corta la recarga, la
 *       |                                              | siguiente sigue pidiendo; la gasta la
 *       |                                              | pantalla al recibir la carga
 *   C8  | con la marca, una petición vieja en camino    | se pide una nueva, no se comparte
 *   C8c | varias cargas con la misma marca (toques en   | una sola nueva: las demás la comparten
 *       | la pestaña mientras se vuelve a pedir)        | (cuarto revisor: gastaban el cupo)
 *   C8d | la marca se olvida antes de que la carga     | la carga que ya la vio pide nueva igual
 *       | pregunte por la sesión                        |
 *   C10 | la sesión no contesta, se sabía quién era y  | sinSesion: el guardia lleva a aceptarlos
 *       | le faltan los Términos                        |
 */
const sesion = vi.hoisted(() => ({
  user: { id: 'u-1' },
  consulta: null,
  ahora: undefined,
}));
vi.mock('./sesionCompartida', () => ({
  consultaLaSesion: () => sesion.consulta ?? Promise.resolve(sesion.user),
  loQueHaySobreLaSesion: () => ({
    user: sesion.ahora === undefined ? sesion.user : sesion.ahora,
  }),
}));

const {
  cargaDeLaPantalla,
  marcaElArranque,
  olvidaLoQueEstaEnCamino,
  olvidaQueSeVuelveAPedir,
  pideOtraVez,
  soloSiSePideOtraVez,
  TOPE_DE_LA_CARGA_MS,
} = await import('./cargaDeLaPantalla');
const { loGuardadoEnMemoria } = await import('./memoriaDeLasListas');
const { olvidaTodo } = await import('./loUltimoConocido');

const sinRed = () => new TypeError('Failed to fetch');
const delServidor = (status) =>
  Object.assign(new Error('Rate limit exceeded'), { status });
const carga = (pedir) => cargaDeLaPantalla({ clave: 'competiciones', pedir });

describe('cargaDeLaPantalla', () => {
  beforeEach(() => {
    olvidaTodo();
    sesion.user = { id: 'u-1' };
    sesion.consulta = null;
    sesion.ahora = undefined;
    marcaElArranque(true);
    olvidaLoQueEstaEnCamino();
    Object.defineProperty(globalThis.navigator, 'onLine', {
      value: true,
      configurable: true,
    });
  });
  afterEach(() => vi.useRealTimers());

  it('T1: responde: ok con los datos', async () => {
    expect(await carga(async () => [{ id: 'c-1' }])).toEqual({
      estado: 'ok',
      datos: [{ id: 'c-1' }],
      usuarioId: 'u-1',
    });
  });

  it('C2: pide con el usuario de la sesión', async () => {
    const pedir = vi.fn(async () => []);
    await carga(pedir);

    expect(pedir).toHaveBeenCalledWith({ id: 'u-1' });
  });

  it('T3: sin red y nada en memoria: sinRed sin datos', async () => {
    expect(
      await carga(async () => {
        throw sinRed();
      }),
    ).toEqual({ estado: 'sinRed', datos: null, usuarioId: 'u-1' });
  });

  it('T4: sin red con lo de antes: sinRed con lo de antes', async () => {
    await carga(async () => [{ id: 'c-1' }]);

    expect(
      await carga(async () => {
        throw sinRed();
      }),
    ).toEqual({ estado: 'sinRed', datos: [{ id: 'c-1' }], usuarioId: 'u-1' });
  });

  it('T5: sin respuesta en 4 s: sinRed, con lo de antes', async () => {
    await carga(async () => [{ id: 'c-1' }]);
    vi.useFakeTimers();

    const resultado = carga(() => new Promise(() => {}));
    await vi.advanceTimersByTimeAsync(TOPE_DE_LA_CARGA_MS);

    expect(TOPE_DE_LA_CARGA_MS).toBe(4000);
    expect(await resultado).toMatchObject({
      estado: 'sinRed',
      datos: [{ id: 'c-1' }],
    });
  });

  it('T5b: antes de los 4 s aún espera', async () => {
    vi.useFakeTimers();
    let resuelta = false;
    carga(() => new Promise(() => {})).then(() => {
      resuelta = true;
    });

    await vi.advanceTimersByTimeAsync(TOPE_DE_LA_CARGA_MS - 1);

    expect(resuelta).toBe(false);
  });

  it('T6: 429 y nada en memoria: error sin datos', async () => {
    expect(
      await carga(async () => {
        throw delServidor(429);
      }),
    ).toEqual({ estado: 'error', datos: null, usuarioId: 'u-1' });
  });

  it('T7: 500 con lo de antes: error con lo de antes', async () => {
    await carga(async () => [{ id: 'c-1' }]);

    expect(
      await carga(async () => {
        throw delServidor(500);
      }),
    ).toEqual({ estado: 'error', datos: [{ id: 'c-1' }], usuarioId: 'u-1' });
  });

  it('C1: un fallo no borra lo de antes', async () => {
    await carga(async () => [{ id: 'c-1' }]);
    await carga(async () => {
      throw delServidor(500);
    });

    expect(
      await carga(async () => {
        throw sinRed();
      }),
    ).toEqual({ estado: 'sinRed', datos: [{ id: 'c-1' }], usuarioId: 'u-1' });
  });

  it('T12: sin sesión no se pide nada', async () => {
    sesion.user = null;
    const pedir = vi.fn();

    expect(await carga(pedir)).toEqual({ estado: 'sinSesion', datos: null });
    expect(pedir).not.toHaveBeenCalled();
  });

  it('T27: en la primera carga de la aplicación, pendiente al momento y sin pedir nada', async () => {
    marcaElArranque(false);
    sesion.consulta = new Promise(() => {});
    const pedir = vi.fn();

    expect(await carga(pedir)).toEqual({ estado: 'pendiente', datos: null });
    expect(pedir).not.toHaveBeenCalled();
  });

  it('T28c: si la sesión no contesta en 4 s y no se sabe quién es, sinSesion', async () => {
    vi.useFakeTimers();
    sesion.consulta = new Promise(() => {});
    sesion.ahora = null;
    const pedir = vi.fn();

    const resultado = carga(pedir);
    await vi.advanceTimersByTimeAsync(TOPE_DE_LA_CARGA_MS);

    expect(await resultado).toEqual({ estado: 'sinSesion', datos: null });
    expect(pedir).not.toHaveBeenCalled();
  });

  it('T28: si la sesión no contesta en 4 s y ya se sabía quién era, sinRed con lo de antes', async () => {
    await carga(async () => [{ id: 'c-1' }]);
    vi.useFakeTimers();
    sesion.consulta = new Promise(() => {});

    const resultado = carga(vi.fn());
    await vi.advanceTimersByTimeAsync(TOPE_DE_LA_CARGA_MS);

    expect(await resultado).toEqual({
      estado: 'sinRed',
      datos: [{ id: 'c-1' }],
      usuarioId: 'u-1',
    });
  });

  it('T42: dos cargas a la vez de la misma lista, una sola petición', async () => {
    let responde;
    const pedir = vi.fn(
      () =>
        new Promise((r) => {
          responde = r;
        }),
    );

    const una = carga(pedir);
    const otra = carga(pedir);
    await vi.waitFor(() => expect(pedir).toHaveBeenCalled());
    responde([{ id: 'c-1' }]);

    expect(await una).toEqual({
      estado: 'ok',
      datos: [{ id: 'c-1' }],
      usuarioId: 'u-1',
    });
    expect(await otra).toEqual({
      estado: 'ok',
      datos: [{ id: 'c-1' }],
      usuarioId: 'u-1',
    });
    expect(pedir).toHaveBeenCalledTimes(1);
  });

  it('T42b: acabada una, la siguiente sí pide', async () => {
    const pedir = vi.fn(async () => []);

    await carga(pedir);
    await carga(pedir);

    expect(pedir).toHaveBeenCalledTimes(2);
  });

  it('T42c: pasado el tope, la siguiente carga pide de nuevo', async () => {
    vi.useFakeTimers();
    const pedir = vi.fn(() => new Promise(() => {}));
    const primera = carga(pedir);
    await vi.advanceTimersByTimeAsync(TOPE_DE_LA_CARGA_MS);
    await primera;

    carga(pedir);
    await vi.advanceTimersByTimeAsync(1);

    expect(pedir).toHaveBeenCalledTimes(2);
  });

  it('T43: la marca de volver a pedir se olvida si no se llegó a usar', () => {
    pideOtraVez({ revalidate: () => {} });

    olvidaQueSeVuelveAPedir();

    expect(soloSiSePideOtraVez()).toBe(false);
  });

  it('T28b: sesión y lista comparten los 4 s', async () => {
    vi.useFakeTimers();
    let sesionLista;
    sesion.consulta = new Promise((r) => {
      sesionLista = r;
    });
    const resultado = carga(() => new Promise(() => {}));

    await vi.advanceTimersByTimeAsync(3000);
    sesionLista({ id: 'u-1' });
    await vi.advanceTimersByTimeAsync(1000);

    expect(await resultado).toMatchObject({ estado: 'sinRed' });
  });

  it('T29: la lista que llega tras el tope se guarda y la entrega `tardia`', async () => {
    vi.useFakeTimers();
    let responde;
    const resultado = carga(
      () =>
        new Promise((r) => {
          responde = r;
        }),
    );
    await vi.advanceTimersByTimeAsync(TOPE_DE_LA_CARGA_MS);
    const { estado, tardia } = await resultado;

    responde([{ id: 'c-9' }]);

    expect(estado).toBe('sinRed');
    expect(await tardia).toEqual([{ id: 'c-9' }]);
    expect(loGuardadoEnMemoria('competiciones', 'u-1')).toEqual([
      { id: 'c-9' },
    ]);
  });

  it('T29b: si al final falla, `tardia` no entrega nada y no rompe', async () => {
    vi.useFakeTimers();
    let falla;
    const resultado = carga(
      () =>
        new Promise((_, r) => {
          falla = r;
        }),
    );
    await vi.advanceTimersByTimeAsync(TOPE_DE_LA_CARGA_MS);
    const { tardia } = await resultado;
    let entregada = false;
    tardia.then(() => {
      entregada = true;
    });

    falla(sinRed());
    await vi.advanceTimersByTimeAsync(10);

    expect(entregada).toBe(false);
  });

  it('T30: si se cierra sesión mientras se pide, no se guarda', async () => {
    await carga(async () => {
      sesion.ahora = null;
      return [{ id: 'c-1' }];
    });

    expect(loGuardadoEnMemoria('competiciones', 'u-1')).toBeNull();
  });

  it('T39: los fallos van a la consola como antes, también los de red', async () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fallo = sinRed();

    await cargaDeLaPantalla({
      clave: 'competitions',
      pedir: async () => {
        throw fallo;
      },
    });

    expect(consola).toHaveBeenCalledWith('Error loading competitions:', fallo);
    consola.mockRestore();
  });

  it('T13: con los términos sin aceptar no se pide nada', async () => {
    sesion.user = { id: 'u-1', terms_accepted: false };
    const pedir = vi.fn();

    expect(await carga(pedir)).toEqual({ estado: 'sinSesion', datos: null });
    expect(pedir).not.toHaveBeenCalled();
  });

  it('C5: la comprobación del router no gasta la marca', () => {
    pideOtraVez({ revalidate: () => {} });

    expect(soloSiSePideOtraVez()).toBe(true);
    expect(soloSiSePideOtraVez()).toBe(true);
    olvidaQueSeVuelveAPedir();
    expect(soloSiSePideOtraVez()).toBe(false);
  });

  it('C8: con la marca puesta, una petición vieja en camino no se comparte', async () => {
    const pedir = vi
      .fn()
      .mockReturnValueOnce(new Promise(() => {}))
      .mockResolvedValue([{ id: 'c-1' }]);
    carga(pedir);
    await vi.waitFor(() => expect(pedir).toHaveBeenCalledTimes(1));

    pideOtraVez({ revalidate: () => {} });

    expect(await carga(pedir)).toEqual({
      estado: 'ok',
      datos: [{ id: 'c-1' }],
      usuarioId: 'u-1',
    });
    expect(pedir).toHaveBeenCalledTimes(2);
    olvidaQueSeVuelveAPedir();
  });

  it('C8b: la nueva queda para compartir con la siguiente sin marca', async () => {
    let responde;
    const pedir = vi
      .fn()
      .mockReturnValueOnce(new Promise(() => {}))
      .mockImplementation(
        () =>
          new Promise((r) => {
            responde = r;
          }),
      );
    carga(pedir);
    await vi.waitFor(() => expect(pedir).toHaveBeenCalledTimes(1));
    pideOtraVez({ revalidate: () => {} });
    const nueva = carga(pedir);
    await vi.waitFor(() => expect(pedir).toHaveBeenCalledTimes(2));
    olvidaQueSeVuelveAPedir();

    const otra = carga(pedir);
    // Que llegue a unirse antes de que conteste
    await new Promise((r) => setTimeout(r, 0));
    responde([{ id: 'c-1' }]);

    expect(await nueva).toEqual({
      estado: 'ok',
      datos: [{ id: 'c-1' }],
      usuarioId: 'u-1',
    });
    expect(await otra).toEqual({
      estado: 'ok',
      datos: [{ id: 'c-1' }],
      usuarioId: 'u-1',
    });
    expect(pedir).toHaveBeenCalledTimes(2);
  });

  it('C10: la sesión no contesta y a quien se sabía le faltan los Términos: sinSesion', async () => {
    vi.useFakeTimers();
    sesion.consulta = new Promise(() => {});
    sesion.ahora = { id: 'u-1', terms_accepted: false };
    const pedir = vi.fn();

    const resultado = carga(pedir);
    await vi.advanceTimersByTimeAsync(TOPE_DE_LA_CARGA_MS);

    expect(await resultado).toEqual({ estado: 'sinSesion', datos: null });
    expect(pedir).not.toHaveBeenCalled();
  });

  it('C8c: varias cargas con la misma marca, una sola petición nueva', async () => {
    let responde;
    const pedir = vi
      .fn()
      .mockReturnValueOnce(new Promise(() => {}))
      .mockImplementation(
        () =>
          new Promise((r) => {
            responde = r;
          }),
      );
    carga(pedir);
    await vi.waitFor(() => expect(pedir).toHaveBeenCalledTimes(1));

    pideOtraVez({ revalidate: () => {} });
    const cargas = [carga(pedir), carga(pedir), carga(pedir)];
    await new Promise((r) => setTimeout(r, 0));
    expect(pedir).toHaveBeenCalledTimes(2);
    responde([{ id: 'c-1' }]);

    // Todas con la nueva, ninguna con la vieja que no contesta
    for (const una of await Promise.all(cargas))
      expect(una).toEqual({
        estado: 'ok',
        datos: [{ id: 'c-1' }],
        usuarioId: 'u-1',
      });
    olvidaQueSeVuelveAPedir();
  });

  it('C8d: la carga que vio la marca pide nueva aunque se olvide mientras pregunta por la sesión', async () => {
    const pedir = vi
      .fn()
      .mockReturnValueOnce(new Promise(() => {}))
      .mockResolvedValue([{ id: 'c-1' }]);
    carga(pedir);
    await vi.waitFor(() => expect(pedir).toHaveBeenCalledTimes(1));

    pideOtraVez({ revalidate: () => {} });
    const nueva = carga(pedir);
    olvidaQueSeVuelveAPedir();

    expect(await nueva).toEqual({
      estado: 'ok',
      datos: [{ id: 'c-1' }],
      usuarioId: 'u-1',
    });
    expect(pedir).toHaveBeenCalledTimes(2);
  });
});
